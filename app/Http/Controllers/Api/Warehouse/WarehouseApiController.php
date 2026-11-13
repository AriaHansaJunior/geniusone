<?php

namespace App\Http\Controllers\Api\Warehouse;

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
            ['Registered suppliers', (string) $suppliersCount, 'Supplying incoming materials'],
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
            ->selectRaw('porn.po_has_items_id, SUM(GREATEST(0, porn.quantity - COALESCE(porn.rafaksi, 0))) as received_qty')
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
        $rawCode = str_replace('-', '/', $code);
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

            $creatorId = $this->requireActorId($request);

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

            $bpbType = $request->input('bpb_type') ?? $request->input('bpbType') ?? ($sourceType === 'PO' ? 'Direct PO' : 'Warehouse');

            $bpb = BpbReceiveMaterial::create([
                'bpb_number' => $bpbNumber,
                'source_type' => $sourceType,
                'bpb_type' => $bpbType,
                'status' => 'Waiting for Approve 1',
                'note' => $noteText ?: null,
                'receive_date' => $receiveDate,
                'creator_id' => $creatorId,
                'updated_by' => $creatorId,
            ]);

            $headerWarehouseId = $this->resolveWarehouseId(
                $request->input('warehouse_id') ?? $request->input('warehouse') ?? $request->input('location')
            );
            $fallbackJobId = JobNumber::query()->value('id');
            $defaultPoId = $headerPo?->id;

            if (is_array($rawItems) && count($rawItems) > 0) {
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

                    $itemWhId = $this->resolveWarehouseId(
                        $itemData['warehouse_id'] ?? $itemData['warehouse'] ?? $itemData['location'] ?? null
                    ) ?? $headerWarehouseId;

                    if (! $itemWhId) {
                        throw new InvalidArgumentException('Each BPB item line must specify a valid destination Warehouse.');
                    }

                    $itemCoordinate = $this->resolveWarehouseCoordinate(
                        $itemWhId,
                        $itemData['warehouse_coordinates_id'] ?? $itemData['coordinate_id'] ?? $request->input('warehouse_coordinates_id'),
                        $itemData['coordinate'] ?? $itemData['coordinate_name'] ?? $request->input('coordinate')
                    );

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
                    $request->input('warehouse_coordinates_id'),
                    $request->input('coordinate')
                );
                foreach ($rn->purchaseOrders as $poRn) {
                    $bpb->mappings()->create([
                        'po_has_rn_id' => $poRn->id,
                        'warehouses_id' => $headerWarehouseId,
                        'warehouse_coordinates_id' => $headerCoordinate?->id,
                    ]);
                }
            } elseif ($headerPo && $headerPo->items()->count() > 0) {
                if (! $headerWarehouseId) {
                    throw new InvalidArgumentException('Destination Warehouse is required when creating direct BPB from Purchase Order.');
                }
                $headerCoordinate = $this->resolveWarehouseCoordinate(
                    $headerWarehouseId,
                    $request->input('warehouse_coordinates_id'),
                    $request->input('coordinate')
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

            // Audit Log
            GeniusOneBackend::audit()->logAction(
                action: 'created',
                modelName: 'BpbReceiveMaterial',
                modelId: $bpb->id,
                after: $bpb->toArray(),
                notes: "Created Warehouse Receive Material {$bpbNumber}",
                userId: $creatorId
            );

            DB::commit();

            $freshBpb = $bpb->fresh([
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

                        $whId = $this->resolveWarehouseId(
                            $itemData['warehouse_id'] ?? $itemData['warehouse'] ?? $itemData['location'] ?? $mapping->warehouses_id
                        ) ?? $mapping->warehouses_id;

                        $coord = $this->resolveWarehouseCoordinate(
                            $whId,
                            $itemData['warehouse_coordinates_id'] ?? $itemData['coordinate_id'] ?? null,
                            $itemData['coordinate'] ?? $itemData['coordinate_name'] ?? null
                        );

                        $mapping->update([
                            'warehouses_id' => $whId,
                            'warehouse_coordinates_id' => $coord?->id ?? $mapping->warehouse_coordinates_id,
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
        } catch (\Throwable $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 422);
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

    private function resolveWarehouseCoordinate(int $warehouseId, mixed $coordId = null, mixed $coordName = null): ?WarehouseCoordinate
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
