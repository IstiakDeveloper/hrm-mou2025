<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Http\Controllers\Admin\AttendanceDataUpdateController;
use Carbon\Carbon;

class UpdateAttendanceDataCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'attendance:update-data
                            {--start-date=2025-05-01 : Start date (Y-m-d format)}
                            {--end-date=2025-07-31 : End date (Y-m-d format)}
                            {--office-start=09:00 : Office start time (H:i format)}
                            {--office-end=19:00 : Office end time (H:i format)}
                            {--branch= : Specific branch ID (optional)}
                            {--weekend=5 : Weekend days (0=Sunday, 1=Monday, ... 6=Saturday). Default: 5=Friday only}
                            {--debug-date= : Debug specific date (Y-m-d format)}
                            {--update-date= : Update specific date only (Y-m-d format)}
                            {--dry-run : Show what would be updated without making changes}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Update attendance data for absent employees and missing check-in/check-out records. Skips weekends, holidays, leave, and movement days.';

    protected $controller;

    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct()
    {
        parent::__construct();
        $this->controller = new AttendanceDataUpdateController();
    }

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        // Check if debug mode
        if ($this->option('debug-date')) {
            $debugDate = $this->option('debug-date');
            $this->info("Running debug for date: {$debugDate}");
            $this->controller->debugAttendanceData($debugDate);
            $this->info("Debug completed. Check storage/logs/laravel.log for details.");
            return 0;
        }

        // Check if update specific date mode
        if ($this->option('update-date')) {
            $updateDate = $this->option('update-date');
            $this->info("Updating specific date: {$updateDate}");

            $result = $this->controller->updateSpecificDate($updateDate);

            if ($result['status']) {
                $this->info($result['message']);

                if (isset($result['summary'])) {
                    $summary = $result['summary'];
                    $this->table(
                        ['Metric', 'Count'],
                        [
                            ['Total Employees', $summary['total_employees']],
                            ['Absent Updated', $summary['absent_updated']],
                            ['Missing Check-in Updated', $summary['missing_checkin_updated']],
                            ['Missing Check-out Updated', $summary['missing_checkout_updated']],
                            ['Status Updated', $summary['status_updated']],
                            ['Skipped (Leave)', $summary['skipped_leave']],
                            ['Skipped (Movement)', $summary['skipped_movement']],
                            ['Errors', $summary['errors']]
                        ]
                    );
                }
                return 0;
            } else {
                $this->error($result['message']);
                return 1;
            }
        }

        $startDate = $this->option('start-date');
        $endDate = $this->option('end-date');
        $officeStart = $this->option('office-start');
        $officeEnd = $this->option('office-end');
        $branchId = $this->option('branch');
        $isDryRun = $this->option('dry-run');

        // Validate dates
        try {
            $startDateCarbon = Carbon::parse($startDate);
            $endDateCarbon = Carbon::parse($endDate);
        } catch (\Exception $e) {
            $this->error('Invalid date format. Please use Y-m-d format (e.g., 2025-05-01)');
            return 1;
        }

        if ($startDateCarbon->gt($endDateCarbon)) {
            $this->error('Start date must be before or equal to end date.');
            return 1;
        }

        // Validate time format
        try {
            Carbon::createFromTimeString($officeStart);
            Carbon::createFromTimeString($officeEnd);
        } catch (\Exception $e) {
            $this->error('Invalid time format. Please use H:i format (e.g., 09:00)');
            return 1;
        }

        // Show confirmation
        $this->info('Attendance Data Update Configuration:');
        $this->table(
            ['Setting', 'Value'],
            [
                ['Start Date', $startDate],
                ['End Date', $endDate],
                ['Office Start Time', $officeStart],
                ['Office End Time', $officeEnd],
                ['Branch ID', $branchId ?: 'All Branches'],
                ['Dry Run', $isDryRun ? 'Yes' : 'No']
            ]
        );

        if (!$isDryRun && !$this->confirm('Do you want to proceed with the attendance data update?')) {
            $this->info('Operation cancelled.');
            return 0;
        }

        $this->info('Starting attendance data update...');

        try {
            // Create progress bar
            $progressBar = $this->output->createProgressBar();
            $progressBar->setFormat(' %current%/%max% [%bar%] %percent:3s%% %elapsed:6s%/%estimated:-6s% %memory:6s%');

            // Start processing
            $result = $this->controller->bulkUpdateAttendanceData(
                $startDateCarbon,
                $endDateCarbon,
                $officeStart,
                $officeEnd,
                $branchId
            );

            $progressBar->finish();
            $this->newLine(2);

            if ($result['status']) {
                $this->info($result['message']);

                // Display summary table
                if (isset($result['summary'])) {
                    $summary = $result['summary'];
                    $this->info('Update Summary:');
                    $this->table(
                        ['Metric', 'Count'],
                        [
                            ['Total Days Processed', $summary['total_days']],
                            ['Total Employees', $summary['total_employees']],
                            ['Absent Records Updated', $summary['absent_updated']],
                            ['Missing Check-in Updated', $summary['missing_checkin_updated']],
                            ['Missing Check-out Updated', $summary['missing_checkout_updated']],
                            ['Status Updated', $summary['status_updated']],
                            ['Skipped (Leave)', $summary['skipped_leave']],
                            ['Skipped (Holiday)', $summary['skipped_holiday']],
                            ['Skipped (Weekend)', $summary['skipped_weekend']],
                            ['Skipped (Movement)', $summary['skipped_movement']],
                            ['Errors', $summary['errors']]
                        ]
                    );
                }

                return 0;
            } else {
                $this->error('Failed to update attendance data.');
                return 1;
            }
        } catch (\Exception $e) {
            $this->error('An error occurred: ' . $e->getMessage());
            return 1;
        }
    }
}
