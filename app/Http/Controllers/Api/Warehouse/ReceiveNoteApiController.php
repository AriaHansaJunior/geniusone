<?php

namespace App\Http\Controllers\Api\Warehouse;

use App\Http\Controllers\Controller;
use App\Models\Master\Finance\Currency;
use App\Models\Master\Partner\Supplier;
use App\Models\Procurement\PurchaseOrder\PurchaseOrder;
use App\Models\Procurement\PurchaseOrder\PurchaseOrderItem;
use App\Models\Warehouse\GateReceiving\PurchaseOrderReceiveNote;
use App\Models\Warehouse\GateReceiving\ReceiveNote;
use App\Services\GeniusOneBackend;
use App\ViewModels\ReceiveNoteViewModel;
use Illuminate\Http\Request;
use InvalidArgumentException;

class ReceiveNoteApiController extends Controller
{
    /**
     * List Gate Receive Notes.
     */
    public function index(Request $request)
    {
        $query = ReceiveNote::with([
            'supplier',
            'currency',
            'updatedByUser',
            'purchaseOrders.purchaseOrder',
            'purchaseOrders.bpbMappings.bpbReceiveMaterial',
            'approvals.user',
        ]);

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('rn_number', 'like', "%{$s}%")
                    ->orWhere('license_plate', 'like', "%{$s}%")
                    ->orWhere('sj_number', 'like', "%{$s}%")
                    ->orWhereHas('supplier', fn ($sq) => $sq->where('name', 'like', "%{$s}%"));
            });
        }

        $records = $query->orderBy('id', 'desc')->get();

        $rows = $records->map(function ($rn) {
            return (new ReceiveNoteViewModel($rn))->toArray();
        });

        return response()->json([
            'status' => 'success',
            'total' => $records->count(),
            'rows' => $rows,
        ]);
    }

    /**
     * Show single Gate Receive Note detail.
     */
    public function show(Request $request, string $code)
    {
        $rawCode = str_replace('-', '/', $code);
        $cleanCode = preg_replace('/[^A-Za-z0-9]/', '', $code);
        $rn = ReceiveNote::with([
            'supplier',
            'currency',
            'updatedByUser',
            'purchaseOrders.purchaseOrder',
            'purchaseOrders.bpbMappings.bpbReceiveMaterial',
            'approvals.user',
        ])
            ->where('rn_number', $rawCode)
            ->orWhere('rn_number', $code)
            ->orWhere('id', is_numeric($code) ? $code : null)
            ->orWhereRaw("REPLACE(REPLACE(rn_number, '/', ''), '-', '') = ?", [$cleanCode])
            ->first();

        if (! $rn) {
            return response()->json(['error' => 'Receive Note not found'], 404);
        }

        $vm = new ReceiveNoteViewModel($rn);

        return response()->json([
            'status' => 'success',
            'item' => $vm->toArray(),
        ]);
    }

    /**
     * List Approved Kawasan Berikat Purchase Orders available for Receive Note creation.
     */
    public function availablePos()
    {
        $pos = PurchaseOrder::with([
            'supplier',
            'valuta',
            'items.requisitionItem.item.unit',
            'items.directItem.unit',
            'items.pph',
        ])
            ->whereIn('status', ['Approved', 'Approved 2'])
            ->orderByDesc('id')
            ->get()
            ->filter(fn (PurchaseOrder $po) => $po->isKawasanBerikat())
            ->values();

        $receivedByPoItem = PurchaseOrderReceiveNote::query()
            ->whereHas('receiveNote', fn ($q) => $q->where('status', '!=', 'Rejected'))
            ->selectRaw('po_has_items_id, SUM(quantity) as received_qty')
            ->groupBy('po_has_items_id')
            ->pluck('received_qty', 'po_has_items_id');

        $rows = [];
        foreach ($pos as $po) {
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
                    'items_id' => $masterItem?->id ?? $poItem->items_id,
                    'item_code' => $masterItem?->code,
                    'item_name' => $poItem->item_alias ?: ($masterItem?->name ?? ''),
                    'unit' => $masterItem?->unit?->nama ?? $masterItem?->unit?->name,
                    'job_number_id' => $poItem->prItem?->job_number_id,
                    'po_qty' => $ordered,
                    'received_qty' => $alreadyReceived,
                    'remaining_qty' => $remaining,
                    'price' => (float) $poItem->price,
                    'ppn' => (float) ($po->ppn_rate ?? 0),
                ];
            }

            if (empty($items)) {
                continue;
            }

            $rows[] = [
                'id' => $po->id,
                'po_number' => $po->po_number,
                'supplier_id' => $po->supliers_id,
                'supplier_name' => $po->supplier?->name,
                'currency' => $po->valuta?->name ?? 'IDR',
                'rate' => (float) ($po->rate ?? 1),
                'facility_status' => $po->facility_status ?: 'FASILITAS',
                'is_kawasan_berikat' => true,
                'items' => $items,
            ];
        }

        return response()->json([
            'status' => 'success',
            'total' => count($rows),
            'rows' => $rows,
        ]);
    }

    /**
     * Store newly created Receive Note (Surat Penerimaan Barang Gerbang).
     */
    public function store(Request $request)
    {
        $userId = $this->requireActorId($request);

        try {
            $supId = $this->resolveSupplierId(
                $request->input('supliers_id') ?? $request->input('supplier') ?? $request->input('supplier_id')
            );
            $processedItems = $this->resolveItems($request->input('items', []));
            $headerData = $this->buildHeaderData($request, $supId, $processedItems);
            $headerData['rn_number'] = $request->input('rn_number') ?? $request->input('rnNumber');

            $rn = GeniusOneBackend::warehouse()->createReceiveNote($headerData, $processedItems, $userId);

            return response()->json([
                'status' => 'success',
                'message' => 'Receive Note created successfully',
                'data' => (new ReceiveNoteViewModel($rn))->toArray(),
            ], 201);
        } catch (InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /**
     * Update an existing editable Receive Note.
     */
    public function update(Request $request, int $id)
    {
        $userId = $this->requireActorId($request);

        try {
            $rn = ReceiveNote::findOrFail($id);
            $supInput = $request->input('supliers_id') ?? $request->input('supplier') ?? $request->input('supplier_id');
            $supId = $supInput !== null && $supInput !== '' ? $this->resolveSupplierId($supInput) : (int) $rn->supliers_id;

            $processedItems = $request->has('items') ? $this->resolveItems($request->input('items', [])) : null;
            $headerData = $this->buildHeaderData($request, $supId, $processedItems ?? []);

            $updated = GeniusOneBackend::receiveNote()->updateReceiveNote($id, $headerData, $processedItems, $userId);

            return response()->json([
                'status' => 'success',
                'message' => 'Receive Note updated successfully',
                'data' => (new ReceiveNoteViewModel($updated))->toArray(),
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /**
     * Delete an unlocked Receive Note.
     */
    public function destroy(Request $request, int $id)
    {
        $this->requireActorId($request);

        try {
            GeniusOneBackend::receiveNote()->deleteReceiveNote($id);

            return response()->json([
                'status' => 'success',
                'message' => 'Receive Note deleted successfully',
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /**
     * Approve Receive Note.
     */
    public function approve(Request $request, int $id)
    {
        $userId = $this->requireActorId($request);
        $tier = (int) $request->input('tier', 1);
        $note = $request->input('note');

        $rn = GeniusOneBackend::warehouse()->approveRn($id, $userId, $tier, $note);

        return response()->json([
            'message' => "Receive Note Tier {$tier} approved successfully",
            'data' => (new ReceiveNoteViewModel($rn))->toArray(),
        ]);
    }

    /**
     * Reject Receive Note.
     */
    public function reject(Request $request, int $id)
    {
        $userId = $this->requireActorId($request);
        $tier = (int) $request->input('tier', 1);
        $reason = $request->input('reason', 'Rejected at gate inspection');

        $rn = GeniusOneBackend::warehouse()->rejectRn($id, $userId, $tier, $reason);

        return response()->json([
            'message' => 'Receive Note rejected successfully',
            'data' => (new ReceiveNoteViewModel($rn))->toArray(),
        ]);
    }

    protected function resolveSupplierId(mixed $supInput): int
    {
        if (is_numeric($supInput) && Supplier::where('id', $supInput)->exists()) {
            return (int) $supInput;
        }

        if (! empty($supInput)) {
            $cleaned = preg_replace('/^sup-?/i', '', (string) $supInput);
            if (is_numeric($cleaned) && Supplier::where('id', $cleaned)->exists()) {
                return (int) $cleaned;
            }

            $sup = Supplier::where('code', $supInput)
                ->orWhere('name', 'like', "%{$supInput}%")
                ->first();
            if ($sup) {
                return (int) $sup->id;
            }
        }

        throw new InvalidArgumentException('A valid Supplier is required.');
    }

    protected function resolveItems(array $rawItems): array
    {
        if (empty($rawItems)) {
            throw new InvalidArgumentException('At least one Purchase Order item is required to create a Receive Note.');
        }

        $processedItems = [];
        foreach ($rawItems as $it) {
            $poId = null;
            if (! empty($it['purchase_order_id']) && is_numeric($it['purchase_order_id'])) {
                $poId = (int) $it['purchase_order_id'];
            } elseif (! empty($it['poNumber']) || ! empty($it['po_number'])) {
                $poCode = (string) ($it['poNumber'] ?? $it['po_number']);
                if ($poCode !== '—' && $poCode !== '-') {
                    $poId = PurchaseOrder::where('po_number', $poCode)->value('id');
                }
            }

            if (! $poId) {
                throw new InvalidArgumentException('Each item must reference an existing Purchase Order.');
            }

            $poItem = null;
            if (! empty($it['po_has_items_id']) && is_numeric($it['po_has_items_id'])) {
                $poItem = PurchaseOrderItem::with(['prItem', 'directItem'])->find((int) $it['po_has_items_id']);
            } else {
                $candidateName = $it['item_name'] ?? $it['itemName'] ?? null;
                $poItem = PurchaseOrderItem::with(['prItem', 'directItem'])
                    ->where('purchase_order_id', $poId)
                    ->when($candidateName, function ($q) use ($candidateName) {
                        $q->where(function ($sub) use ($candidateName) {
                            $sub->where('item_alias', $candidateName)
                                ->orWhereHas('directItem', fn ($iq) => $iq->where('name', $candidateName))
                                ->orWhereHas('prItem.item', fn ($iq) => $iq->where('name', $candidateName));
                        });
                    })
                    ->first();
            }

            $itemQty = (float) ($it['quantity'] ?? $it['suratJalanQty'] ?? 0);
            if ($itemQty <= 0) {
                throw new InvalidArgumentException('Item receive quantity must be greater than zero.');
            }

            $itemName = $it['item_name'] ?? $it['itemName'] ?? $poItem?->item_alias ?? $poItem?->item?->name;
            if (empty($itemName)) {
                throw new InvalidArgumentException('Each Receive Note item must specify an item name or Purchase Order item.');
            }

            $itemPrice = (float) ($it['price'] ?? ($poItem?->price ?? 0));
            $itemSubtotal = ! empty($it['grand_total']) && (float) $it['grand_total'] > 0
                ? (float) $it['grand_total']
                : (! empty($it['subtotal']) && (float) $it['subtotal'] > 0
                    ? (float) $it['subtotal']
                    : (! empty($it['priceSubtotal']) && (float) $it['priceSubtotal'] > 0
                        ? (float) $it['priceSubtotal']
                        : ($itemQty * $itemPrice)));

            $processedItems[] = [
                'purchase_order_id' => $poId,
                'po_has_items_id' => $poItem?->id ?? (! empty($it['po_has_items_id']) ? (int) $it['po_has_items_id'] : null),
                'quantity' => $itemQty,
                'item_name' => $itemName,
                'job_number_id' => ! empty($it['job_number_id']) ? (int) $it['job_number_id'] : $poItem?->prItem?->job_number_id,
                'rafaksi' => (float) ($it['rafaksi'] ?? 0),
                'price' => $itemPrice,
                'ppn' => (float) ($it['ppn'] ?? 0),
                'grand_total' => $itemSubtotal,
                'remark' => ! empty($it['remark']) ? $it['remark'] : ($it['note'] ?? null),
            ];
        }

        return $processedItems;
    }

    protected function buildHeaderData(Request $request, int $supId, array $processedItems): array
    {
        $arrivalDate = $this->sanitizeDate($request->input('arrival_date') ?? $request->input('arrivalDate')) ?? date('Y-m-d');
        $invoiceDate = $this->sanitizeDate($request->input('invoice_date') ?? $request->input('invoiceDate'));
        $rawTaxInvoiceNum = $this->nullIfDash($request->input('tax_invoice') ?? $request->input('taxInvoiceNumber'));
        $taxInvoiceDate = $this->sanitizeDate($request->input('tax_invoice_date') ?? $request->input('taxInvoiceDate'));
        if (empty($taxInvoiceDate) && ! empty($rawTaxInvoiceNum)) {
            $taxInvoiceDate = $invoiceDate ?? $arrivalDate;
        }
        $sjDate = $this->sanitizeDate($request->input('sj_date') ?? $request->input('sjDate') ?? $request->input('tanggalSuratJalan') ?? $request->input('tanggalPackingList'));
        $plDate = $this->sanitizeDate($request->input('pl_date') ?? $request->input('plDate') ?? $request->input('tanggalPackingList'));

        $rawSjNum = $this->nullIfDash($request->input('sj_number') ?? $request->input('sjNumber') ?? $request->input('nomorSuratJalan'));
        $rawPlNum = $this->nullIfDash($request->input('pl_number') ?? $request->input('plNumber') ?? $request->input('nomorPackingList'));

        $currencyId = $this->resolveCurrencyId($request, $processedItems);
        $facility = $this->nullIfDash($request->input('facility'));
        $dnStatus = $request->has('dn_status')
            ? (int) $request->input('dn_status')
            : (stripos((string) $facility, 'non') === false ? 1 : 0);

        return [
            'supliers_id' => $supId,
            'currencies_id' => $currencyId,
            'rate' => (float) ($request->input('rate') ?? 1.0),
            'biaya_lain' => (float) ($request->input('biaya_lain') ?? $request->input('biayaLain') ?? 0),
            'discount_percent' => (float) ($request->input('discount_percent') ?? $request->input('discountPercent') ?? 0),
            'arrival_date' => $arrivalDate,
            'facility' => $facility ?? ($dnStatus === 1 ? 'FASILITAS' : 'NON FASILITAS'),
            'bc_code' => $this->nullIfDash($request->input('bc_code') ?? $request->input('bcCode')),
            'invoice_number' => $this->nullIfDash($request->input('invoice_number') ?? $request->input('invoiceNumber')),
            'invoice_date' => $invoiceDate,
            'tax_invoice' => $rawTaxInvoiceNum,
            'tax_invoice_date' => $taxInvoiceDate,
            'license_plate' => $this->nullIfDash($request->input('license_plate') ?? $request->input('licensePlate')),
            'vehicle_type' => $this->nullIfDash($request->input('vehicle_type') ?? $request->input('vehicleType')),
            'aju_number' => $this->nullIfDash($request->input('aju_number') ?? $request->input('ajuNumber')),
            'no_daftar' => $this->nullIfDash($request->input('no_daftar') ?? $request->input('noDaftar')),
            'tanggal_daftar' => $this->sanitizeDate($request->input('tanggal_daftar') ?? $request->input('tanggalDaftar')),
            'note' => $this->nullIfDash($request->input('note') ?? $request->input('notes') ?? $request->input('description') ?? $request->input('remark')),
            'remark' => $this->nullIfDash($request->input('remark') ?? $request->input('note') ?? $request->input('notes') ?? $request->input('description')),
            'sj_number' => $rawSjNum ?? $rawPlNum,
            'sj_date' => $sjDate,
            'pl_number' => $rawPlNum,
            'pl_date' => $plDate,
            'dn_status' => $dnStatus,
            'service_subkon' => (int) ($request->input('service_subkon') ? 1 : 0),
        ];
    }

    protected function resolveCurrencyId(Request $request, array $processedItems): int
    {
        $inputId = $request->input('currencies_id');
        if (is_numeric($inputId) && Currency::where('id', (int) $inputId)->exists()) {
            return (int) $inputId;
        }

        $code = $request->input('currency');
        if (! empty($code)) {
            $foundId = Currency::where('name', $code)->orWhere('code', $code)->value('id');
            if ($foundId) {
                return (int) $foundId;
            }
        }

        $firstPoId = $processedItems[0]['purchase_order_id'] ?? null;
        if ($firstPoId) {
            $po = PurchaseOrder::with('valuta')->find($firstPoId);
            $valutaName = $po?->valuta?->name;
            if ($valutaName) {
                $foundId = Currency::where('name', $valutaName)->orWhere('code', $valutaName)->value('id');
                if ($foundId) {
                    return (int) $foundId;
                }
            }
        }

        $fallbackId = Currency::where('code', 'IDR')->orWhere('name', 'IDR')->value('id') ?? Currency::query()->value('id');
        if (! $fallbackId) {
            throw new InvalidArgumentException('No Currency reference found in database.');
        }

        return (int) $fallbackId;
    }

    private function nullIfDash(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $trimmed = trim((string) $value);
        if ($trimmed === '' || $trimmed === '-' || $trimmed === '—') {
            return null;
        }

        return $trimmed;
    }

    /**
     * Sanitize and format date strings into Y-m-d or null.
     */
    private function sanitizeDate($date): ?string
    {
        if (empty($date) || $date === '-' || $date === '—') {
            return null;
        }
        $str = trim((string) $date);
        if ($str === '') {
            return null;
        }
        // If DD-MM-YYYY or DD/MM/YYYY
        if (preg_match('/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/', $str, $matches)) {
            $day = str_pad($matches[1], 2, '0', STR_PAD_LEFT);
            $month = str_pad($matches[2], 2, '0', STR_PAD_LEFT);
            $year = $matches[3];
            return "{$year}-{$month}-{$day}";
        }
        // If YYYY-MM-DD
        if (preg_match('/^\d{4}-\d{2}-\d{2}/', $str)) {
            return substr($str, 0, 10);
        }
        $parsed = strtotime($str);
        return $parsed ? date('Y-m-d', $parsed) : null;
    }
}
