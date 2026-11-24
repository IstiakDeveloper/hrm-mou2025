<?php

namespace App\Services;

use App\Http\Controllers\API\OrganizationSyncAPIController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class MisLoanOrganizationSyncService
{
    public function isConfigured(): bool
    {
        $url = rtrim((string) config('services.misloan.url'), '/');
        $token = (string) config('services.misloan.token');

        return $url !== '' && $token !== '';
    }

    /**
     * Push full organization hierarchy to MisLoan.
     * Can be called whenever a Branch, RegionalOffice, or Zone is created, updated, or transferred.
     *
     * @return array{success: bool, message: string, data?: mixed}
     */
    public function pushOrganization(string $trigger = 'manual'): array
    {
        if (! $this->isConfigured()) {
            return [
                'success' => false,
                'message' => 'MisLoan sync is not configured.',
            ];
        }

        try {
            // Generate full organization payload via OrganizationSyncAPIController
            $controller = app(OrganizationSyncAPIController::class);
            $fakeRequest = Request::create('/api/sync/organization-structure', 'GET');
            $fakeRequest->headers->set('Authorization', 'Bearer ' . config('app.sync_api_key'));

            $response = $controller->organizationStructure($fakeRequest);
            $payload = json_decode($response->getContent(), true);

            if (! is_array($payload) || ! ($payload['status'] ?? false)) {
                return [
                    'success' => false,
                    'message' => 'Failed to generate organization payload in HRM.',
                ];
            }

            $payload['trigger'] = $trigger;

            $baseUrl = rtrim((string) config('services.misloan.url'), '/');
            $token = (string) config('services.misloan.token');

            $candidateUrls = array_values(array_unique(array_filter([
                $baseUrl,
                str_contains($baseUrl, ':8000') ? str_replace(':8000', ':8001', $baseUrl) : null,
                str_contains($baseUrl, ':8001') ? str_replace(':8001', ':8000', $baseUrl) : null,
            ])));

            $httpResponse = null;
            foreach ($candidateUrls as $url) {
                try {
                    $res = Http::timeout(5)
                        ->acceptJson()
                        ->withToken($token)
                        ->post("{$url}/hrm/sync/organization", $payload);

                    if ($res->successful()) {
                        $httpResponse = $res;
                        break;
                    }
                } catch (Throwable) {
                    // Try next candidate url
                }
            }

            if ($httpResponse && $httpResponse->successful()) {
                Log::info('MisLoan organization sync push successful', [
                    'trigger' => $trigger,
                    'response' => $httpResponse->json(),
                ]);

                return [
                    'success' => true,
                    'message' => 'MisLoan organization sync successful.',
                    'data' => $httpResponse->json(),
                ];
            }

            Log::warning('MisLoan organization sync push failed', [
                'trigger' => $trigger,
                'status' => $httpResponse?->status() ?? 0,
                'body' => $httpResponse?->body() ?? 'Connection failed',
            ]);

            return [
                'success' => false,
                'message' => 'MisLoan responded with status ' . ($httpResponse?->status() ?? 0) . ': ' . ($httpResponse?->body() ?? 'Connection failed'),
            ];
        } catch (Throwable $e) {
            Log::error('MisLoan organization sync push exception', [
                'trigger' => $trigger,
                'message' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'message' => 'Exception during MisLoan sync: ' . $e->getMessage(),
            ];
        }
    }
}
