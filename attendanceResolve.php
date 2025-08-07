<?php

use Carbon\Carbon;

$emp = 1; // employee ID change করুন
for($d=Carbon::parse('2025-05-01'); $d<=Carbon::parse('2025-07-31'); $d->addDay()) { $date=$d->format('Y-m-d'); if(!DB::table('attendances')->where('employee_id',$emp)->where('date',$date)->exists()) { $s=collect(['present','present','late','absent'])->random(); DB::table('attendances')->insert(['employee_id'=>$emp,'date'=>$date,'status'=>$s,'check_in'=>$s=='absent'?null:'09:00:00','check_out'=>$s=='absent'?null:'19:30:00','created_at'=>now(),'updated_at'=>now()]); }}
