<?php

namespace App\Http\Controllers\Organization;

use App\Http\Controllers\Controller;
use App\Support\OfficeMapLocations;
use Inertia\Inertia;
use Inertia\Response;

class OfficeMapController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('office-map/index', OfficeMapLocations::payload());
    }
}
