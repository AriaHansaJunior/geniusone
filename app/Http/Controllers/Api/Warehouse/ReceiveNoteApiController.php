<?php

namespace App\Http\Controllers\Api\Warehouse;

use App\Http\Controllers\Controller;
use App\Models\Master\Partner\Supplier;
use App\Models\Procurement\PurchaseOrder\PurchaseOrder;
use App\Models\Warehouse\GateReceiving\ReceiveNote;
use App\Services\GeniusOneBackend;
use App\ViewModels\ReceiveNoteViewModel;
use Illuminate\Http\Request;

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
     * Store newly created Receive Note (Surat Penerimaan Barang Gerbang).
     */
    public function store(Request $request)
    {
        $userId = $request->user()?->id ?? 1;

        // Resolve Supplier ID
        $supInput = $request->input('supliers_id') ?? $request->input('supplier') ?? $request->input('supplier_id');
        $supId = null;
        if (is_numeric($supInput) && Supplier::where('id', $supInput)->exists()) {
            $supId = (int) $supInput;
        } elseif (! empty($supInput)) {
            $cleaned = preg_replace('/^sup-?/i', '', (string) $supInput);
            if (is_numeric($cleaned) && Supplier::where('id', $cleaned)->exists()) {
                $supId = (int) $cleaned;
            } else {
                $sup = Supplier::where('code', $supInput)->orWhere('name', 'like', "%{$supInput}%")->first();
                $supId = $sup?->id;
            }
        }
        if (! $supId) {
            $supId = Supplier::first()?->id ?? 1;
        }

        // Resolve Items
        $rawItems = $request->input('items', []);
        $firstApprovedPo = PurchaseOrder::whereIn('status', ['Approved', 'Approved 2'])->first();
        $fallbackPoId = $firstApprovedPo?->id ?? PurchaseOrder::first()?->id ?? 1;

        $processedItems = [];
        if (! empty($rawItems)) {
            foreach ($rawItems as $it) {
                $poId = null;
                if (! empty($it['purchase_order_id']) && is_numeric($it['purchase_order_id'])) {
                    $poId = (int) $it['purchase_order_id'];
                } elseif (! empty($it['poNumber']) || ! empty($it['po_number'])) {
                    $poCode = $it['poNumber'] ?? $it['po_number'];
                    if ($poCode !== '—' && $poCode !== '-') {
                        $poObj = PurchaseOrder::where('po_number', $poCode)->first();
                        $poId = $poObj?->id;
                    }
                }
                if (! $poId) {
                    $poId = $fallbackPoId;
                }

                $processedItems[] = [
                    'purchase_order_id' => $poId,
                    'po_has_items_id' => ! empty($it['po_has_items_id']) ? (int) $it['po_has_items_id'] : null,
                    'quantity' => (float) ($it['quantity'] ?? $it['suratJalanQty'] ?? 1),
                    'item_name' => $it['item_name'] ?? $it['itemName'] ?? 'Material Item',
                    'job_number_id' => ! empty($it['job_number_id']) ? (int) $it['job_number_id'] : null,
                    'rafaksi' => (float) ($it['rafaksi'] ?? 0),
                    'price' => (float) ($it['price'] ?? 0),
                    'remark' => ! empty($it['remark']) ? $it['remark'] : ($it['note'] ?? null),
                ];
            }
        } else {
            $processedItems[] = [
                'purchase_order_id' => $fallbackPoId,
                'quantity' => 1.0,
                'item_name' => 'General Material Receipt',
            ];
        }

        $arrivalDate = $this->sanitizeDate($request->input('arrival_date') ?? $request->input('arrivalDate')) ?? date('Y-m-d');
        $invoiceDate = $this->sanitizeDate($request->input('invoice_date') ?? $request->input('invoiceDate'));
        $taxInvoiceDate = $this->sanitizeDate($request->input('tax_invoice_date') ?? $request->input('taxInvoiceDate'));
        $sjDate = $this->sanitizeDate($request->input('sj_date') ?? $request->input('sjDate') ?? $request->input('tanggalSuratJalan') ?? $request->input('tanggalPackingList'));
        $plDate = $this->sanitizeDate($request->input('pl_date') ?? $request->input('plDate') ?? $request->input('tanggalPackingList'));

        $rawSjNum = $request->input('sj_number') ?? $request->input('sjNumber') ?? $request->input('nomorSuratJalan');
        $rawPlNum = $request->input('pl_number') ?? $request->input('plNumber') ?? $request->input('nomorPackingList');

        $headerData = [
            'rn_number' => $request->input('rn_number') ?? $request->input('rnNumber'),
            'supliers_id' => $supId,
            'currencies_id' => (int) ($request->input('currencies_id') ?? 1),
            'rate' => (float) ($request->input('rate') ?? 1.0),
            'arrival_date' => $arrivalDate,
            'invoice_number' => !empty($request->input('invoice_number')) ? $request->input('invoice_number') : ($request->input('invoiceNumber') ?: null),
            'invoice_date' => $invoiceDate,
            'tax_invoice' => !empty($request->input('tax_invoice')) ? $request->input('tax_invoice') : ($request->input('taxInvoiceNumber') ?: null),
            'tax_invoice_date' => $taxInvoiceDate,
            'license_plate' => !empty($request->input('license_plate')) ? $request->input('license_plate') : ($request->input('licensePlate') ?: null),
            'note' => !empty($request->input('note')) ? $request->input('note') : ($request->input('notes') ?: ($request->input('description') ?: ($request->input('remark') ?: null))),
            'sj_number' => !empty($rawSjNum) && $rawSjNum !== '-' ? $rawSjNum : ($rawPlNum ?: null),
            'sj_date' => $sjDate,
            'pl_number' => !empty($rawPlNum) && $rawPlNum !== '-' ? $rawPlNum : null,
            'pl_date' => $plDate,
            'dn_status' => $request->has('dn_status') ? (int) $request->input('dn_status') : (stripos((string) $request->input('facility', ''), 'non') === false ? 1 : 0),
            'service_subkon' => (int) ($request->input('service_subkon') ? 1 : 0),
        ];

        $rn = GeniusOneBackend::warehouse()->createReceiveNote($headerData, $processedItems, $userId);

        return response()->json([
            'status' => 'success',
            'message' => 'Receive Note created successfully',
            'data' => (new ReceiveNoteViewModel($rn))->toArray(),
        ], 201);
    }

    /**
     * Approve Receive Note.
     */
    public function approve(Request $request, int $id)
    {
        $userId = $request->user()?->id ?? 1;
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
        $userId = $request->user()?->id ?? 1;
        $tier = (int) $request->input('tier', 1);
        $reason = $request->input('reason', 'Rejected at gate inspection');

        $rn = GeniusOneBackend::warehouse()->rejectRn($id, $userId, $tier, $reason);

        return response()->json([
            'message' => 'Receive Note rejected successfully',
            'data' => (new ReceiveNoteViewModel($rn))->toArray(),
        ]);
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
