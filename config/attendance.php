<?php

return [

    /*
    | Employee PIN or employee ID. Comma-separated for more than one.
    | Each working day gets a check-in and check-out inside the office window.
    */
    'auto_employee_pins' => array_values(array_filter(array_map(
        static fn (string $pin): string => trim($pin),
        explode(',', (string) env('AUTO_ATTENDANCE_EMPLOYEE_PIN', ''))
    ))),

    'auto_window_minutes' => 30,

];
