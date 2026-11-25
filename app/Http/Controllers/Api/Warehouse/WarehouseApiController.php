<?php

namespace App\Http\Controllers\Api\Warehouse;

use App\Http\Controllers\Api\Common\SystemContextApiController;
use App\Http\Controllers\Controller;
use App\Models\Master\Material\Item;
use App\Models\Master\Organization\JobNumber;
use App\Models\Master\Partner\Supplier;
use App\Models\Procurement\PurchaseOrder\PurchaseOrder;
use App\Models\Procurement\PurchaseOrder\PurchaseOrderItem;
use App\Models\Warehouse\Facility\Warehouse;
use App\Models\Warehouse\Facility\WarehouseCoordinate;
use App\Models\Warehouse\GateReceiving\PurchaseOrderReceiveNote;
use App\Models\Warehouse\GateReceiving\ReceiveNote;
use App\Models\Warehouse\InboundStorage\BpbReceiveMaterial;
use App\Services\GeniusOneBackend;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class WarehouseApiController extends Controller
{
    /**
     * List Warehouse BPB Receive Materials.
     */
    public function index(Request $request)
    {
        $query = BpbReceiveMaterial::with([
            'creator',
            'approvals.user',
            'mappings.warehouse',
            'mappings.coordinate',
            'mappings.purchaseOrderReceiveNote.purchaseOrder.supplier',
            'mappings.purchaseOrderReceiveNote.purchaseOrder.valuta',
            'mappings.purchaseOrderReceiveNote.purchaseOrder.items.requisitionItem.purchaseRequisition',
            'mappings.purchaseOrderReceiveNote.purchaseOrder.items.requisitionItem.item.unitOfMeasurement',
            'mappings.purchaseOrderReceiveNote.purchaseOrder.items.directItem.unitOfMeasurement',
            'mappings.purchaseOrderReceiveNote.receiveNote.supplier',
            'mappings.purchaseOrderReceiveNote.receiveNote.currency',
            'mappings.purchaseOrderReceiveNote.jobNumber',
        ]);

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('bpb_number', 'like', "%{$s}%")
                    ->orWhere('note', 'like', "%{$s}%")
                    ->orWhereHas('mappings.purchaseOrderReceiveNote.purchaseOrder.supplier', fn ($sq) => $sq->where('name', 'like', "%{$s}%"))
                    ->orWhereHas('mappings.purchaseOrderReceiveNote.receiveNote', fn ($rq) => $rq->where('rn_number', 'like', "%{$s}%"));
            });
        }

        // Calculate KPI Stats Cards in bounded chunks across filtered records
        $totalCount = (clone $query)->count();
        $readyCount = (clone $query)->where('status', '!=', 'Approved')->count();
        $totalQty = 0.0;
        $supplierIds = collect();
        (clone $query)->orderBy('id', 'desc')->chunk(200, function ($chunk) use (&$totalQty, &$supplierIds) {
            foreach ($chunk as $bpb) {
                foreach ($bpb->mappings as $map) {
                    $poRn = $map->purchaseOrderReceiveNote;
                    $totalQty += (float) (($poRn?->quantity ?? 0) - ($poRn?->rafaksi ?? 0));
                    $supId = $poRn?->purchaseOrder?->supliers_id ?? $poRn?->receiveNote?->supliers_id;
                    if ($supId) {
                        $supplierIds->push($supId);
                    }
                }
            }
        });
        $suppliersCount = $supplierIds->unique()->count();

        $stats = [
            ['Receive documents', (string) $totalCount, 'Warehouse inbound receipts'],
            ['Approval status', "{$readyCount} Pending", 'Awaiting verification'],
            ['Total received items', number_format($totalQty, 2), 'Across all BPB receipts'],
            ['Registered suppliers', (string) $suppliersCount, 'Supplying incoming materials'],
        ];

        $perPage = min(max((int) $request->query('per_page', 100), 1), 500);
        $paginated = $query->orderBy('id', 'desc')->paginate($perPage);
        $offset = ($paginated->currentPage() - 1) * $paginated->perPage();

        // Format rows for Frontend Table
        $rows = $paginated->getCollection()->values()->map(function ($bpb, $idx) use ($offset) {
            return $this->formatWarehouseRow($bpb, $offset + $idx + 1);
        })->toArray();

        $meta = [
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
            'per_page' => $paginated->perPage(),
            'total' => $paginated->total(),
        ];

        if ($request->expectsJson() || $request->is('api/*') || $request->query('format') === 'json') {
            return response()->json([
                'status' => 'success',
                'stats' => $stats,
                'rows' => $rows,
                'meta' => $meta,
            ]);
        }

        return view('app', auth()->check() ? [
            'page' => 'warehouse',
            'initialData' => ['stats' => $stats, 'rows' => $rows],
        ] : [
            'page' => 'warehouse',
        ]);
    }

    public function availableSources()
    {
        // 1. Approved Receive Notes not yet processed into an active BPB
        $processedRnIds = DB::table('po_rn_to_bpb as pb')
            ->join('bpb_receive_material as bpb', 'pb.bpb_receive_material_id', '=', 'bpb.id')
            ->join('purchase_order_has_receive_note as porn', 'pb.po_has_rn_id', '=', 'porn.id')
            ->where('bpb.status', '!=', 'Rejected')
            ->whereNull('bpb.deleted_at')
            ->whereNull('pb.deleted_at')
            ->whereNotNull('porn.receive_note_id')
            ->pluck('porn.receive_note_id')
            ->unique()
            ->toArray();

        $rns = ReceiveNote::with([
            'supplier',
            'currency',
            'purchaseOrders.purchaseOrder.valuta',
            'purchaseOrders.poItem.requisitionItem.item.unitOfMeasurement',
            'purchaseOrders.poItem.directItem.unitOfMeasurement',
            'purchaseOrders.jobNumber',
        ])
            ->where('status', 'Approved')
            ->whereNotIn('id', $processedRnIds)
            ->orderByDesc('id')
            ->get()
            ->map(function (ReceiveNote $rn) {
                $items = $rn->purchaseOrders->map(function (PurchaseOrderReceiveNote $line) use ($rn) {
                    $masterItem = $line->poItem?->item
                        ?? Item::with('unitOfMeasurement')->where('name', $line->item_name)->first();

                    return [
                        'po_has_rn_id' => $line->id,
                        'po_has_items_id' => $line->po_has_items_id,
                        'purchase_order_id' => $line->purchase_order_id,
                        'po_number' => $line->purchaseOrder?->po_number,
                        'rn_number' => $rn->rn_number,
                        'dn_number' => $line->dn_number ?? $rn->sj_number,
                        'item_id' => $masterItem?->id,
                        'item_code' => $masterItem?->code,
                        'item_name' => $line->item_name ?: $masterItem?->name,
                        'unit' => $masterItem?->unitOfMeasurement?->code ?? $masterItem?->unitOfMeasurement?->name,
                        'quantity' => (float) $line->quantity,
                        'rafaksi' => (float) $line->rafaksi,
                        'remaining_qty' => max(0.0, (float) $line->quantity - (float) $line->rafaksi),
                        'price' => (float) ($line->price ?: ($line->poItem?->price ?? 0)),
                        'job_number_id' => $line->job_number_id,
                        'job_number' => $line->jobNumber?->code,
                    ];
                })->values();

                return [
                    'source_type' => 'RN',
                    'id' => $rn->id,
                    'document_number' => $rn->rn_number,
                    'date' => $rn->arrival_date ? date('Y-m-d', strtotime($rn->arrival_date)) : null,
                    'supplier_id' => $rn->supliers_id,
                    'supplier_name' => $rn->supplier?->name,
                    'sj_number' => $rn->sj_number,
                    'license_plate' => $rn->license_plate,
                    'facility' => $rn->facility ?: ((int) $rn->dn_status === 1 ? 'FASILITAS' : 'NON FASILITAS'),
                    'bc_code' => $rn->bc_code,
                    'currency' => $rn->currency?->code ?? $rn->currency?->name,
                    'items' => $items,
                ];
            })
            ->values();

        // 2. Approved Non-Kawasan Berikat POs with remaining receivable quantity
        $receivedByPoItem = DB::table('purchase_order_has_receive_note as porn')
            ->join('po_rn_to_bpb as pb', 'pb.po_has_rn_id', '=', 'porn.id')
            ->join('bpb_receive_material as bpb', 'pb.bpb_receive_material_id', '=', 'bpb.id')
            ->where('bpb.status', '!=', 'Rejected')
            ->whereNull('porn.deleted_at')
            ->whereNull('pb.deleted_at')
            ->whereNull('bpb.deleted_at')
            ->selectRaw('porn.po_has_items_id, SUM(CASE WHEN (porn.quantity - COALESCE(porn.rafaksi, 0)) > 0 THEN (porn.quantity - COALESCE(porn.rafaksi, 0)) ELSE 0 END) as received_qty')
            ->groupBy('porn.po_has_items_id')
            ->pluck('received_qty', 'po_has_items_id');

        $pos = PurchaseOrder::with([
            'supplier',
            'valuta',
            'items.requisitionItem.item.unitOfMeasurement',
            'items.requisitionItem.jobNumber',
            'items.directItem.unitOfMeasurement',
        ])
            ->whereIn('status', ['Approved', 'Approved 2'])
            ->orderByDesc('id')
            ->get()
            ->filter(fn (PurchaseOrder $po) => ! $po->isKawasanBerikat())
            ->map(function (PurchaseOrder $po) use ($receivedByPoItem) {
                $items = [];
                foreach ($po->items as $poItem) {
                    $ordered = (float) $poItem->order;
                    $alreadyReceived = (float) ($receivedByPoItem[$poItem->id] ?? 0);
                    $remaining = max(0.0, $ordered - $alreadyReceived);
                    if ($remaining <= 0) {
                        continue;
                    }

                    $masterItem = $poItem->item;
                    $items[] = [
                        'po_has_items_id' => $poItem->id,
                        'purchase_order_id' => $po->id,
                        'po_number' => $po->po_number,
                        'item_id' => $masterItem?->id ?? $poItem->items_id,
                        'item_code' => $masterItem?->code,
                        'item_name' => $poItem->item_alias ?: $masterItem?->name,
                        'unit' => $masterItem?->unitOfMeasurement?->code ?? $masterItem?->unitOfMeasurement?->name,
                        'ordered_qty' => $ordered,
                        'received_qty' => $alreadyReceived,
                        'remaining_qty' => $remaining,
                        'price' => (float) $poItem->price,
                        'job_number_id' => $poItem->prItem?->job_number_id,
                        'job_number' => $poItem->prItem?->jobNumber?->code ?? $poItem->prItem?->job_number,
                    ];
                }

                if (empty($items)) {
                    return null;
                }

                return [
                    'source_type' => 'PO',
                    'id' => $po->id,
                    'document_number' => $po->po_number,
                    'order_category' => $po->isServiceOrder() ? 'SERVICE' : 'GOODS',
                    'is_service' => $po->isServiceOrder(),
                    'date' => $po->date ? date('Y-m-d', strtotime($po->date)) : null,
                    'supplier_id' => $po->supliers_id,
                    'supplier_name' => $po->supplier?->name,
                    'facility' => $po->facility_status ?: 'NON FASILITAS',
                    'currency' => $po->valuta?->name,
                    'items' => $items,
                ];
            })
            ->filter()
            ->values();

        return response()->json([
            'status' => 'success',
            'rn_sources' => $rns,
            'po_sources' => $pos,
        ]);
    }

    /**
     * Show single Warehouse BPB detail.
     */
    public function show(Request $request, string $code)
    {
        $rawCode = \App\Support\DocumentCodeHelper::hyphenToSlash($code);
        $cleanCode = preg_replace('/[^A-Za-z0-9]/', '', $code);

        $bpb = BpbReceiveMaterial::with([
            'creator',
            'approvals.user',
            'mappings.warehouse',
            'mappings.coordinate',
            'mappings.purchaseOrderReceiveNote.purchaseOrder.supplier',
            'mappings.purchaseOrderReceiveNote.purchaseOrder.valuta',
            'mappings.purchaseOrderReceiveNote.purchaseOrder.items.requisitionItem.purchaseRequisition',
            'mappings.purchaseOrderReceiveNote.purchaseOrder.items.requisitionItem.item.unitOfMeasurement',
            'mappings.purchaseOrderReceiveNote.purchaseOrder.items.directItem.unitOfMeasurement',
            'mappings.purchaseOrderReceiveNote.receiveNote.supplier',
            'mappings.purchaseOrderReceiveNote.receiveNote.currency',
            'mappings.purchaseOrderReceiveNote.jobNumber',
        ])
            ->where('bpb_number', $rawCode)
            ->orWhere('bpb_number', $code)
            ->orWhere('id', is_numeric($code) ? (int) $code : null)
            ->orWhereRaw("REPLACE(REPLACE(bpb_number, '/', ''), '-', '') = ?", [$cleanCode])
            ->orWhereHas('mappings.purchaseOrderReceiveNote.receiveNote', function ($q) use ($rawCode, $code, $cleanCode) {
                $q->where('rn_number', $rawCode)
                    ->orWhere('rn_number', $code)
                    ->orWhereRaw("REPLACE(REPLACE(rn_number, '/', ''), '-', '') = ?", [$cleanCode]);
            })
            ->first();

        if (! $bpb) {
            if ($request->expectsJson() || $request->is('api/*') || $request->query('format') === 'json') {
                return response()->json(['status' => 'error', 'message' => 'BPB Receive Material not found: '.$code], 404);
            }

            return redirect('/warehouse/incoming/receive-material-bpb')->withErrors(['error' => 'BPB Receive Material not found']);
        }

        $detailRow = $this->formatWarehouseRow($bpb, 1);

        if ($request->expectsJson() || $request->is('api/*') || $request->query('format') === 'json') {
            return response()->json([
                'status' => 'success',
                'item' => $detailRow,
            ]);
        }

        return view('app', auth()->check() ? [
            'page' => 'warehouse-detail',
            'code' => $code,
            'initialData' => ['item' => $detailRow],
        ] : [
            'page' => 'warehouse-detail',
            'code' => $code,
        ]);
    }

    /**
     * Store a newly created Warehouse Receive Material (BPB) via Form.
     */
    public function store(Request $request)
    {
        $creatorId = $this->requireActorId($request);

        try {
            $freshBpb = GeniusOneBackend::bpb()->createBpbFromPayload([
                'bpb_number' => $request->input('bpb_number'),
                'receive_date' => $request->input('receive_date') ?? $request->input('receiveDate'),
                'po_number' => $request->input('po_number') ?? $request->input('poNumber'),
                'rn_number' => $request->input('rn_number') ?? $request->input('rnNumber'),
                'source_type' => $request->input('source_type') ?? $request->input('sourceType'),
                'bpb_type' => $request->input('bpb_type') ?? $request->input('bpbType'),
                'bpb_category' => $request->input('bpb_category') ?? $request->input('bpbCategory'),
                'is_service' => $request->has('is_service') ? $request->boolean('is_service') : false,
                'sj_number' => $request->input('sj_number') ?? $request->input('delivery_note'),
                'invoice_date' => $request->input('invoice_date') ?? $request->input('invoiceDate'),
                'invoice_number' => $request->input('invoice_number') ?? $request->input('invoiceNumber'),
                'tax_invoice' => $request->input('tax_invoice') ?? $request->input('taxInvoice'),
                'aju_number' => $request->input('aju_number') ?? $request->input('ajuNumber'),
                'no_pen' => $request->input('no_pen') ?? $request->input('noPen'),
                'plate_no' => $request->input('plate_no') ?? $request->input('plateNo') ?? $request->input('license_plate'),
                'note' => $request->input('note') ?? $request->input('remark'),
                'warehouse_input' => $request->input('warehouse_id') ?? $request->input('warehouse') ?? $request->input('location'),
                'warehouse_coordinates_id' => $request->input('warehouse_coordinates_id'),
                'coordinate' => $request->input('coordinate'),
                'items' => $request->input('items', []),
            ], $creatorId);
            SystemContextApiController::forgetContextCache();

            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'status' => 'success',
                    'message' => "BPB {$freshBpb->bpb_number} created successfully.",
                    'data' => $this->formatWarehouseRow($freshBpb),
                ], 201);
            }

            return redirect('/warehouse/incoming/receive-material-bpb/detail/'.str_replace('/', '-', $freshBpb->bpb_number));
        } catch (\Illuminate\Validation\ValidationException $e) {
            if ($request->expectsJson() || $request->is('api/*')) {
                $errors = $e->errors();
                $firstMsg = collect($errors)->flatten()->first() ?: $e->getMessage();

                return response()->json(['status' => 'error', 'message' => $firstMsg, 'errors' => $errors], 422);
            }

            return back()->withErrors($e->errors());
        } catch (InvalidArgumentException $e) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json(['status' => 'error', 'message' => $e->getMessage(), 'error' => $e->getMessage()], 422);
            }

            return back()->withErrors(['error' => $e->getMessage()]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Failed creating BPB record.', [
                'creator_id' => $creatorId,
                'error' => $e->getMessage(),
            ]);

            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Failed to create BPB record due to an unexpected server error.',
                ], 500);
            }

            return back()->withErrors(['error' => 'Failed to create BPB record.']);
        }
    }

    /**
     * Update an existing unapproved BPB Receive Material.
     */
    public function update(Request $request, int $id)
    {
        $actorId = $this->requireActorId($request);

        $bpb = BpbReceiveMaterial::with(['mappings.purchaseOrderReceiveNote', 'approvals'])->findOrFail($id);
        if (in_array($bpb->status, ['Approved', 'Approved 2'], true)) {
            return response()->json([
                'status' => 'error',
                'message' => "BPB '{$bpb->bpb_number}' is already Approved and cannot be modified.",
            ], 422);
        }

        try {
            DB::transaction(function () use ($request, $bpb, $actorId) {
                $updates = ['updated_by' => $actorId];

                if ($request->filled('receive_date') || $request->filled('receiveDate')) {
                    $rawDate = $request->input('receive_date') ?? $request->input('receiveDate');
                    $updates['receive_date'] = preg_match('/^\d{2}-\d{2}-\d{4}$/', (string) $rawDate)
                        ? Carbon::createFromFormat('d-m-Y', $rawDate)
                        : Carbon::parse($rawDate);
                }

                if ($request->has('note') || $request->has('remark')) {
                    $updates['note'] = $request->input('note') ?? $request->input('remark');
                }

                if ($request->filled('bpb_type') || $request->filled('bpbType')) {
                    $updates['bpb_type'] = $request->input('bpb_type') ?? $request->input('bpbType');
                }

                $bpb->update($updates);

                $rawItems = $request->input('items');
                if (is_array($rawItems)) {
                    foreach ($rawItems as $itemData) {
                        $mappingId = $itemData['mapping_id'] ?? $itemData['id'] ?? null;
                        $poRnId = $itemData['po_has_rn_id'] ?? null;
                        $mapping = $mappingId
                            ? $bpb->mappings()->where('id', $mappingId)->first()
                            : ($poRnId ? $bpb->mappings()->where('po_has_rn_id', $poRnId)->first() : null);

                        if (! $mapping) {
                            continue;
                        }

                        if ($bpb->isServiceBpb()) {
                            $whId = null;
                            $coord = null;
                        } else {
                            $whId = $this->resolveWarehouseId(
                                $itemData['warehouse_id'] ?? $itemData['warehouse'] ?? $itemData['location'] ?? $mapping->warehouses_id
                            ) ?? $mapping->warehouses_id;

                            $coord = $this->resolveWarehouseCoordinate(
                                $whId,
                                $itemData['warehouse_coordinates_id'] ?? $itemData['coordinate_id'] ?? null,
                                $itemData['coordinate'] ?? $itemData['coordinate_name'] ?? null
                            );
                        }

                        $mapping->update([
                            'warehouses_id' => $whId,
                            'warehouse_coordinates_id' => $bpb->isServiceBpb() ? null : ($coord?->id ?? $mapping->warehouse_coordinates_id),
                        ]);

                        if ($mapping->purchaseOrderReceiveNote) {
                            $qty = $itemData['receiveQty'] ?? $itemData['quantity'] ?? null;
                            $raf = $itemData['rafaksi'] ?? null;
                            $dn = $itemData['deliveryNote'] ?? $itemData['dn_number'] ?? null;

                            $poRnUpdates = [];
                            if ($qty !== null) {
                                $poRnUpdates['quantity'] = (float) $qty;
                            }
                            if ($raf !== null) {
                                $poRnUpdates['rafaksi'] = (float) $raf;
                            }
                            if ($dn !== null) {
                                $poRnUpdates['dn_number'] = $dn;
                            }
                            if (! empty($poRnUpdates)) {
                                $mapping->purchaseOrderReceiveNote->update($poRnUpdates);
                            }
                        }
                    }
                }
            });

            $fresh = $bpb->fresh([
                'creator',
                'approvals.user',
                'mappings.warehouse',
                'mappings.coordinate',
                'mappings.purchaseOrderReceiveNote.purchaseOrder.supplier',
                'mappings.purchaseOrderReceiveNote.purchaseOrder.valuta',
                'mappings.purchaseOrderReceiveNote.purchaseOrder.items.requisitionItem.purchaseRequisition',
                'mappings.purchaseOrderReceiveNote.purchaseOrder.items.requisitionItem.item.unitOfMeasurement',
                'mappings.purchaseOrderReceiveNote.purchaseOrder.items.directItem.unitOfMeasurement',
                'mappings.purchaseOrderReceiveNote.receiveNote.supplier',
                'mappings.purchaseOrderReceiveNote.receiveNote.currency',
                'mappings.purchaseOrderReceiveNote.jobNumber',
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'BPB updated successfully.',
                'data' => $this->formatWarehouseRow($fresh),
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['status' => 'error', 'message' => 'BPB Receive Material not found.'], 404);
        } catch (InvalidArgumentException $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Failed updating BPB record.', [
                'bpb_id' => $id,
                'actor_id' => $actorId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Failed to update BPB record due to an unexpected server error.',
            ], 500);
        }
    }

    /**
     * Soft-delete an unapproved BPB Receive Material.
     */
    public function destroy(Request $request, int $id)
    {
        $actorId = $this->requireActorId($request);

        try {
            GeniusOneBackend::bpb()->deleteBpb($id, $actorId);
            SystemContextApiController::forgetContextCache();

            return response()->json([
                'status' => 'success',
                'message' => 'BPB deleted successfully.',
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }
    }

    private function resolveWarehouseId(mixed $warehouseInput): ?int
    {
        return GeniusOneBackend::bpb()->resolveWarehouseId($warehouseInput);
    }

    private function resolveWarehouseCoordinate(int $warehouseId, mixed $coordId = null, mixed $coordName = null): ?WarehouseCoordinate
    {
        return GeniusOneBackend::bpb()->resolveWarehouseCoordinate($warehouseId, $coordId, $coordName);
    }

    /**
     * Format a BpbReceiveMaterial into TableRow structure.
     */
    public function formatWarehouseRow(BpbReceiveMaterial $bpb, int $indexNo = 1): array
    {
        $firstMapping = $bpb->mappings->first();
        $poRn = $firstMapping?->purchaseOrderReceiveNote;
        $po = $poRn?->purchaseOrder;
        $rn = $poRn?->receiveNote;
        $supplier = $rn?->supplier ?? $po?->supplier;

        $sourceType = strtoupper((string) ($bpb->source_type ?? ($rn ? 'RN' : 'PO')));
        $supplierName = $supplier?->name ?? '—';
        $rnNumber = $rn?->rn_number ?? ($sourceType === 'PO' ? 'Direct PO' : '—');
        $rnDate = $this->safeFormatDate($rn?->arrival_date ?? $rn?->created_at, 'd-m-Y', $this->safeFormatDate($bpb->receive_date, 'd-m-Y', '—'));
        $poNumber = $po?->po_number ?? '—';
        $poDate = $this->safeFormatDate($po?->date, 'd-m-Y', '—');

        $firstPoItem = $po?->items?->first();
        $pr = $firstPoItem?->requisitionItem?->purchaseRequisition;
        $prNumber = $pr?->pr_number ?? '—';
        $prDate = $this->safeFormatDate($pr?->date, 'd-m-Y', '—');

        $totalQty = $bpb->mappings->sum(function ($m) {
            $prn = $m->purchaseOrderReceiveNote;

            return (float) (($prn?->quantity ?? 0) - ($prn?->rafaksi ?? 0));
        });

        $totalItem = $bpb->mappings->count();
        $materialName = $poRn?->item_name ?? '—';

        $matchedMasterItem = ($materialName !== '—' ? Item::with('unitOfMeasurement')->where('name', $materialName)->first() : null)
            ?? $firstPoItem?->item;
        $itemCode = $matchedMasterItem?->code ?? '—';
        $defaultUnit = $matchedMasterItem?->unitOfMeasurement?->code ?? $matchedMasterItem?->unitOfMeasurement?->name ?? '—';

        $warehouseName = $firstMapping?->warehouse?->name ?? '—';
        $coordinateName = $firstMapping?->coordinate?->name ?? '—';
        $creatorName = $bpb->creator?->name ?? '—';
        $createdTime = $bpb->created_at ? $bpb->created_at->format('d-m-Y H:i') : '—';
        $receiveDateStr = $this->safeFormatDate($bpb->receive_date, 'd-m-Y', '—');

        $apprStatus = $bpb->status;

        $sjNumber = $poRn?->dn_number ?: ($rn?->sj_number ?: '—');
        $plateNo = $rn?->license_plate ?: '—';
        $noPen = $rn?->no_daftar ?: ($rn?->pl_number ?: '—');
        $ajuNumber = $rn?->aju_number ?: ($rn?->note ?: '—');
        $bcType = $rn ? ($rn->bc_code ?: '—') : 'Non-BC (Direct PO)';
        $bpbType = $bpb->bpb_type ?: ($sourceType === 'PO' ? 'Direct PO' : 'Warehouse');

        $lineItems = $bpb->mappings->values()->map(function ($map, $mIdx) use ($bpb, $poNumber, $poDate, $prNumber, $prDate, $sjNumber, $defaultUnit) {
            $prn = $map->purchaseOrderReceiveNote;
            $itemPo = $prn?->purchaseOrder;
            $itemFirstPoLine = $itemPo?->items?->first();
            $itemPr = $itemFirstPoLine?->requisitionItem?->purchaseRequisition;

            $itName = $prn?->item_name ?? '—';
            $itMaster = ($itName !== '—' ? Item::with('unitOfMeasurement')->where('name', $itName)->first() : null)
                ?? $itemFirstPoLine?->item;
            $itCode = $itMaster?->code ?? '—';
            $itUnit = $itMaster?->unitOfMeasurement?->code ?? $itMaster?->unitOfMeasurement?->name ?? $defaultUnit;

            $qty = (float) ($prn?->quantity ?? 0.0);
            $raf = (float) ($prn?->rafaksi ?? 0.0);
            $net = max(0.0, $qty - $raf);
            $lineWarehouse = $map->warehouse?->name ?? '—';
            $lineCoordinate = $map->coordinate?->name ?? '—';
            $unitSuffix = $itUnit !== '—' ? ' '.$itUnit : '';

            return [
                'no' => $mIdx + 1,
                'mapping_id' => $map->id,
                'po_has_rn_id' => $prn?->id,
                'warehouse_id' => $map->warehouses_id,
                'warehouse_coordinates_id' => $map->warehouse_coordinates_id,
                'coordinate' => $lineCoordinate,
                'poNumber' => $itemPo?->po_number ?? $poNumber,
                'poDate' => $this->safeFormatDate($itemPo?->date, 'd-m-Y', $poDate),
                'prNumber' => $itemPr?->pr_number ?? $prNumber,
                'prDate' => $this->safeFormatDate($itemPr?->date, 'd-m-Y', $prDate),
                'dnNumber' => $prn?->dn_number ?: $sjNumber,
                'jobNumber' => $prn?->jobNumber?->code ?? '—',
                'name' => $itName,
                'item' => $itName,
                'itemName' => $itName,
                'material' => $itName,
                'code' => $itCode,
                'itemCode' => $itCode,
                'itemAlias' => $itCode,
                'quantity' => number_format($net, 2).$unitSuffix,
                'rawQty' => $net,
                'grossQty' => number_format($qty, 2).$unitSuffix,
                'rafaksi' => number_format($raf, 2).$unitSuffix,
                'unit' => $itUnit,
                'remark' => $prn?->remark ?? $bpb->note ?? '—',
                'purpose' => $prn?->remark ?? $bpb->note ?? '—',
                'warehouse' => $lineWarehouse,
                'location' => $lineWarehouse,
                'warehouseLocation' => $lineWarehouse,
                'deliveryNote' => $prn?->dn_number ?: $sjNumber,
                'receiveQty' => $net,
            ];
        })->toArray();

        $poFacility = $po?->facility_status ?? ($rn?->facility ?? $firstPoItem?->item?->facility?->name ?? '');
        $bpbFacility = $poFacility !== ''
            ? (stripos((string) $poFacility, 'non') !== false ? 'NON FASILITAS' : 'FASILITAS')
            : '—';
        $currencyCode = $po?->valuta?->name ?? $rn?->currency?->code ?? $rn?->currency?->name ?? '—';
        $totalSuffix = $defaultUnit !== '—' ? ' '.$defaultUnit : '';

        return [
            'id' => $bpb->id,
            '_id' => "bpb-{$bpb->id}",
            '_type' => 'warehouse',
            'no' => $indexNo,
            'receiveNumber' => $bpb->bpb_number,
            'bpbNumber' => $bpb->bpb_number,
            '_rawNumber' => $bpb->bpb_number,
            'status' => $apprStatus,
            'statusApprove' => $apprStatus,
            '_rawStatus' => $apprStatus,
            '_rawApproval' => $apprStatus,
            'bpbDate' => $receiveDateStr,
            '_rawDate' => $receiveDateStr,
            '_rawDueDate' => '—',
            'supplier' => $supplierName,
            '_rawSupplier' => $supplierName,
            '_rawTotal' => number_format($totalQty, 2).$totalSuffix,
            '_rawPr' => $prNumber,
            '_rawPrDate' => $prDate,
            'poNumber' => $poNumber,
            '_rawPo' => $poNumber,
            'poDate' => $poDate,
            '_rawPoDate' => $poDate,
            'rnNumber' => $rnNumber,
            '_rawRn' => $rnNumber,
            'rnDate' => $rnDate,
            '_rawRnDate' => $rnDate,
            'deliveryOrder' => $sjNumber,
            '_rawDo' => $sjNumber,
            '_rawSj' => $sjNumber,
            '_rawAju' => $ajuNumber,
            '_rawPlateNo' => $plateNo,
            '_rawNoPen' => $noPen,
            '_rawBc' => $bcType,
            'docType' => $bcType,
            '_rawDocType' => $bcType,
            '_rawInvoiceNumber' => $rn?->invoice_number ?? '—',
            '_rawInvoiceDate' => $this->safeFormatDate($rn?->invoice_date, 'd-m-Y', '—'),
            '_rawTaxInvoice' => $rn?->tax_invoice ?? '—',
            '_rawCurrency' => $currencyCode,
            '_rawFacility' => $bpbFacility,
            'facility' => $bpbFacility,
            'statusFacility' => $bpbFacility,
            'bpbType' => $bpbType,
            '_rawBpbType' => $bpbType,
            'bpb_category' => $bpb->isServiceBpb() ? 'SERVICE' : 'GOODS',
            'is_service' => $bpb->isServiceBpb(),
            'sourceType' => $sourceType,
            'source_type' => $sourceType,
            '_rawWarehouseLocation' => $warehouseName,
            'coordinate' => $coordinateName,
            'material' => $materialName,
            '_rawMaterialName' => $materialName,
            'itemCode' => $itemCode,
            '_rawMaterialCode' => $itemCode,
            'totalItem' => $totalItem,
            '_rawTotalItem' => (string) $totalItem,
            'totalQuantity' => number_format($totalQty, 2),
            '_rawTotalQty' => number_format($totalQty, 2),
            '_totalQty' => number_format($totalQty, 2).$totalSuffix,
            'created' => "{$creatorName} ({$createdTime})",
            'createdBy' => $creatorName,
            '_rawCreatedBy' => $creatorName,
            '_rawCreatedAt' => $createdTime,
            'lastUpdated' => $createdTime,
            '_rawLastUpdated' => "{$creatorName} {$createdTime}",
            '_rawRemark' => $bpb->note ?? '—',
            'items' => $lineItems,
            '_items' => $lineItems,
            'approvals' => $bpb->approvals->map(fn ($a) => [
                'tier' => (int) $a->approval_ke,
                'status' => $a->status === 1 ? 'Approved' : ($a->status === 2 ? 'Rejected' : 'Pending'),
                'user' => $a->user?->name ?? '—',
                'date' => $a->updated_at?->format('d-m-Y H:i') ?? '—',
                'note' => $a->note,
            ])->toArray(),
            'actions' => '',
            '_search' => "{$bpb->bpb_number} {$rnNumber} {$poNumber} {$prNumber} {$supplierName} {$materialName} {$warehouseName} {$apprStatus}",
        ];
    }

    /**
     * Safely format dates, handling Excel serial numbers and irregular formats.
     */
    private function safeFormatDate($dateVal, string $format = 'd-M-Y', string $default = '-'): string
    {
        if (empty($dateVal)) {
            return $default;
        }

        try {
            if (is_numeric($dateVal) && (int) $dateVal > 20000 && (int) $dateVal < 70000) {
                return Carbon::createFromTimestampUTC(((int) $dateVal - 25569) * 86400)->format($format);
            }

            return Carbon::parse($dateVal)->format($format);
        } catch (\Throwable $e) {
            return is_string($dateVal) ? $dateVal : $default;
        }
    }
}
