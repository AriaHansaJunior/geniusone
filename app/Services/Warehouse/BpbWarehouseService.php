<?php

namespace App\Services\Warehouse;

use App\Models\Master\Material\Item;
use App\Models\Master\Organization\JobNumber;
use App\Models\Procurement\PurchaseOrder\PurchaseOrder;
use App\Models\Procurement\PurchaseOrder\PurchaseOrderItem;
use App\Models\Warehouse\Facility\Warehouse;
use App\Models\Warehouse\Facility\WarehouseCoordinate;
use App\Models\Warehouse\GateReceiving\PurchaseOrderReceiveNote;
use App\Models\Warehouse\GateReceiving\ReceiveNote;
use App\Models\Warehouse\InboundStorage\BpbReceiveMaterial;
use App\Models\Warehouse\InboundStorage\PoRnToBpb;
use App\Services\AuditLogger;
use App\Services\DocumentNumber\DocumentNumberGenerator;
use App\Services\Inventory\InventoryService;
use Carbon\Carbon;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

class BpbWarehouseService
{
    protected InventoryService $inventoryService;

    public function __construct(?InventoryService $inventoryService = null)
    {
        $this->inventoryService = $inventoryService ?? new InventoryService;
    }

    /**
     * Create a new BPB (Bukti Penerimaan Barang) and allocate incoming stock to warehouses.
     *
     * @param  array  $headerData  ['receive_date', 'note', 'bpb_number', 'source_type', 'bpb_type']
     * @param  array  $mappings  Array of ['po_has_rn_id', 'warehouses_id', 'warehouse_coordinates_id' => optional, 'item_id' => optional]
     * @param  bool  $autoUpdateStock  Whether to automatically increment physical item stock (default false for BE-05 workflow)
     */
    public function createBpb(
        array $headerData,
        array $mappings,
        ?int $userId = null,
        bool $autoUpdateStock = false
    ): BpbReceiveMaterial {
        $actorId = $userId ?? Auth::id();
        if (empty($mappings)) {
            throw new InvalidArgumentException('A BPB must contain at least one warehouse item allocation.');
        }

        // BE-05: Strict Downstream Gating (RN must be Approved before warehouse allocation)
        foreach ($mappings as $map) {
            $poRnId = $map['po_has_rn_id'] ?? null;
            if ($poRnId) {
                $poRn = PurchaseOrderReceiveNote::with('receiveNote')->find($poRnId);
                if ($poRn && $poRn->receiveNote && ! in_array($poRn->receiveNote->status, ['Approved', 'Approved 2'], true)) {
                    throw new InvalidArgumentException("Cannot create BPB: Referenced Receive Note '{$poRn->receiveNote->rn_number}' must be fully Approved first (Current status: {$poRn->receiveNote->status}).");
                }
            }
        }

        return DB::transaction(function () use ($headerData, $mappings, $actorId, $autoUpdateStock) {
            $bpbNumber = $headerData['bpb_number'] ?? DocumentNumberGenerator::generateBpbNumber();

            $bpb = BpbReceiveMaterial::create([
                'bpb_number' => $bpbNumber,
                'source_type' => $headerData['source_type'] ?? 'RN',
                'bpb_type' => $headerData['bpb_type'] ?? 'Warehouse',
                'status' => 'Waiting for Approve 1',
                'note' => $headerData['note'] ?? null,
                'receive_date' => $headerData['receive_date'] ?? now(),
                'creator_id' => $actorId,
                'updated_by' => $actorId,
            ]);

            foreach ($mappings as $map) {
                if (empty($map['warehouses_id'])) {
                    throw new InvalidArgumentException('Each BPB allocation item must specify a destination warehouse.');
                }

                $poRnId = $map['po_has_rn_id'] ?? null;

                PoRnToBpb::create([
                    'po_has_rn_id' => $poRnId,
                    'bpb_receive_material_id' => $bpb->id,
                    'warehouses_id' => $map['warehouses_id'],
                    'warehouse_coordinates_id' => $map['warehouse_coordinates_id'] ?? null,
                ]);

                // Update physical stock if enabled
                if ($autoUpdateStock && $poRnId) {
                    $poRn = PurchaseOrderReceiveNote::find($poRnId);
                    if ($poRn) {
                        $netQuantity = (float) $poRn->quantity - (float) $poRn->rafaksi;

                        $itemId = $map['item_id'] ?? null;
                        if (! $itemId && ! empty($poRn->item_name)) {
                            $foundItem = Item::where('name', $poRn->item_name)->first();
                            $itemId = $foundItem?->id;
                        }

                        if ($itemId && $netQuantity > 0) {
                            $this->inventoryService->recordInboundStock(
                                itemId: $itemId,
                                quantity: $netQuantity,
                                referenceDoc: $bpbNumber,
                                userId: $actorId,
                                warehouseId: $map['warehouses_id']
                            );
                        }
                    }
                }
            }

            AuditLogger::logAction(
                action: 'CREATE',
                modelName: 'BpbReceiveMaterial',
                modelId: $bpb->id,
                before: null,
                after: $bpb->toArray(),
                userId: $actorId,
                notes: "Created BPB {$bpbNumber} with ".count($mappings).' warehouse allocations'
            );

            return $bpb->load([
                'creator',
                'mappings.warehouse',
                'mappings.coordinate',
                'mappings.purchaseOrderReceiveNote.receiveNote',
                'mappings.purchaseOrderReceiveNote.purchaseOrder',
            ]);
        });
    }

    /**
     * Find BPB by document number or ID.
     */
    public function findByCode(string $code): ?BpbReceiveMaterial
    {
        return BpbReceiveMaterial::with([
            'creator',
            'updatedByUser',
            'mappings.warehouse',
            'mappings.purchaseOrderReceiveNote.receiveNote.supplier',
            'mappings.purchaseOrderReceiveNote.purchaseOrder',
            'approvals.user',
        ])
            ->where('bpb_number', $code)
            ->orWhere('id', is_numeric($code) ? $code : null)
            ->first();
    }

    /**
     * List BPB documents with filtering and pagination.
     */
    public function listBpbs(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = BpbReceiveMaterial::with([
            'creator',
            'mappings.warehouse',
            'mappings.purchaseOrderReceiveNote.receiveNote',
            'approvals',
        ]);

        if (! empty($filters['search'])) {
            $s = $filters['search'];
            $query->where(function ($q) use ($s) {
                $q->where('bpb_number', 'like', "%{$s}%")
                    ->orWhere('note', 'like', "%{$s}%");
            });
        }

        if (! empty($filters['date_from'])) {
            $query->whereDate('receive_date', '>=', $filters['date_from']);
        }

        if (! empty($filters['date_to'])) {
            $query->whereDate('receive_date', '<=', $filters['date_to']);
        }

        $allowedSorts = ['id', 'bpb_number', 'receive_date', 'status', 'created_at', 'updated_at'];
        $sortField = in_array($filters['sort_by'] ?? '', $allowedSorts, true) ? $filters['sort_by'] : 'created_at';
        $sortOrder = strtolower((string) ($filters['sort_order'] ?? 'desc')) === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sortField, $sortOrder);

        return $query->paginate($perPage);
    }

    /**
     * Soft delete BPB document with audit tracking.
     */
    public function deleteBpb(int $id, ?int $userId = null): bool
    {
        $actorId = $userId ?? Auth::id();

        return DB::transaction(function () use ($id, $actorId) {
            $bpb = BpbReceiveMaterial::findOrFail($id);
            if (in_array($bpb->status, ['Approved', 'Approved 2'], true)) {
                throw new InvalidArgumentException("BPB '{$bpb->bpb_number}' is already Approved and cannot be deleted.");
            }

            // Cascade soft-delete mapping records
            $bpb->mappings()->delete();
            $deleted = $bpb->delete();

            AuditLogger::logAction(
                action: 'DELETE',
                modelName: 'BpbReceiveMaterial',
                modelId: $id,
                before: $bpb->toArray(),
                after: null,
                userId: $actorId,
                notes: "Deleted BPB document {$bpb->bpb_number}"
            );

            return (bool) $deleted;
        });
    }

    /**
     * Create a BPB Receive Material atomically from validated API controller payload.
     * Supports both RN -> BPB and Direct Non-KB PO -> BPB flows with concurrency locking.
     */
    public function createBpbFromPayload(array $payload, int $creatorId): BpbReceiveMaterial
    {
        return DB::transaction(function () use ($payload, $creatorId) {
            $bpbNumber = ! empty($payload['bpb_number'])
                ? (string) $payload['bpb_number']
                : DocumentNumberGenerator::generateBpbNumber();

            $rawReceiveDate = $payload['receive_date'] ?? null;
            $receiveDate = Carbon::now();
            if (! empty($rawReceiveDate)) {
                try {
                    if (preg_match('/^(\d{2})-(\d{2})-(\d{4})$/', (string) $rawReceiveDate)) {
                        $receiveDate = Carbon::createFromFormat('d-m-Y', (string) $rawReceiveDate);
                    } else {
                        $receiveDate = Carbon::parse((string) $rawReceiveDate);
                    }
                } catch (\Throwable $e) {
                    $receiveDate = Carbon::now();
                }
            }

            // Resolve optional header PO
            $headerPoCode = $payload['po_number'] ?? null;
            $headerPo = null;
            if (! empty($headerPoCode)) {
                $cleanPo = preg_replace('/[^A-Za-z0-9]/', '', (string) $headerPoCode);
                $headerPo = PurchaseOrder::where('po_number', $headerPoCode)
                    ->orWhereRaw("REPLACE(REPLACE(po_number, '/', ''), '-', '') = ?", [$cleanPo])
                    ->first();
            }

            $rawItems = is_array($payload['items'] ?? null) ? $payload['items'] : [];
            $rnCode = trim((string) ($payload['rn_number'] ?? ''));
            $requestedSource = strtoupper(trim((string) ($payload['source_type'] ?? '')));
            $hasPoReference = $headerPo !== null || collect($rawItems)->contains(function ($it) {
                $p = trim((string) ($it['poNumber'] ?? $it['po_number'] ?? ''));

                return $p !== '' && $p !== '—' && $p !== '-';
            });

            $sourceType = $requestedSource === ''
                ? ($rnCode !== '' ? 'RN' : ($hasPoReference ? 'PO' : 'RN'))
                : $requestedSource;

            if (! in_array($sourceType, ['RN', 'PO'], true)) {
                throw new InvalidArgumentException("Invalid BPB source type '{$sourceType}'. Allowed values are 'RN' or 'PO'.");
            }

            $rn = null;
            if ($sourceType === 'RN') {
                if ($rnCode === '') {
                    throw ValidationException::withMessages([
                        'rn_number' => ['RN Number is required when creating BPB from Receive Note.'],
                    ]);
                }

                $cleanRn = preg_replace('/[^A-Za-z0-9]/', '', $rnCode);
                $rn = ReceiveNote::where('rn_number', $rnCode)
                    ->orWhereRaw("REPLACE(REPLACE(rn_number, '/', ''), '-', '') = ?", [$cleanRn])
                    ->lockForUpdate()
                    ->first();

                if (! $rn) {
                    throw ValidationException::withMessages([
                        'rn_number' => ["Receive Note '{$rnCode}' not found. BPB from RN requires an existing Receive Note."],
                    ]);
                }

                if (! in_array($rn->status, ['Approved', 'Approved 2'], true)) {
                    throw ValidationException::withMessages([
                        'rn_number' => ["Receive Note '{$rnCode}' has not been approved yet (Current status: {$rn->status}). Only approved Receive Notes can be received into warehouse."],
                    ]);
                }

                // Double BPB Prevention for RN
                $existingBpb = BpbReceiveMaterial::where('status', '!=', 'Rejected')
                    ->whereHas('mappings.purchaseOrderReceiveNote', fn ($q) => $q->where('receive_note_id', $rn->id))
                    ->lockForUpdate()
                    ->first();

                if ($existingBpb) {
                    throw ValidationException::withMessages([
                        'rn_number' => ["Receive Note '{$rnCode}' has already been processed in BPB '{$existingBpb->bpb_number}'. Duplicate material receipt (Double BPB) is not allowed."],
                    ]);
                }

                $rnPos = PurchaseOrder::with('poType')
                    ->whereIn('id', $rn->purchaseOrders()->pluck('purchase_order_id'))
                    ->get();
                if ($rnPos->contains(fn (PurchaseOrder $po) => $po->isServiceOrder())) {
                    throw ValidationException::withMessages([
                        'rn_number' => ["Receive Note '{$rnCode}' references a Service Purchase Order (PO Jasa) and cannot be processed as physical goods BPB."],
                    ]);
                }

                $requestedCategory = strtoupper(trim((string) ($payload['bpb_category'] ?? '')));
                if ($requestedCategory === 'SERVICE') {
                    throw ValidationException::withMessages([
                        'bpb_category' => ['Service BPB cannot be created from a Goods Receive Note (RN). Use Direct PO from a Service Purchase Order instead.'],
                    ]);
                }
                $bpbCategory = 'GOODS';
            } else {
                // Direct PO -> BPB: resolve all referenced POs and validate Approved + Non-Kawasan Berikat
                $referencedPoIds = collect();
                if ($headerPo) {
                    $referencedPoIds->push($headerPo->id);
                }
                foreach ($rawItems as $it) {
                    $itPoCode = trim((string) ($it['poNumber'] ?? $it['po_number'] ?? ''));
                    if ($itPoCode !== '' && $itPoCode !== '—' && $itPoCode !== '-') {
                        $cleanItPo = preg_replace('/[^A-Za-z0-9]/', '', $itPoCode);
                        $matched = PurchaseOrder::where('po_number', $itPoCode)
                            ->orWhereRaw("REPLACE(REPLACE(po_number, '/', ''), '-', '') = ?", [$cleanItPo])
                            ->first();
                        if (! $matched) {
                            throw ValidationException::withMessages([
                                'po_number' => ["Purchase Order '{$itPoCode}' not found."],
                            ]);
                        }
                        $referencedPoIds->push($matched->id);
                        if (! $headerPo) {
                            $headerPo = $matched;
                        }
                    }
                }

                $referencedPoIds = $referencedPoIds->unique()->values();
                if ($referencedPoIds->isEmpty()) {
                    throw ValidationException::withMessages([
                        'po_number' => ['PO Number is required when creating direct BPB from Purchase Order.'],
                    ]);
                }

                $referencedPos = PurchaseOrder::with(['items', 'poType'])
                    ->whereIn('id', $referencedPoIds)
                    ->lockForUpdate()
                    ->get();

                $hasServicePo = $referencedPos->contains(fn (PurchaseOrder $po) => $po->isServiceOrder());
                $hasGoodsPo = $referencedPos->contains(fn (PurchaseOrder $po) => ! $po->isServiceOrder());

                if ($hasServicePo && $hasGoodsPo) {
                    throw ValidationException::withMessages([
                        'po_number' => ['Cannot mix Goods Purchase Orders and Service Purchase Orders (PO Jasa) inside a single BPB document.'],
                    ]);
                }

                $requestedCategory = strtoupper(trim((string) ($payload['bpb_category'] ?? '')));
                if ($requestedCategory === '' && (! empty($payload['is_service']) || stripos((string) ($payload['bpb_type'] ?? ''), 'jasa') !== false || stripos((string) ($payload['bpb_type'] ?? ''), 'service') !== false)) {
                    $requestedCategory = 'SERVICE';
                }

                if ($hasServicePo) {
                    if ($requestedCategory === 'GOODS') {
                        throw ValidationException::withMessages([
                            'bpb_category' => ['Cannot create a Goods BPB against a Service Purchase Order (PO Jasa).'],
                        ]);
                    }
                    $bpbCategory = 'SERVICE';
                } else {
                    if ($requestedCategory === 'SERVICE') {
                        throw ValidationException::withMessages([
                            'bpb_category' => ['Cannot create a Service BPB against a Goods Purchase Order.'],
                        ]);
                    }
                    $bpbCategory = 'GOODS';
                }

                foreach ($referencedPos as $refPo) {
                    if (! in_array($refPo->status, ['Approved', 'Approved 2'], true)) {
                        throw ValidationException::withMessages([
                            'po_number' => ["Purchase Order '{$refPo->po_number}' is not fully Approved yet (Current status: {$refPo->status})."],
                        ]);
                    }

                    if (! $hasServicePo && $refPo->isKawasanBerikat()) {
                        throw ValidationException::withMessages([
                            'po_number' => ["Purchase Order '{$refPo->po_number}' is a Kawasan Berikat PO and must go through Receive Note (EXIM) before Receive Material (BPB)."],
                        ]);
                    }

                    // Prevent duplicate/over-receiving direct PO items (ANSI SQL portable)
                    $orderedTotal = (float) $refPo->items->sum('order');
                    if ($orderedTotal > 0) {
                        $alreadyReceived = (float) DB::table('purchase_order_has_receive_note as porn')
                            ->join('po_rn_to_bpb as pb', 'pb.po_has_rn_id', '=', 'porn.id')
                            ->join('bpb_receive_material as bpb', 'pb.bpb_receive_material_id', '=', 'bpb.id')
                            ->where('porn.purchase_order_id', $refPo->id)
                            ->where('bpb.status', '!=', 'Rejected')
                            ->whereNull('porn.deleted_at')
                            ->whereNull('bpb.deleted_at')
                            ->sum(DB::raw('CASE WHEN (porn.quantity - COALESCE(porn.rafaksi, 0)) > 0 THEN (porn.quantity - COALESCE(porn.rafaksi, 0)) ELSE 0 END'));

                        $incomingTotal = collect($rawItems)->sum(function ($it) use ($refPo) {
                            $p = trim((string) ($it['poNumber'] ?? $it['po_number'] ?? $refPo->po_number));
                            $cleanP = preg_replace('/[^A-Za-z0-9]/', '', $p);
                            $cleanRef = preg_replace('/[^A-Za-z0-9]/', '', $refPo->po_number);
                            if ($cleanP !== '' && $cleanP !== $cleanRef) {
                                return 0;
                            }
                            $q = (float) ($it['receiveQty'] ?? $it['quantity'] ?? $it['qty'] ?? 0);
                            $r = (float) ($it['rafaksi'] ?? 0);

                            return max(0.0, $q - $r);
                        });

                        if ($alreadyReceived >= $orderedTotal - 0.0001 || ($alreadyReceived + $incomingTotal) > $orderedTotal + 0.0001) {
                            throw ValidationException::withMessages([
                                'po_number' => ["Purchase Order '{$refPo->po_number}' quantity already received or exceeded (Ordered: {$orderedTotal}, Already Received: {$alreadyReceived}, Incoming: {$incomingTotal})."],
                            ]);
                        }
                    }
                }
            }

            $firstSj = $payload['sj_number'] ?? null;
            if (! $firstSj && ! empty($rawItems)) {
                $firstSj = $rawItems[0]['deliveryNote'] ?? $rawItems[0]['dn_number'] ?? $rawItems[0]['sjNumber'] ?? null;
            }

            $invoiceDate = null;
            if (! empty($payload['invoice_date'])) {
                try {
                    $invoiceDate = Carbon::parse((string) $payload['invoice_date']);
                } catch (\Throwable $e) {
                    $invoiceDate = null;
                }
            }

            if ($rn) {
                $rnUpdates = array_filter([
                    'invoice_number' => $payload['invoice_number'] ?? null,
                    'invoice_date' => $invoiceDate,
                    'tax_invoice' => $payload['tax_invoice'] ?? null,
                    'license_plate' => $payload['plate_no'] ?? null,
                    'sj_number' => $firstSj,
                    'pl_number' => $payload['no_pen'] ?? null,
                    'note' => $payload['aju_number'] ?? null,
                ], fn ($val) => $val !== null && $val !== '');

                if (! empty($rnUpdates)) {
                    $rn->update($rnUpdates);
                }
            }

            $noteText = $payload['note'] ?? null;
            if (! $noteText && ! empty($rawItems)) {
                $noteText = $rawItems[0]['purpose'] ?? $rawItems[0]['remark'] ?? null;
            }

            $bpbType = ! empty($payload['bpb_type'])
                ? (string) $payload['bpb_type']
                : ($bpbCategory === 'SERVICE' ? 'Service (Jasa)' : ($sourceType === 'PO' ? 'Direct PO' : 'Warehouse'));

            $bpb = BpbReceiveMaterial::create([
                'bpb_number' => $bpbNumber,
                'source_type' => $sourceType,
                'bpb_type' => $bpbType,
                'bpb_category' => $bpbCategory,
                'status' => 'Waiting for Approve 1',
                'note' => $noteText ?: null,
                'receive_date' => $receiveDate,
                'creator_id' => $creatorId,
                'updated_by' => $creatorId,
            ]);

            $headerWarehouseId = $bpbCategory === 'SERVICE'
                ? null
                : $this->resolveWarehouseId($payload['warehouse_input'] ?? null);
            $fallbackJobId = JobNumber::query()->value('id');
            $defaultPoId = $headerPo?->id;

            if (count($rawItems) > 0) {
                foreach ($rawItems as $itemData) {
                    $itemPoId = $defaultPoId;
                    $itemPoCode = $itemData['poNumber'] ?? $itemData['po_number'] ?? null;
                    if (! empty($itemPoCode) && $itemPoCode !== '—' && $itemPoCode !== '-') {
                        $cleanItemPo = preg_replace('/[^A-Za-z0-9]/', '', (string) $itemPoCode);
                        $matchedPo = PurchaseOrder::where('po_number', $itemPoCode)
                            ->orWhereRaw("REPLACE(REPLACE(po_number, '/', ''), '-', '') = ?", [$cleanItemPo])
                            ->first();
                        if ($matchedPo) {
                            $itemPoId = $matchedPo->id;
                        }
                    }

                    if ($bpbCategory === 'SERVICE') {
                        $itemWhId = null;
                        $itemCoordinate = null;
                    } else {
                        $itemWhId = $this->resolveWarehouseId(
                            $itemData['warehouse_id'] ?? $itemData['warehouse'] ?? $itemData['location'] ?? null
                        ) ?? $headerWarehouseId;

                        if (! $itemWhId) {
                            throw new InvalidArgumentException('Each BPB item line must specify a valid destination Warehouse.');
                        }

                        $itemCoordinate = $this->resolveWarehouseCoordinate(
                            $itemWhId,
                            $itemData['warehouse_coordinates_id'] ?? $itemData['coordinate_id'] ?? ($payload['warehouse_coordinates_id'] ?? null),
                            $itemData['coordinate'] ?? $itemData['coordinate_name'] ?? ($payload['coordinate'] ?? null)
                        );
                    }

                    $resolvedPoHasItemId = ! empty($itemData['po_has_items_id']) && is_numeric($itemData['po_has_items_id'])
                        ? (int) $itemData['po_has_items_id']
                        : null;
                    $poItem = $resolvedPoHasItemId ? PurchaseOrderItem::with(['prItem', 'directItem'])->find($resolvedPoHasItemId) : null;

                    $itemJobId = null;
                    if (! empty($itemData['job_number_id']) && is_numeric($itemData['job_number_id'])) {
                        $itemJobId = (int) $itemData['job_number_id'];
                    } elseif (! empty($itemData['jobNumber']) || ! empty($itemData['job_number'])) {
                        $jobCode = $itemData['jobNumber'] ?? $itemData['job_number'];
                        if ($jobCode !== '—' && $jobCode !== '-') {
                            $itemJobId = JobNumber::where('code', $jobCode)->orWhere('name', 'like', "%{$jobCode}%")->value('id');
                        }
                    }
                    $itemJobId = $itemJobId ?? $poItem?->prItem?->job_number_id ?? $fallbackJobId;

                    $itemName = trim((string) ($itemData['name'] ?? $itemData['itemName'] ?? $itemData['item_name'] ?? $poItem?->item_alias ?? $poItem?->item?->name ?? ''));
                    $qty = (float) ($itemData['receiveQty'] ?? $itemData['quantity'] ?? $itemData['qty'] ?? 0);
                    if ($qty <= 0) {
                        throw new InvalidArgumentException('Receive quantity must be greater than zero.');
                    }
                    $rafaksi = (float) ($itemData['rafaksi'] ?? 0);
                    $dnNumber = $itemData['deliveryNote'] ?? $itemData['dn_number'] ?? $itemData['sjNumber'] ?? $firstSj;

                    $poRn = null;
                    if ($rn) {
                        if (! empty($itemData['po_has_rn_id']) && is_numeric($itemData['po_has_rn_id'])) {
                            $poRn = PurchaseOrderReceiveNote::where('id', (int) $itemData['po_has_rn_id'])
                                ->where('receive_note_id', $rn->id)
                                ->first();
                        }
                        if (! $poRn && $itemName !== '') {
                            $poRn = PurchaseOrderReceiveNote::where('receive_note_id', $rn->id)
                                ->where('item_name', $itemName)
                                ->first();
                        }
                    }

                    if ($poRn) {
                        $poRn->update([
                            'quantity' => $qty,
                            'rafaksi' => $rafaksi,
                            'dn_number' => $dnNumber,
                        ]);
                    } else {
                        if (! $itemPoId) {
                            throw new InvalidArgumentException('Purchase Order reference is required for direct BPB item lines.');
                        }
                        if (! $itemJobId) {
                            throw new InvalidArgumentException('A valid Job Number is required before creating BPB item lines.');
                        }
                        $linePrice = (float) ($itemData['price'] ?? ($poItem?->price ?? 0));
                        $poRn = PurchaseOrderReceiveNote::create([
                            'purchase_order_id' => $itemPoId,
                            'po_has_items_id' => $resolvedPoHasItemId,
                            'receive_note_id' => $rn?->id,
                            'dn_number' => $dnNumber,
                            'job_number_id' => $itemJobId,
                            'item_name' => $itemName ?: $poItem?->item?->name,
                            'quantity' => $qty,
                            'rafaksi' => $rafaksi,
                            'price' => $linePrice,
                            'additional_price' => 0,
                            'discount' => 0,
                            'ppn' => 0,
                            'grand_total' => max(0.0, ($qty - $rafaksi) * $linePrice),
                        ]);
                    }

                    $bpb->mappings()->create([
                        'po_has_rn_id' => $poRn->id,
                        'warehouses_id' => $itemWhId,
                        'warehouse_coordinates_id' => $itemCoordinate?->id,
                    ]);
                }
            } elseif ($rn && $rn->purchaseOrders()->count() > 0) {
                if (! $headerWarehouseId) {
                    throw new InvalidArgumentException('Destination Warehouse is required when creating BPB from Receive Note.');
                }
                $headerCoordinate = $this->resolveWarehouseCoordinate(
                    $headerWarehouseId,
                    $payload['warehouse_coordinates_id'] ?? null,
                    $payload['coordinate'] ?? null
                );
                foreach ($rn->purchaseOrders as $poRn) {
                    $bpb->mappings()->create([
                        'po_has_rn_id' => $poRn->id,
                        'warehouses_id' => $headerWarehouseId,
                        'warehouse_coordinates_id' => $headerCoordinate?->id,
                    ]);
                }
            } elseif ($headerPo && $headerPo->items()->count() > 0) {
                if ($bpbCategory !== 'SERVICE' && ! $headerWarehouseId) {
                    throw new InvalidArgumentException('Destination Warehouse is required when creating direct BPB from Purchase Order.');
                }
                $headerCoordinate = ($bpbCategory === 'SERVICE' || ! $headerWarehouseId)
                    ? null
                    : $this->resolveWarehouseCoordinate(
                        $headerWarehouseId,
                        $payload['warehouse_coordinates_id'] ?? null,
                        $payload['coordinate'] ?? null
                    );
                foreach ($headerPo->items as $poItem) {
                    $jobId = $poItem->requisitionItem?->job_number_id ?? $fallbackJobId;
                    if (! $jobId) {
                        throw new InvalidArgumentException('A valid Job Number is required before creating BPB item lines.');
                    }
                    $itName = $poItem->requisitionItem?->item?->name ?? $poItem->directItem?->name ?? $poItem->item_alias;
                    $qty = (float) ($poItem->order ?? 0);
                    $price = (float) ($poItem->price ?? 0);
                    $poRn = PurchaseOrderReceiveNote::create([
                        'purchase_order_id' => $headerPo->id,
                        'po_has_items_id' => $poItem->id,
                        'receive_note_id' => $rn?->id,
                        'dn_number' => $firstSj,
                        'job_number_id' => $jobId,
                        'item_name' => $itName,
                        'quantity' => $qty,
                        'rafaksi' => 0,
                        'price' => $price,
                        'additional_price' => 0,
                        'discount' => 0,
                        'ppn' => 0,
                        'grand_total' => $qty * $price,
                    ]);

                    $bpb->mappings()->create([
                        'po_has_rn_id' => $poRn->id,
                        'warehouses_id' => $headerWarehouseId,
                        'warehouse_coordinates_id' => $headerCoordinate?->id,
                    ]);
                }
            } else {
                throw new InvalidArgumentException('At least one material item from an Approved RN or Approved Non-Kawasan Berikat PO is required.');
            }

            // Create initial approval tier
            $bpb->approvals()->create([
                'approval_ke' => '1',
                'users_id' => $creatorId,
                'status' => 0,
            ]);

            AuditLogger::logAction(
                action: 'created',
                modelName: 'BpbReceiveMaterial',
                modelId: $bpb->id,
                before: null,
                after: $bpb->toArray(),
                userId: $creatorId,
                notes: "Created Warehouse Receive Material {$bpbNumber}"
            );

            return $bpb->fresh([
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
        });
    }

    public function resolveWarehouseId(mixed $warehouseInput): ?int
    {
        if (is_numeric($warehouseInput) && Warehouse::where('id', (int) $warehouseInput)->exists()) {
            return (int) $warehouseInput;
        }

        if (! empty($warehouseInput)) {
            $name = trim((string) $warehouseInput);
            $matched = Warehouse::where('name', $name)
                ->orWhere('name', 'like', "%{$name}%")
                ->first();
            if ($matched) {
                return (int) $matched->id;
            }
        }

        return null;
    }

    public function resolveWarehouseCoordinate(int $warehouseId, mixed $coordId = null, mixed $coordName = null): ?WarehouseCoordinate
    {
        if (is_numeric($coordId)) {
            $found = WarehouseCoordinate::where('warehouses_id', $warehouseId)->where('id', (int) $coordId)->first();
            if ($found) {
                return $found;
            }
        }

        if (! empty($coordName)) {
            $name = trim((string) $coordName);
            $found = WarehouseCoordinate::where('warehouses_id', $warehouseId)
                ->where(function ($q) use ($name) {
                    $q->where('name', $name)->orWhere('code', $name);
                })
                ->first();
            if ($found) {
                return $found;
            }
        }

        return WarehouseCoordinate::where('warehouses_id', $warehouseId)->orderBy('id')->first();
    }
}
