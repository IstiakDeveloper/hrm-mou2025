<?php

namespace App\Http\Controllers\ZKTeco;

use App\Http\Controllers\Controller;
use App\Models\AttendanceDevice;
use App\Services\ZktecoAttendanceIngestService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class IclockController extends Controller
{
    public function __construct(
        private readonly ZktecoAttendanceIngestService $ingest
    ) {}

    /**
     * ZKTeco ADMS handshake + attendance push (GET/POST /iclock/cdata).
     */
    public function cdata(Request $request): Response
    {
        $sn = $this->serialFromRequest($request);

        Log::info('ADMS cdata', [
            'ip' => $request->ip(),
            'method' => $request->method(),
            'sn' => $sn,
            'query' => $request->query(),
            'bytes' => strlen((string) $request->getContent()),
        ]);

        if ($sn === '') {
            return $this->plain('OK');
        }

        $device = $this->resolveDevice($sn, $request);
        $this->touchAdms($device);

        $options = strtolower((string) $request->query('options', ''));
        if ($options === 'all') {
            return $this->plain($this->handshakeBody($sn, $device));
        }

        $table = strtoupper((string) $request->query('table', ''));

        if ($request->isMethod('post') && ($table === 'ATTLOG' || $table === '')) {
            return $this->handleAttLog($request, $device, $sn);
        }

        // OPERLOG / ATTPHOTO / other tables: acknowledge so the device does not retry.
        return $this->plain('OK');
    }

    public function getRequest(Request $request): Response
    {
        $sn = $this->serialFromRequest($request);
        $device = $sn !== '' ? $this->resolveDevice($sn, $request) : null;
        $this->touchAdms($device);

        Log::debug('ADMS getrequest', [
            'sn' => $sn,
            'info' => $request->query('INFO'),
        ]);

        if ($device) {
            $command = $device->pullPendingAdmsCommand();
            if ($command) {
                Log::info('ADMS command sent', [
                    'sn' => $sn,
                    'command' => $command,
                ]);

                return $this->plain($command);
            }
        }

        return $this->plain('OK');
    }

    public function deviceCmd(Request $request): Response
    {
        $sn = $this->serialFromRequest($request);
        $device = $sn !== '' ? $this->resolveDevice($sn, $request) : null;

        $id = (string) ($request->input('ID', $request->query('ID', '')));
        $return = (string) ($request->input('Return', $request->query('Return', '')));
        $cmd = (string) ($request->input('CMD', $request->query('CMD', '')));

        if ($id === '' && $request->getContent() !== '') {
            parse_str((string) $request->getContent(), $parsed);
            $id = (string) ($parsed['ID'] ?? $id);
            $return = (string) ($parsed['Return'] ?? $return);
            $cmd = (string) ($parsed['CMD'] ?? $cmd);
        }

        Log::info('ADMS deviceCmd', [
            'sn' => $sn,
            'id' => $id,
            'return' => $return,
            'cmd' => $cmd,
        ]);

        if ($device) {
            $device->ackAdmsCommand($id !== '' ? $id : null, $return !== '' ? $return : '0');
        }

        return $this->plain('OK');
    }

    public function ping(): Response
    {
        return $this->plain('OK');
    }

    private function handleAttLog(Request $request, ?AttendanceDevice $device, string $sn): Response
    {
        $body = (string) $request->getContent();
        $records = $this->parseAttLog($body);

        if ($records === []) {
            Log::info('ADMS ATTLOG empty or unparsed', [
                'sn' => $sn,
                'preview' => substr($body, 0, 300),
            ]);

            return $this->plain('OK');
        }

        if (! $device || ! $device->acceptsAdms()) {
            Log::warning('ADMS ATTLOG ignored: device missing or live ADMS off', [
                'sn' => $sn,
                'device_id' => $device?->id,
                'count' => count($records),
            ]);

            return $this->plain('OK');
        }

        $stamp = (string) $request->query('Stamp', '');
        if ($stamp !== '') {
            $device->adms_attlog_stamp = $stamp;
        }

        $summary = $this->ingest->ingestRecords($device, $records, null, false);

        Log::info('ADMS ATTLOG ingested', [
            'sn' => $sn,
            'device' => $device->name,
            'summary' => $summary,
        ]);

        return $this->plain('OK');
    }

    /**
     * @return list<array{id: string, timestamp: string}>
     */
    private function parseAttLog(string $body): array
    {
        $records = [];
        $body = trim(str_replace("\0", '', $body));

        if ($body === '') {
            return [];
        }

        foreach (preg_split('/\r\n|\r|\n/', $body) as $line) {
            $line = trim($line);
            if ($line === '') {
                continue;
            }

            $parts = preg_split("/\t+/", $line);
            if ($parts === false || count($parts) < 2) {
                $parts = preg_split('/\s+/', $line) ?: [];
            }

            if (count($parts) < 2) {
                continue;
            }

            $pin = trim((string) $parts[0]);
            $time = trim((string) $parts[1]);

            if ($pin === '' || str_starts_with(strtoupper($pin), 'OPLOG')) {
                continue;
            }

            // "PIN 2026-08-31 08:15:22 ..." when tabs were flattened to spaces.
            if (
                ! preg_match('/^\d{4}-\d{2}-\d{2}/', $time)
                && isset($parts[2])
                && preg_match('/^\d{2}:\d{2}/', (string) $parts[2])
            ) {
                $time = $parts[1].' '.$parts[2];
            }

            if ($pin === '' || $time === '') {
                continue;
            }

            $records[] = [
                'id' => $pin,
                'timestamp' => $time,
            ];
        }

        return $records;
    }

    private function handshakeBody(string $sn, ?AttendanceDevice $device): string
    {
        $stamp = $device?->adms_attlog_stamp ?: 'None';
        $keepDays = $device?->attlogKeepDays() ?? 7;

        return implode("\n", [
            'GET OPTION FROM: '.$sn,
            'ATTLOGStamp='.$stamp,
            'OPERLOGStamp=None',
            'ATTPHOTOStamp=None',
            'ErrorDelay=30',
            'Delay=10',
            'TransTimes=00:00;14:00',
            'TransInterval=1',
            'TransFlag=TransData AttLog OpLog AttPhoto EnrollUser ChgUser EnrollFP ChgFP UserPic',
            'ResLogDay='.$keepDays,
            'TimeZone=6',
            'Realtime=1',
            'Encrypt=None',
        ])."\n";
    }

    private function resolveDevice(string $sn, Request $request): ?AttendanceDevice
    {
        if (! Schema::hasColumn('attendance_devices', 'serial_number')) {
            Log::warning('ADMS: serial_number column missing — run php artisan migrate');

            return null;
        }

        $device = AttendanceDevice::query()
            ->where('serial_number', $sn)
            ->first();

        if ($device) {
            return $device;
        }

        $unboundQuery = AttendanceDevice::query()
            ->where('status', 'active')
            ->where(function ($q) {
                $q->whereNull('serial_number')->orWhere('serial_number', '');
            });

        if (Schema::hasColumn('attendance_devices', 'adms_enabled')) {
            $unboundQuery->where('adms_enabled', true);
        }

        $unbound = $unboundQuery->get();

        if ($unbound->count() === 1) {
            $device = $unbound->first();
            $device->serial_number = $sn;
            $device->save();

            Log::info('ADMS bound serial to device', [
                'sn' => $sn,
                'device_id' => $device->id,
                'name' => $device->name,
            ]);

            return $device;
        }

        $active = AttendanceDevice::query()->where('status', 'active')->get();
        if ($unbound->count() === 0 && $active->count() === 1 && blank($active->first()?->serial_number)) {
            $device = $active->first();
            $device->serial_number = $sn;
            if (Schema::hasColumn('attendance_devices', 'adms_enabled')) {
                $device->adms_enabled = true;
            }
            $device->save();

            Log::info('ADMS bound serial to the only active device', [
                'sn' => $sn,
                'device_id' => $device->id,
            ]);

            return $device;
        }

        Log::warning('ADMS unknown serial', [
            'sn' => $sn,
            'ip' => $request->ip(),
        ]);

        return null;
    }

    private function serialFromRequest(Request $request): string
    {
        return strtoupper(trim((string) ($request->query('SN', $request->input('SN', '')))));
    }

    private function touchAdms(?AttendanceDevice $device): void
    {
        if (! $device || ! Schema::hasColumn('attendance_devices', 'last_adms_at')) {
            return;
        }

        $device->last_adms_at = now();
        $device->save();
    }

    private function plain(string $body): Response
    {
        return response($body, 200, [
            'Content-Type' => 'text/plain',
        ]);
    }
}
