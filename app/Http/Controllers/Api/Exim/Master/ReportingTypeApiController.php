<?php

namespace App\Http\Controllers\Api\Exim\Master;

use App\Http\Controllers\Controller;
use App\Models\Master\Organization\ReportingType;
use Illuminate\Http\JsonResponse;

class ReportingTypeApiController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => ReportingType::orderBy('name')->get(['id', 'name', 'status']),
        ]);
    }
}
