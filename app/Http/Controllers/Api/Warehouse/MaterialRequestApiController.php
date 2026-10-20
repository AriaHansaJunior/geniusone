<?php

namespace App\Http\Controllers\Api\Warehouse;

use App\Http\Controllers\Controller;
use App\Models\Master\Material\Item;
use App\Models\Master\Organization\Department;
use App\Models\System\Auth\User;
use App\Models\Warehouse\Facility\Warehouse;
use App\Models\Warehouse\RequestMaterial\ApprovalRm;
use App\Models\Warehouse\RequestMaterial\DestinationLocation;
use App\Models\Warehouse\RequestMaterial\RequestMaterial;
use App\Models\Warehouse\RequestMaterial\RequestMaterialItem;
use App\Models\Warehouse\RequestMaterial\TypeOfRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;

class MaterialRequestApiController extends Controller
{
    private string $storagePath;

    public function __construct()
    {
        $this->storagePath = storage_path('app/data/material_requests.json');
    }

    /**
     * Get list of Material Requests from database with file fallback.
     */
    public function index(Request $request): JsonResponse
    {
        if (Schema::hasTable('request_material')) {
            $query = RequestMaterial::query()
                ->with([
                    'department',
                    'warehouse',
                    'typeOfRequest',
                    'destinationLocation',
                    'items.item.unit',
                    'items.item.jobNumberRel',
                    'approvals',
                    'creatorUser',
                ])
                ->orderByDesc('id');

            $search = strtolower(trim($request->query('search', '')));
            if (!empty($search)) {
                $query->where(function ($q) use ($search) {
                    $q->where('request_number', 'like', "%{$search}%")
                      ->orWhere('note', 'like', "%{$search}%");
                });
            }

            $department = $request->query('department');
            if (!empty($department) && $department !== 'All Departments') {
                $query->whereHas('department', fn($q) => $q->where('name', $department));
            }

            $approval = $request->query('approval');
            if (!empty($approval) && $approval !== 'All') {
                $query->where('status', $approval);
            }

            $records = $query->get();

            // If table has records, format and return them
            if ($records->isNotEmpty()) {
                $formatted = $records->map(function ($r, $idx) {
                    return $this->formatDatabaseRecord($r, $idx + 1);
                });

                return response()->json([
                    'status' => 'success',
                    'data' => $formatted,
                    'meta' => [
                        'total' => $formatted->count(),
                    ],
                ]);
            }
        }

        // Graceful fallback to file repository
        $records = $this->loadRecords();

        $search = strtolower(trim($request->query('search', '')));
        $department = $request->query('department');
        $approval = $request->query('approval');

        if (!empty($search)) {
            $records = array_filter($records, function ($r) use ($search) {
                return str_contains(strtolower($r['requestCode'] ?? ''), $search)
                    || str_contains(strtolower($r['customer'] ?? ''), $search)
                    || str_contains(strtolower($r['jobNumber'] ?? ''), $search)
                    || str_contains(strtolower($r['department'] ?? ''), $search);
            });
        }

        if (!empty($department) && $department !== 'All Departments') {
            $records = array_filter($records, fn($r) => ($r['department'] ?? '') === $department);
        }

        if (!empty($approval) && $approval !== 'All') {
            $records = array_filter($records, fn($r) => ($r['approval'] ?? '') === $approval);
        }

        return response()->json([
            'status' => 'success',
            'data' => array_values($records),
            'meta' => [
                'total' => count($records),
            ],
        ]);
    }

    /**
     * Store new Material Request record into database.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'requestDate' => 'nullable|string',
            'destinationLocation' => 'nullable|string',
            'department' => 'nullable|string',
            'typeOfRequest' => 'nullable|string',
            'jobNumber' => 'nullable|string',
            'customer' => 'nullable|string',
            'requestNote' => 'nullable|string',
            'items' => 'required|array|min:1',
        ]);

        if (Schema::hasTable('request_material')) {
            DB::beginTransaction();
            try {
                $seq = RequestMaterial::count() + 1;
                $requestCode = 'REQ-WH-' . date('Y') . '-' . str_pad($seq, 3, '0', STR_PAD_LEFT);

                // Resolve relations
                $dept = Department::where('name', $validated['department'] ?? '')->first() ?? Department::first();
                $type = TypeOfRequest::where('name', $validated['typeOfRequest'] ?? '')->first() ?? TypeOfRequest::first();
                $dest = DestinationLocation::where('name', $validated['destinationLocation'] ?? '')->first() ?? DestinationLocation::first();
                $wh = Warehouse::first();
                $creator = User::first();

                $requestDate = !empty($validated['requestDate']) ? $validated['requestDate'] : date('Y-m-d H:i:s');

                $reqMaterial = RequestMaterial::create([
                    'request_number' => $requestCode,
                    'departments_id' => $dept?->id ?? 1,
                    'warehouses_id' => $wh?->id,
                    'type_of_request_id' => $type?->id ?? 1,
                    'destination_location_id' => $dest?->id,
                    'creator' => $creator?->id ?? 1,
                    'updated_by' => $creator?->id ?? 1,
                    'request_date' => $requestDate,
                    'note' => $validated['requestNote'] ?? '',
                    'revision' => 0,
                    'status' => 'Draft',
                ]);

                $itemsInput = $request->input('items', []);
                $savedItems = [];

                foreach ($itemsInput as $idx => $it) {
                    $itemCode = $it['itemCode'] ?? $it['item_code'] ?? '';
                    $item = null;
                    if (!empty($itemCode)) {
                        $item = Item::where('code', $itemCode)->first();
                    }
                    if (!$item) {
                        $item = Item::skip($idx % max(1, Item::count()))->first() ?? Item::first();
                    }

                    if ($item) {
                        RequestMaterialItem::updateOrCreate(
                            [
                                'items_id' => $item->id,
                                'request_material_id' => $reqMaterial->id,
                            ],
                            [
                                'request' => (float) ($it['requestQty'] ?? $it['request_qty'] ?? 1),
                                'remark' => $it['remark'] ?? '',
                            ]
                        );

                        $savedItems[] = [
                            'id' => "{$requestCode}-ITM-" . ($idx + 1),
                            'itemCode' => $item->code,
                            'externalCode' => $item->external_code ?? '-',
                            'itemName' => $item->name,
                            'unit' => $item->unit?->name ?? 'PCS',
                            'jobNumber' => $validated['jobNumber'] ?? 'JOB-2026-001',
                            'size' => $item->size ?: '-',
                            'stockQty' => (float) $item->stock,
                            'pendingQty' => 0.0,
                            'requestQty' => (float) ($it['requestQty'] ?? $it['request_qty'] ?? 1),
                            'remark' => $it['remark'] ?? '',
                        ];
                    }
                }

                // Initial Approval row
                ApprovalRm::create([
                    'request_material_id' => $reqMaterial->id,
                    'users_id' => $creator?->id ?? 1,
                    'approval_ke' => '1',
                    'status' => 0,
                    'note' => 'Initial requisition submitted',
                ]);

                DB::commit();

                $formatted = [
                    'id' => $requestCode,
                    'no' => $seq,
                    'requestCode' => $requestCode,
                    'requestDate' => substr($requestDate, 0, 10),
                    'destinationLocation' => $dest?->name ?? 'Cutting Department',
                    'department' => $dept?->name ?? 'Production',
                    'typeOfRequest' => $type?->name ?? 'Production Issue',
                    'jobNumber' => $validated['jobNumber'] ?? 'JOB-2026-001',
                    'customer' => $validated['customer'] ?? 'PT GLOBAL TEXTILE INDONESIA',
                    'requestNote' => $validated['requestNote'] ?? '',
                    'totalItems' => count($savedItems),
                    'approval' => 'Draft',
                    'projectType' => 'General Order',
                    'createdDate' => $reqMaterial->created_at?->toIso8601String() ?? date('Y-m-d H:i:s'),
                    'lastUpdatedDate' => $reqMaterial->updated_at?->toIso8601String() ?? date('Y-m-d H:i:s'),
                    'createdBy' => $creator?->name ?? 'Warehouse Operator',
                    'items' => $savedItems,
                ];

                return response()->json([
                    'status' => 'success',
                    'message' => 'Material request created successfully.',
                    'data' => $formatted,
                ], 201);
            } catch (\Throwable $e) {
                DB::rollBack();
            }
        }

        // Fallback to JSON file storage
        $records = $this->loadRecords();
        $seq = count($records) + 1;
        $requestCode = 'REQ-WH-' . date('Y') . '-' . str_pad($seq, 3, '0', STR_PAD_LEFT);
        $now = date('Y-m-d H:i:s');

        $items = $request->input('items', []);
        $itemsWithId = array_map(function ($it, $idx) use ($requestCode) {
            return [
                'id' => "{$requestCode}-ITM-" . ($idx + 1),
                'itemCode' => $it['itemCode'] ?? $it['item_code'] ?? "60.154.300." . str_pad($idx + 1, 3, '0', STR_PAD_LEFT),
                'externalCode' => $it['externalCode'] ?? $it['external_code'] ?? '-',
                'itemName' => $it['itemName'] ?? $it['item_name'] ?? 'Material Item ' . ($idx + 1),
                'unit' => $it['unit'] ?? 'PCS',
                'jobNumber' => $it['jobNumber'] ?? $it['job_number'] ?? '-',
                'size' => $it['size'] ?? '-',
                'stockQty' => (float) ($it['stockQty'] ?? $it['stock_qty'] ?? 100),
                'pendingQty' => (float) ($it['pendingQty'] ?? $it['pending_qty'] ?? 0),
                'requestQty' => (float) ($it['requestQty'] ?? $it['request_qty'] ?? 1),
                'remark' => $it['remark'] ?? '',
            ];
        }, $items, array_keys($items));

        $newRecord = [
            'id' => $requestCode,
            'no' => $seq,
            'requestCode' => $requestCode,
            'requestDate' => $validated['requestDate'] ?? date('Y-m-d'),
            'destinationLocation' => $validated['destinationLocation'] ?? 'Cutting Department',
            'department' => $validated['department'] ?? 'Production',
            'typeOfRequest' => $validated['typeOfRequest'] ?? 'Production Issue',
            'jobNumber' => $validated['jobNumber'] ?? 'JOB-2026-001',
            'customer' => $validated['customer'] ?? 'PT GLOBAL TEXTILE INDONESIA',
            'requestNote' => $validated['requestNote'] ?? '',
            'totalItems' => count($itemsWithId),
            'approval' => 'Draft',
            'projectType' => 'General Order',
            'createdDate' => $now,
            'lastUpdatedDate' => $now,
            'createdBy' => 'Rizky Aditya (Warehouse Operator)',
            'items' => $itemsWithId,
        ];

        array_unshift($records, $newRecord);
        $this->saveRecords($records);

        return response()->json([
            'status' => 'success',
            'message' => 'Material request created successfully.',
            'data' => $newRecord,
        ], 201);
    }

    /**
     * Show single Material Request details.
     */
    public function show(string $id): JsonResponse
    {
        if (Schema::hasTable('request_material')) {
            $r = RequestMaterial::with([
                'department',
                'warehouse',
                'typeOfRequest',
                'destinationLocation',
                'items.item.unit',
                'items.item.jobNumberRel',
                'approvals',
                'creatorUser',
            ])
            ->where('request_number', $id)
            ->orWhere('id', is_numeric($id) ? (int)$id : 0)
            ->first();

            if ($r) {
                return response()->json([
                    'status' => 'success',
                    'data' => $this->formatDatabaseRecord($r, 1),
                ]);
            }
        }

        $records = $this->loadRecords();
        foreach ($records as $rec) {
            if ($rec['id'] === $id || ($rec['requestCode'] ?? '') === $id) {
                return response()->json([
                    'status' => 'success',
                    'data' => $rec,
                ]);
            }
        }

        return response()->json([
            'status' => 'error',
            'message' => "Material request with ID '{$id}' not found.",
        ], 404);
    }

    /**
     * Approve Material Request (Draft -> Approved 1 -> Approved 2).
     */
    public function approve(string $id): JsonResponse
    {
        if (Schema::hasTable('request_material')) {
            $r = RequestMaterial::where('request_number', $id)
                ->orWhere('id', is_numeric($id) ? (int)$id : 0)
                ->first();

            if ($r) {
                if ($r->status === 'Draft') {
                    $r->status = 'Approved 1';
                } elseif ($r->status === 'Approved 1') {
                    $r->status = 'Approved 2';
                }
                $r->save();

                return response()->json([
                    'status' => 'success',
                    'message' => "Material request approved to '{$r->status}'.",
                    'data' => $this->formatDatabaseRecord($r->fresh(), 1),
                ]);
            }
        }

        $records = $this->loadRecords();
        $found = false;
        $updated = null;

        foreach ($records as &$rec) {
            if ($rec['id'] === $id || ($rec['requestCode'] ?? '') === $id) {
                if ($rec['approval'] === 'Draft') {
                    $rec['approval'] = 'Approved 1';
                    $rec['approved1At'] = date('Y-m-d H:i:s');
                } elseif ($rec['approval'] === 'Approved 1') {
                    $rec['approval'] = 'Approved 2';
                    $rec['approved2At'] = date('Y-m-d H:i:s');
                }
                $rec['lastUpdatedDate'] = date('Y-m-d H:i:s');
                $updated = $rec;
                $found = true;
                break;
            }
        }

        if (!$found) {
            return response()->json([
                'status' => 'error',
                'message' => 'Record not found to approve.',
            ], 404);
        }

        $this->saveRecords($records);

        return response()->json([
            'status' => 'success',
            'message' => "Material request approved to '{$updated['approval']}'.",
            'data' => $updated,
        ]);
    }

    /**
     * Format Eloquent database record into the standardized frontend DTO.
     */
    private function formatDatabaseRecord(RequestMaterial $r, int $no): array
    {
        $requestCode = $r->request_number ?: 'REQ-WH-' . date('Y') . '-' . str_pad($r->id, 3, '0', STR_PAD_LEFT);

        $items = $r->items->map(function ($it, $idx) use ($requestCode) {
            $item = $it->item;
            return [
                'id' => "{$requestCode}-ITM-" . ($idx + 1),
                'itemCode' => $item?->code ?? '-',
                'externalCode' => $item?->external_code ?? '-',
                'itemName' => $item?->name ?? 'Material Item',
                'unit' => $item?->unit?->name ?? 'PCS',
                'jobNumber' => $item?->jobNumberRel?->name ?? 'JOB-2026-001',
                'size' => $item?->size ?: '-',
                'stockQty' => (float) ($item?->stock ?? 0),
                'pendingQty' => 0.0,
                'requestQty' => (float) $it->request,
                'remark' => $it->remark ?: '',
            ];
        })->values()->toArray();

        return [
            'id' => $requestCode,
            'no' => $no,
            'requestCode' => $requestCode,
            'requestDate' => substr((string)$r->request_date, 0, 10),
            'destinationLocation' => $r->destinationLocation?->name ?? 'Main Production',
            'department' => $r->department?->name ?? 'Production',
            'typeOfRequest' => $r->typeOfRequest?->name ?? 'Production Issue',
            'jobNumber' => 'JOB-2026-001',
            'customer' => 'PT GLOBAL TEXTILE INDONESIA',
            'requestNote' => $r->note ?: '',
            'totalItems' => count($items),
            'approval' => $r->status ?: 'Draft',
            'projectType' => 'General Order',
            'createdDate' => $r->created_at?->toIso8601String() ?? date('Y-m-d H:i:s'),
            'lastUpdatedDate' => $r->updated_at?->toIso8601String() ?? date('Y-m-d H:i:s'),
            'createdBy' => $r->creatorUser?->name ?? 'Warehouse Operator',
            'items' => $items,
        ];
    }

    /**
     * Load records from JSON data file or seed initial set.
     */
    private function loadRecords(): array
    {
        if (!File::exists($this->storagePath)) {
            $default = $this->getSeedRecords();
            $this->saveRecords($default);
            return $default;
        }

        $content = File::get($this->storagePath);
        $data = json_decode($content, true);

        return is_array($data) ? $data : [];
    }

    /**
     * Persist records to file storage.
     */
    private function saveRecords(array $records): void
    {
        $dir = dirname($this->storagePath);
        if (!File::isDirectory($dir)) {
            File::makeDirectory($dir, 0755, true);
        }

        File::put($this->storagePath, json_encode($records, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    }

    /**
     * Seed baseline records matching frontend sample dataset.
     */
    private function getSeedRecords(): array
    {
        return [
            [
                'id' => 'REQ-WH-2026-001',
                'no' => 1,
                'requestCode' => 'REQ-WH-2026-001',
                'requestDate' => '2026-10-18',
                'destinationLocation' => 'Production Cutting Section',
                'department' => 'Cutting Department',
                'typeOfRequest' => 'Production Issue',
                'jobNumber' => 'JOB-2026-042',
                'customer' => 'PT INDO TEXTILE APPAREL',
                'requestNote' => 'Urgent requisition for PO #PO-2026-0012 batch cutting.',
                'totalItems' => 2,
                'approval' => 'Approved 2',
                'projectType' => 'Apparel Export',
                'createdDate' => '2026-10-18 08:30:00',
                'lastUpdatedDate' => '2026-10-18 11:20:00',
                'createdBy' => 'Rizky Aditya (Warehouse Supervisor)',
                'items' => [
                    [
                        'id' => 'REQ-WH-2026-001-ITM-1',
                        'itemCode' => '60.154.300.101',
                        'externalCode' => 'FAB-CTN-WHT',
                        'itemName' => '100% Cotton 30s Fabric Bleached White',
                        'unit' => 'KG',
                        'jobNumber' => 'JOB-2026-042',
                        'size' => 'Roll 42 Inch',
                        'stockQty' => 850.0,
                        'pendingQty' => 50.0,
                        'requestQty' => 200.0,
                        'remark' => 'Deliver to Bay 3',
                    ],
                    [
                        'id' => 'REQ-WH-2026-001-ITM-2',
                        'itemCode' => '60.154.300.102',
                        'externalCode' => 'THRD-POLY-40',
                        'itemName' => 'Polyester Sewing Thread 40/2 White',
                        'unit' => 'CONE',
                        'jobNumber' => 'JOB-2026-042',
                        'size' => '5000M',
                        'stockQty' => 120.0,
                        'pendingQty' => 0.0,
                        'requestQty' => 24.0,
                        'remark' => 'Lot 2026-B',
                    ],
                ],
            ],
            [
                'id' => 'REQ-WH-2026-002',
                'no' => 2,
                'requestCode' => 'REQ-WH-2026-002',
                'requestDate' => '2026-10-19',
                'destinationLocation' => 'Finishing Line 2',
                'department' => 'Packing & Finishing',
                'typeOfRequest' => 'Packing Accessories Issue',
                'jobNumber' => 'JOB-2026-048',
                'customer' => 'PT PACIFIC GARMENT MEGAH',
                'requestNote' => 'Polybags and hangtags for final carton packing.',
                'totalItems' => 1,
                'approval' => 'Approved 1',
                'projectType' => 'Local Distribution',
                'createdDate' => '2026-10-19 09:15:00',
                'lastUpdatedDate' => '2026-10-19 10:00:00',
                'createdBy' => 'Budi Santoso',
                'items' => [
                    [
                        'id' => 'REQ-WH-2026-002-ITM-1',
                        'itemCode' => '60.154.300.201',
                        'externalCode' => 'POLY-BG-3040',
                        'itemName' => 'Clear Polybag Self Adhesive 30x40cm',
                        'unit' => 'PCS',
                        'jobNumber' => 'JOB-2026-048',
                        'size' => '30x40',
                        'stockQty' => 5000.0,
                        'pendingQty' => 0.0,
                        'requestQty' => 1200.0,
                        'remark' => 'Inspect seal quality',
                    ],
                ],
            ],
        ];
    }
}
