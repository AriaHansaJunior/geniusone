<?php

namespace App\Http\Controllers\Api\Warehouse;

use App\Http\Controllers\Controller;
use App\Models\Master\Material\Item;
use App\Models\Master\Partner\Supplier;
use App\Models\Master\Organization\JobNumber;
use App\Models\Procurement\PurchaseOrder\PurchaseOrder;
use App\Models\Warehouse\Facility\Warehouse;
use App\Models\Warehouse\GateReceiving\PurchaseOrderReceiveNote;
use App\Models\Warehouse\GateReceiving\ReceiveNote;
use App\Models\Warehouse\InboundStorage\BpbReceiveMaterial;
use App\Services\GeniusOneBackend;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
            'mappings.purchaseOrderReceiveNote.purchaseOrder.supplier',
            'mappings.purchaseOrderReceiveNote.purchaseOrder.items.requisitionItem.purchaseRequisition',
            'mappings.purchaseOrderReceiveNote.purchaseOrder.items.requisitionItem.item.unitOfMeasurement',
            'mappings.purchaseOrderReceiveNote.receiveNote.supplier',
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

        $records = $query->orderBy('id', 'desc')->get();

        // Calculate KPI Stats Cards
        $totalCount = $records->count();
        $readyCount = $records->filter(fn ($r) => $r->status !== 'Approved')->count();
        $totalQty = $records->sum(function ($bpb) {
            return $bpb->mappings->sum(function ($map) {
                $poRn = $map->purchaseOrderReceiveNote;

                return (float) (($poRn?->quantity ?? 0) - ($poRn?->rafaksi ?? 0));
            });
        });

        $suppliersCount = $records->map(function ($bpb) {
            return $bpb->mappings->map(fn ($m) => $m->purchaseOrderReceiveNote?->purchaseOrder?->supliers_id ?? $m->purchaseOrderReceiveNote?->receiveNote?->supliers_id);
        })->flatten()->filter()->unique()->count();

        $stats = [
            ['Receive documents', (string) $totalCount, 'Warehouse inbound receipts'],
            ['Approval status', "{$readyCount} Pending", 'Awaiting verification'],
            ['Total received items', number_format($totalQty, 2), 'Across all BPB receipts'],
            ['Registered suppliers', (string) max(1, $suppliersCount), 'Supplying incoming materials'],
        ];

        // Format rows for Frontend Table
        $rows = $records->values()->map(function ($bpb, $idx) {
            return $this->formatWarehouseRow($bpb, $idx + 1);
        })->toArray();

        if ($request->expectsJson() || $request->is('api/*') || $request->query('format') === 'json') {
            return response()->json([
                'status' => 'success',
                'stats' => $stats,
                'rows' => $rows,
            ]);
        }

        return view('app', [
            'page' => 'warehouse',
            'initialData' => ['stats' => $stats, 'rows' => $rows],
        ]);
    }

    /**
     * Show single Warehouse BPB detail.
     */
    public function show(Request $request, string $code)
    {
        $rawCode = str_replace('-', '/', $code);
        $cleanCode = preg_replace('/[^A-Za-z0-9]/', '', $code);

        $bpb = BpbReceiveMaterial::with([
            'creator',
            'approvals.user',
            'mappings.warehouse',
            'mappings.purchaseOrderReceiveNote.purchaseOrder.supplier',
            'mappings.purchaseOrderReceiveNote.purchaseOrder.items.requisitionItem.purchaseRequisition',
            'mappings.purchaseOrderReceiveNote.purchaseOrder.items.requisitionItem.item.unitOfMeasurement',
            'mappings.purchaseOrderReceiveNote.receiveNote.supplier',
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

        return view('app', [
            'page' => 'warehouse-detail',
            'code' => $code,
            'initialData' => ['item' => $detailRow],
        ]);
    }

    /**
     * Store a newly created Warehouse Receive Material (BPB) via Form.
     */
    public function store(Request $request)
    {
        DB::beginTransaction();
        try {
            $bpbNumber = $request->input('bpb_number') ?: GeniusOneBackend::numbering()->generateBpbNumber();

            $rawReceiveDate = $request->input('receive_date') ?? $request->input('receiveDate');
            $receiveDate = Carbon::now();
            if (! empty($rawReceiveDate)) {
                try {
                    if (preg_match('/^(\d{2})-(\d{2})-(\d{4})$/', $rawReceiveDate, $m)) {
                        $receiveDate = Carbon::createFromFormat('d-m-Y', $rawReceiveDate);
                    } else {
                        $receiveDate = Carbon::parse($rawReceiveDate);
                    }
                } catch (\Throwable $e) {
                    $receiveDate = Carbon::now();
                }
            }

            $creatorId = auth()->id() ?? 1;

            // Resolve Supplier
            $supInput = $request->input('supliers_id') ?? $request->input('supplier_id') ?? $request->input('supplier');
            $supplierId = null;
            if (is_numeric($supInput) && Supplier::where('id', (int) $supInput)->exists()) {
                $supplierId = (int) $supInput;
            } elseif (! empty($supInput)) {
                $cleanSup = trim(preg_replace('/^\[[^\]]*\]\s*/', '', (string) $supInput));
                $supObj = Supplier::where('code', $cleanSup)
                    ->orWhere('name', $cleanSup)
                    ->orWhere('name', 'like', "%{$cleanSup}%")
                    ->first();
                $supplierId = $supObj?->id;
            }

            // Resolve Header PO if provided
            $headerPoCode = $request->input('po_number') ?? $request->input('poNumber');
            $headerPo = null;
            if (! empty($headerPoCode)) {
                $cleanPo = preg_replace('/[^A-Za-z0-9]/', '', (string) $headerPoCode);
                $headerPo = PurchaseOrder::where('po_number', $headerPoCode)
                    ->orWhereRaw("REPLACE(REPLACE(po_number, '/', ''), '-', '') = ?", [$cleanPo])
                    ->first();
                if ($headerPo && ! $supplierId) {
                    $supplierId = $headerPo->supliers_id;
                }
            }

            if (! $supplierId) {
                $supplierId = Supplier::first()?->id ?? 1;
            }

            $rawItems = $request->input('items', []);
            $rnCode = trim((string) ($request->input('rn_number') ?? $request->input('rnNumber') ?? ''));
            $requestedSource = strtoupper(trim((string) ($request->input('source_type') ?? $request->input('sourceType') ?? '')));
            $hasPoReference = $headerPo !== null || (is_array($rawItems) && collect($rawItems)->contains(function ($it) {
                $p = trim((string) ($it['poNumber'] ?? $it['po_number'] ?? ''));

                return $p !== '' && $p !== '—' && $p !== '-';
            }));

            if ($requestedSource === '') {
                $sourceType = $rnCode !== '' ? 'RN' : ($hasPoReference ? 'PO' : 'RN');
            } else {
                $sourceType = $requestedSource;
            }

            if (! in_array($sourceType, ['RN', 'PO'], true)) {
                DB::rollBack();

                return response()->json([
                    'status' => 'error',
                    'message' => "Invalid BPB source type '{$sourceType}'. Allowed values are 'RN' or 'PO'.",
                ], 422);
            }

            $rn = null;
            if ($sourceType === 'RN') {
                if ($rnCode === '') {
                    DB::rollBack();

                    return response()->json([
                        'status' => 'error',
                        'message' => 'RN Number is required when creating BPB from Receive Note.',
                        'errors' => ['rn_number' => ['Please select an RN Number to create BPB.']],
                    ], 422);
                }

                $cleanRn = preg_replace('/[^A-Za-z0-9]/', '', $rnCode);
                $rn = ReceiveNote::where('rn_number', $rnCode)
                    ->orWhereRaw("REPLACE(REPLACE(rn_number, '/', ''), '-', '') = ?", [$cleanRn])
                    ->first();

                if (! $rn) {
                    DB::rollBack();

                    return response()->json([
                        'status' => 'error',
                        'message' => "Receive Note '{$rnCode}' not found. BPB from RN requires an existing Receive Note.",
                        'errors' => ['rn_number' => ['The selected RN does not exist in the database.']],
                    ], 422);
                }

                if ($rn->status !== 'Approved') {
                    DB::rollBack();

                    return response()->json([
                        'status' => 'error',
                        'message' => "Receive Note '{$rnCode}' has not been approved yet (Current status: {$rn->status}). Only approved Receive Notes can be received into warehouse.",
                        'errors' => ['rn_number' => ["Receive Note '{$rnCode}' must be Approved before creating a BPB."]],
                    ], 422);
                }

                // Double BPB Prevention for RN
                $existingBpb = BpbReceiveMaterial::where('status', '!=', 'Rejected')
                    ->whereHas('mappings.purchaseOrderReceiveNote', function ($q) use ($rn) {
                        $q->where('receive_note_id', $rn->id);
                    })
                    ->first();

                if ($existingBpb) {
                    DB::rollBack();

                    return response()->json([
                        'status' => 'error',
                        'message' => "Receive Note '{$rnCode}' has already been processed in BPB '{$existingBpb->bpb_number}'. Duplicate material receipt (Double BPB) is not allowed.",
                        'errors' => ['rn_number' => ["Receive Note '{$rnCode}' has already been processed in BPB '{$existingBpb->bpb_number}'."]],
                    ], 422);
                }
            } else {
                // Direct PO -> BPB: resolve all referenced POs and validate Approved + Non-Kawasan Berikat
                $referencedPoIds = collect();
                if ($headerPo) {
                    $referencedPoIds->push($headerPo->id);
                }
                if (is_array($rawItems)) {
                    foreach ($rawItems as $it) {
                        $itPoCode = trim((string) ($it['poNumber'] ?? $it['po_number'] ?? ''));
                        if ($itPoCode !== '' && $itPoCode !== '—' && $itPoCode !== '-') {
                            $cleanItPo = preg_replace('/[^A-Za-z0-9]/', '', $itPoCode);
                            $matched = PurchaseOrder::where('po_number', $itPoCode)
                                ->orWhereRaw("REPLACE(REPLACE(po_number, '/', ''), '-', '') = ?", [$cleanItPo])
                                ->first();
                            if (! $matched) {
                                DB::rollBack();

                                return response()->json([
                                    'status' => 'error',
                                    'message' => "Purchase Order '{$itPoCode}' not found.",
                                    'errors' => ['po_number' => ["Purchase Order '{$itPoCode}' not found."]],
                                ], 422);
                            }
                            $referencedPoIds->push($matched->id);
                            if (! $headerPo) {
                                $headerPo = $matched;
                                $supplierId = $matched->supliers_id ?: $supplierId;
                            }
                        }
                    }
                }

                $referencedPoIds = $referencedPoIds->unique()->values();
                if ($referencedPoIds->isEmpty()) {
                    DB::rollBack();

                    return response()->json([
                        'status' => 'error',
                        'message' => 'PO Number is required when creating direct BPB from Purchase Order.',
                        'errors' => ['po_number' => ['Please select an Approved Non-Kawasan Berikat Purchase Order.']],
                    ], 422);
                }

                $referencedPos = PurchaseOrder::with('items')->whereIn('id', $referencedPoIds)->get();
                foreach ($referencedPos as $refPo) {
                    if (! in_array($refPo->status, ['Approved', 'Approved 2'], true)) {
                        DB::rollBack();

                        return response()->json([
                            'status' => 'error',
                            'message' => "Purchase Order '{$refPo->po_number}' is not fully Approved yet (Current status: {$refPo->status}).",
                            'errors' => ['po_number' => ["Purchase Order '{$refPo->po_number}' must be Approved before receiving into BPB."]],
                        ], 422);
                    }

                    if ($refPo->isKawasanBerikat()) {
                        DB::rollBack();

                        return response()->json([
                            'status' => 'error',
                            'message' => "Purchase Order '{$refPo->po_number}' is a Kawasan Berikat PO and must go through Receive Note (EXIM) before Receive Material (BPB).",
                            'errors' => ['po_number' => ["PO '{$refPo->po_number}' is Kawasan Berikat and requires a Receive Note (RN)."]],
                        ], 422);
                    }

                    // Prevent duplicate/over-receiving direct PO items
                    $orderedTotal = (float) $refPo->items->sum('order');
                    if ($orderedTotal > 0) {
                        $alreadyReceived = (float) DB::table('purchase_order_has_receive_note as porn')
                            ->join('po_rn_to_bpb as pb', 'pb.po_has_rn_id', '=', 'porn.id')
                            ->join('bpb_receive_material as bpb', 'pb.bpb_receive_material_id', '=', 'bpb.id')
                            ->where('porn.purchase_order_id', $refPo->id)
                            ->where('bpb.status', '!=', 'Rejected')
                            ->whereNull('porn.deleted_at')
                            ->whereNull('bpb.deleted_at')
                            ->sum(DB::raw('GREATEST(0, porn.quantity - COALESCE(porn.rafaksi, 0))'));

                        $incomingTotal = is_array($rawItems) ? collect($rawItems)->sum(function ($it) use ($refPo) {
                            $p = trim((string) ($it['poNumber'] ?? $it['po_number'] ?? $refPo->po_number));
                            $cleanP = preg_replace('/[^A-Za-z0-9]/', '', $p);
                            $cleanRef = preg_replace('/[^A-Za-z0-9]/', '', $refPo->po_number);
                            if ($cleanP !== '' && $cleanP !== $cleanRef) {
                                return 0;
                            }
                            $q = (float) ($it['receiveQty'] ?? $it['quantity'] ?? $it['qty'] ?? 0);
                            $r = (float) ($it['rafaksi'] ?? 0);

                            return max(0.0, $q - $r);
                        }) : 0.0;

                        if ($alreadyReceived >= $orderedTotal - 0.0001 || ($alreadyReceived + $incomingTotal) > $orderedTotal + 0.0001) {
                            DB::rollBack();

                            return response()->json([
                                'status' => 'error',
                                'message' => "Purchase Order '{$refPo->po_number}' quantity already received or exceeded (Ordered: {$orderedTotal}, Already Received: {$alreadyReceived}, Incoming: {$incomingTotal}).",
                                'errors' => ['po_number' => ["PO '{$refPo->po_number}' exceeds remaining receivable quantity."]],
                            ], 422);
                        }
                    }
                }
            }

            $firstSj = $request->input('sj_number') ?? $request->input('delivery_note');
            if (! $firstSj && is_array($rawItems) && ! empty($rawItems)) {
                $firstSj = $rawItems[0]['deliveryNote'] ?? $rawItems[0]['dn_number'] ?? $rawItems[0]['sjNumber'] ?? null;
            }

            $invoiceDate = null;
            $rawInvDate = $request->input('invoice_date') ?? $request->input('invoiceDate');
            if (! empty($rawInvDate)) {
                try {
                    $invoiceDate = Carbon::parse($rawInvDate);
                } catch (\Throwable $e) {
                    $invoiceDate = null;
                }
            }

            $regDate = null;
            $rawRegDate = $request->input('reg_date') ?? $request->input('regDate');
            if (! empty($rawRegDate)) {
                try {
                    $regDate = Carbon::parse($rawRegDate);
                } catch (\Throwable $e) {
                    $regDate = null;
                }
            }

            $ajuNumber = $request->input('aju_number') ?? $request->input('ajuNumber');
            $noPen = $request->input('no_pen') ?? $request->input('noPen');
            $plateNo = $request->input('plate_no') ?? $request->input('plateNo') ?? $request->input('license_plate');
            $invoiceNumber = $request->input('invoice_number') ?? $request->input('invoiceNumber');
            $taxInvoice = $request->input('tax_invoice') ?? $request->input('taxInvoice');

            // Update optional customs/logistics metadata on the Receive Note if RN mode
            if ($rn) {
                $rnUpdates = [];
                if ($invoiceNumber) {
                    $rnUpdates['invoice_number'] = $invoiceNumber;
                }
                if ($invoiceDate) {
                    $rnUpdates['invoice_date'] = $invoiceDate;
                }
                if ($taxInvoice) {
                    $rnUpdates['tax_invoice'] = $taxInvoice;
                }
                if ($plateNo) {
                    $rnUpdates['license_plate'] = $plateNo;
                }
                if ($firstSj) {
                    $rnUpdates['sj_number'] = $firstSj;
                }
                if ($noPen) {
                    $rnUpdates['pl_number'] = $noPen;
                }
                if ($ajuNumber) {
                    $rnUpdates['note'] = $ajuNumber;
                }
                if (! empty($rnUpdates)) {
                    $rn->update($rnUpdates);
                }
            }

            $noteText = $request->input('note') ?? $request->input('remark');
            if (! $noteText && is_array($rawItems) && ! empty($rawItems)) {
                $noteText = $rawItems[0]['purpose'] ?? $rawItems[0]['remark'] ?? null;
            }

            $bpb = BpbReceiveMaterial::create([
                'bpb_number' => $bpbNumber,
                'source_type' => $sourceType,
                'status' => 'Waiting for Approve 1',
                'note' => $noteText ?: ($sourceType === 'PO' ? 'Direct physical receipt from Non-Kawasan Berikat PO' : 'Inbound physical receipt from logistics'),
                'receive_date' => $receiveDate,
                'creator_id' => $creatorId,
                'updated_by' => $creatorId,
            ]);

            $defaultWarehouseId = (int) ($request->input('warehouse_id') ?: (Warehouse::first()?->id ?? 1));
            $defaultJobId = JobNumber::first()?->id ?? 1;
            $defaultPoId = $headerPo?->id ?? (PurchaseOrder::orderBy('id', 'desc')->first()?->id ?? 1);

            if (is_array($rawItems) && count($rawItems) > 0) {
                foreach ($rawItems as $itemData) {
                    // Resolve PO for item line
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

                    // Resolve Warehouse for item line
                    $itemWhId = $defaultWarehouseId;
                    if (! empty($itemData['warehouse_id']) && is_numeric($itemData['warehouse_id'])) {
                        $itemWhId = (int) $itemData['warehouse_id'];
                    } elseif (! empty($itemData['location']) || ! empty($itemData['warehouse'])) {
                        $locName = trim((string) ($itemData['location'] ?? $itemData['warehouse']));
                        $matchedWh = Warehouse::where('name', $locName)
                            ->orWhere('name', 'like', "%{$locName}%")
                            ->first();
                        if ($matchedWh) {
                            $itemWhId = $matchedWh->id;
                        }
                    }

                    // Resolve JobNumber for item line
                    $itemJobId = $defaultJobId;
                    $jobCode = $itemData['jobNumber'] ?? $itemData['job_number'] ?? null;
                    if (! empty($jobCode) && $jobCode !== '—' && $jobCode !== '-') {
                        $matchedJob = JobNumber::where('code', $jobCode)
                            ->orWhere('name', 'like', "%{$jobCode}%")
                            ->first();
                        if ($matchedJob) {
                            $itemJobId = $matchedJob->id;
                        }
                    }

                    $itemName = trim((string) ($itemData['name'] ?? $itemData['itemName'] ?? $itemData['item_name'] ?? 'Material Item'));
                    $qty = (float) ($itemData['receiveQty'] ?? $itemData['quantity'] ?? $itemData['qty'] ?? 1);
                    $rafaksi = (float) ($itemData['rafaksi'] ?? 0);
                    $dnNumber = $itemData['deliveryNote'] ?? $itemData['dn_number'] ?? $itemData['sjNumber'] ?? $firstSj ?? 'SJ-'.date('Ymd');

                    $resolvedPoHasItemId = null;
                    if (! empty($itemData['po_has_items_id']) && is_numeric($itemData['po_has_items_id'])) {
                        $resolvedPoHasItemId = (int) $itemData['po_has_items_id'];
                    }

                    $poRn = null;
                    if ($rn) {
                        if (! empty($itemData['po_has_rn_id']) && is_numeric($itemData['po_has_rn_id'])) {
                            $poRn = PurchaseOrderReceiveNote::where('id', (int) $itemData['po_has_rn_id'])
                                ->where('receive_note_id', $rn->id)
                                ->first();
                        }
                        if (! $poRn) {
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
                        $poRn = PurchaseOrderReceiveNote::create([
                            'purchase_order_id' => $itemPoId,
                            'po_has_items_id' => $resolvedPoHasItemId,
                            'receive_note_id' => $rn?->id,
                            'dn_number' => $dnNumber,
                            'job_number_id' => $itemJobId,
                            'item_name' => $itemName,
                            'quantity' => $qty,
                            'rafaksi' => $rafaksi,
                            'price' => (float) ($itemData['price'] ?? 0),
                            'additional_price' => 0,
                            'discount' => 0,
                            'ppn' => 0,
                            'grand_total' => 0,
                        ]);
                    }

                    $bpb->mappings()->create([
                        'po_has_rn_id' => $poRn->id,
                        'warehouses_id' => $itemWhId,
                    ]);

                    // Allocate and synchronize stock in the user's selected destination warehouse
                    $targetItem = Item::where('name', $itemName)
                        ->orWhere('code', $itemName)
                        ->orWhere('external_code', $itemName)
                        ->orWhere('name', 'like', "%{$itemName}%")
                        ->first();

                    if (! $targetItem && ! empty($itemData['code'])) {
                        $targetItem = Item::where('code', $itemData['code'])
                            ->orWhere('external_code', $itemData['code'])
                            ->first();
                    }

                    if ($targetItem) {
                        $netQty = max(0.0, $qty - $rafaksi);
                        $stockRow = DB::table('warehouse_stocks')
                            ->where('items_id', $targetItem->id)
                            ->where('warehouses_id', $itemWhId)
                            ->first();

                        if ($stockRow) {
                            DB::table('warehouse_stocks')->where('id', $stockRow->id)->update([
                                'quantity' => DB::raw("quantity + {$netQty}"),
                                'available_quantity' => DB::raw("available_quantity + {$netQty}"),
                                'lot_number' => $dnNumber ?: $stockRow->lot_number,
                                'last_movement_date' => $receiveDate,
                                'updated_at' => now(),
                            ]);
                        } else {
                            DB::table('warehouse_stocks')->insert([
                                'items_id' => $targetItem->id,
                                'warehouses_id' => $itemWhId,
                                'coordinate_name' => 'A-01-01',
                                'quantity' => $netQty,
                                'available_quantity' => $netQty,
                                'allocated_quantity' => 0,
                                'lot_number' => $dnNumber ?: 'LOT-'.date('Ymd'),
                                'location_type' => 'Warehouse',
                                'last_movement_date' => $receiveDate,
                                'created_at' => now(),
                                'updated_at' => now(),
                            ]);
                        }

                        $totalStock = DB::table('warehouse_stocks')->where('items_id', $targetItem->id)->sum('quantity');
                        $targetItem->update(['stock' => $totalStock]);
                    }
                }
            } elseif ($rn && $rn->purchaseOrders()->count() > 0) {
                foreach ($rn->purchaseOrders as $poRn) {
                    $bpb->mappings()->create([
                        'po_has_rn_id' => $poRn->id,
                        'warehouses_id' => $defaultWarehouseId,
                    ]);
                }
            } else {
                // Fallback if no items array and RN had no items: populate from headerPo items or default
                if ($headerPo && $headerPo->items()->count() > 0) {
                    foreach ($headerPo->items as $poItem) {
                        $itName = $poItem->requisitionItem?->item?->name ?? $poItem->item_alias ?? 'Material Item';
                        $poRn = PurchaseOrderReceiveNote::create([
                            'purchase_order_id' => $headerPo->id,
                            'po_has_items_id' => $poItem->id,
                            'receive_note_id' => $rn?->id,
                            'dn_number' => $firstSj ?: 'SJ-'.date('Ymd'),
                            'job_number_id' => $poItem->requisitionItem?->job_number_id ?? $defaultJobId,
                            'item_name' => $itName,
                            'quantity' => (float) ($poItem->order ?? 1),
                            'rafaksi' => 0,
                            'price' => (float) ($poItem->price ?? 0),
                            'additional_price' => 0,
                            'discount' => 0,
                            'ppn' => 0,
                            'grand_total' => 0,
                        ]);

                        $bpb->mappings()->create([
                            'po_has_rn_id' => $poRn->id,
                            'warehouses_id' => $defaultWarehouseId,
                        ]);
                    }
                } else {
                    $poRn = PurchaseOrderReceiveNote::create([
                        'purchase_order_id' => $defaultPoId,
                        'receive_note_id' => $rn?->id,
                        'dn_number' => $firstSj ?: 'SJ-'.date('Ymd'),
                        'job_number_id' => $defaultJobId,
                        'item_name' => 'General Inbound Material',
                        'quantity' => 1.0,
                        'rafaksi' => 0,
                        'price' => 0,
                        'additional_price' => 0,
                        'discount' => 0,
                        'ppn' => 0,
                        'grand_total' => 0,
                    ]);

                    $bpb->mappings()->create([
                        'po_has_rn_id' => $poRn->id,
                        'warehouses_id' => $defaultWarehouseId,
                    ]);
                }
            }

            // Create initial approval tier
            $bpb->approvals()->create([
                'approval_ke' => '1',
                'users_id' => $creatorId,
                'status' => 0,
            ]);

            // Audit Log
            GeniusOneBackend::audit()->logAction(
                action: 'created',
                modelName: 'BpbReceiveMaterial',
                modelId: $bpb->id,
                after: $bpb->toArray(),
                notes: "Created Warehouse Receive Material {$bpbNumber}"
            );

            DB::commit();

            $freshBpb = $bpb->fresh([
                'creator',
                'approvals.user',
                'mappings.warehouse',
                'mappings.purchaseOrderReceiveNote.purchaseOrder.supplier',
                'mappings.purchaseOrderReceiveNote.purchaseOrder.items.requisitionItem.purchaseRequisition',
                'mappings.purchaseOrderReceiveNote.purchaseOrder.items.requisitionItem.item.unitOfMeasurement',
                'mappings.purchaseOrderReceiveNote.receiveNote.supplier',
                'mappings.purchaseOrderReceiveNote.jobNumber',
            ]);

            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'status' => 'success',
                    'message' => "BPB {$bpbNumber} created successfully.",
                    'data' => $this->formatWarehouseRow($freshBpb),
                ], 201);
            }

            return redirect('/warehouse/incoming/receive-material-bpb/detail/'.str_replace('/', '-', $bpbNumber));
        } catch (\Throwable $e) {
            DB::rollBack();
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json(['status' => 'error', 'message' => $e->getMessage(), 'error' => $e->getMessage()], 422);
            }

            return back()->withErrors(['error' => $e->getMessage()]);
        }
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
        $supplierName = $supplier ? $supplier->name : '—';
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

        $totalItem = max(1, $bpb->mappings->count());
        $materialName = $poRn?->item_name ?? 'Material Item';

        // Try to resolve item code & unit from Master Item or PO item
        $matchedMasterItem = Item::with('unitOfMeasurement')->where('name', $materialName)->first()
            ?? $firstPoItem?->requisitionItem?->item;
        $itemCode = $matchedMasterItem?->code ?? '—';
        $defaultUnit = $matchedMasterItem?->unitOfMeasurement?->code ?? $matchedMasterItem?->unitOfMeasurement?->name ?? 'PCE';

        $warehouseName = $firstMapping?->warehouse?->name ?? 'Gudang Sparepart';
        $creatorName = $bpb->creator?->name ?? 'System';
        $createdTime = $bpb->created_at ? $bpb->created_at->format('d-m-Y H:i') : '—';
        $receiveDateStr = $this->safeFormatDate($bpb->receive_date, 'd-m-Y', '—');

        $apprStatus = $bpb->status;

        $sjNumber = $poRn?->dn_number ?: ($rn?->sj_number ?: '—');
        $plateNo = $rn?->license_plate ?: '—';
        $noPen = $rn?->pl_number ?: '—';
        $ajuNumber = ($rn?->note && strlen($rn->note) >= 10 && is_numeric(substr($rn->note, 0, 6)))
            ? $rn->note
            : '—';
        $bcType = $rn ? 'BC 4.0' : 'Non-BC (Direct PO)';
        $bpbType = $sourceType === 'PO' ? 'Direct PO' : 'Warehouse';

        // Line Items
        $lineItems = $bpb->mappings->values()->map(function ($map, $mIdx) use ($bpb, $poNumber, $poDate, $prNumber, $prDate, $sjNumber, $defaultUnit) {
            $prn = $map->purchaseOrderReceiveNote;
            $itemPo = $prn?->purchaseOrder;
            $itemFirstPoLine = $itemPo?->items?->first();
            $itemPr = $itemFirstPoLine?->requisitionItem?->purchaseRequisition;

            $itName = $prn?->item_name ?? 'Mur Baut M 10 x 40 + ring pir';
            $itMaster = Item::with('unitOfMeasurement')->where('name', $itName)->first()
                ?? $itemFirstPoLine?->requisitionItem?->item;
            $itCode = $itMaster?->code ?? '60.149.301.404';
            $itUnit = $itMaster?->unitOfMeasurement?->code ?? $defaultUnit;

            $qty = (float) ($prn?->quantity ?? 25.0);
            $raf = (float) ($prn?->rafaksi ?? 0.0);
            $net = max(0, $qty - $raf);

            return [
                'no' => $mIdx + 1,
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
                'quantity' => number_format($net, 2).' '.$itUnit,
                'rawQty' => $net,
                'grossQty' => number_format($qty, 2).' '.$itUnit,
                'rafaksi' => number_format($raf, 2).' '.$itUnit,
                'unit' => $itUnit,
                'remark' => $bpb->note ?? 'Operational Receipt',
                'purpose' => $bpb->note ?? 'Operational Receipt',
                'warehouse' => $map->warehouse?->name ?? 'Gudang Sparepart',
                'location' => $map->warehouse?->name ?? 'Gudang Sparepart',
                'warehouseLocation' => $map->warehouse?->name ?? 'Gudang Sparepart',
                'deliveryNote' => $prn?->dn_number ?: $sjNumber,
                'receiveQty' => $net,
            ];
        })->toArray();

        $poFacility = $po?->facility_status ?? ($firstPoItem?->item?->facility?->name ?? 'FASILITAS');
        $bpbFacility = stripos((string) $poFacility, 'non') !== false ? 'NON FASILITAS' : 'FASILITAS';

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
            '_rawTotal' => number_format($totalQty, 2).' '.$defaultUnit,
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
            '_rawInvoiceNumber' => $rn?->invoice_number ?? '-',
            '_rawInvoiceDate' => $this->safeFormatDate($rn?->invoice_date, 'd-m-Y', '-'),
            '_rawTaxInvoice' => $rn?->tax_invoice ?? '-',
            '_rawCurrency' => 'IDR',
            '_rawFacility' => $bpbFacility,
            'facility' => $bpbFacility,
            'statusFacility' => $bpbFacility,
            'bpbType' => $bpbType,
            '_rawBpbType' => $bpbType,
            'sourceType' => $sourceType,
            'source_type' => $sourceType,
            '_rawWarehouseLocation' => $warehouseName,
            'material' => $materialName,
            '_rawMaterialName' => $materialName,
            'itemCode' => $itemCode,
            '_rawMaterialCode' => $itemCode,
            'totalItem' => $totalItem,
            '_rawTotalItem' => (string) $totalItem,
            'totalQuantity' => number_format($totalQty, 2),
            '_rawTotalQty' => number_format($totalQty, 2),
            '_totalQty' => number_format($totalQty, 2).' '.$defaultUnit,
            'created' => "{$creatorName} ({$createdTime})",
            'createdBy' => $creatorName,
            '_rawCreatedBy' => $creatorName,
            '_rawCreatedAt' => $createdTime,
            'lastUpdated' => $createdTime,
            '_rawLastUpdated' => "{$creatorName} {$createdTime}",
            '_rawRemark' => $bpb->note ?? 'Penerimaan Material Produksi Gudang',
            'items' => $lineItems,
            '_items' => $lineItems,
            'approvals' => $bpb->approvals->map(fn ($a) => [
                'tier' => (int) $a->approval_ke,
                'status' => $a->status === 1 ? 'Approved' : ($a->status === 2 ? 'Rejected' : 'Pending'),
                'user' => $a->user?->name ?? 'System',
                'date' => $a->updated_at?->format('d-m-Y H:i') ?? '-',
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
