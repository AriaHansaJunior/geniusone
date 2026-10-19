<?php

namespace App\Http\Controllers\Api\Warehouse;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Warehouse\GateReceiving\ReceiveNote;
use App\ViewModels\ReceiveNoteViewModel;
use App\Services\GeniusOneBackend;
use Carbon\Carbon;

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
            'approvals.user',
        ]);

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('rn_number', 'like', "%{$s}%")
                  ->orWhere('license_plate', 'like', "%{$s}%")
                  ->orWhere('sj_number', 'like', "%{$s}%")
                  ->orWhereHas('supplier', fn($sq) => $sq->where('name', 'like', "%{$s}%"));
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
        $rn = ReceiveNote::with([
            'supplier',
            'currency',
            'updatedByUser',
            'purchaseOrders.purchaseOrder',
            'approvals.user',
        ])
        ->where('rn_number', $rawCode)
        ->orWhere('rn_number', $code)
        ->orWhere('id', is_numeric($code) ? $code : null)
        ->first();

        if (!$rn) {
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
        if (is_numeric($supInput) && \App\Models\Master\Partner\Supplier::where('id', $supInput)->exists()) {
            $supId = (int) $supInput;
        } elseif (!empty($supInput)) {
            $cleaned = preg_replace('/^sup-?/i', '', (string) $supInput);
            if (is_numeric($cleaned) && \App\Models\Master\Partner\Supplier::where('id', $cleaned)->exists()) {
                $supId = (int) $cleaned;
            } else {
                $sup = \App\Models\Master\Partner\Supplier::where('code', $supInput)->orWhere('name', 'like', "%{$supInput}%")->first();
                $supId = $sup?->id;
            }
        }
        if (!$supId) {
            $supId = \App\Models\Master\Partner\Supplier::first()?->id ?? 1;
        }

        // Resolve Items
        $rawItems = $request->input('items', []);
        $firstPo = \App\Models\Procurement\PurchaseOrder\PurchaseOrder::first();
        $fallbackPoId = $firstPo?->id ?? 1;

        $processedItems = [];
        if (!empty($rawItems)) {
            foreach ($rawItems as $it) {
                $poId = null;
                if (!empty($it['purchase_order_id']) && is_numeric($it['purchase_order_id'])) {
                    $poId = (int) $it['purchase_order_id'];
                } elseif (!empty($it['poNumber']) || !empty($it['po_number'])) {
                    $poCode = $it['poNumber'] ?? $it['po_number'];
                    $poObj = \App\Models\Procurement\PurchaseOrder\PurchaseOrder::where('po_number', $poCode)->first();
                    $poId = $poObj?->id;
                }
                if (!$poId) $poId = $fallbackPoId;

                $processedItems[] = [
                    'purchase_order_id' => $poId,
                    'quantity' => (float) ($it['quantity'] ?? $it['suratJalanQty'] ?? 1),
                    'item_name' => $it['item_name'] ?? $it['itemName'] ?? 'Material Item',
                    'job_number_id' => !empty($it['job_number_id']) ? (int) $it['job_number_id'] : null,
                    'rafaksi' => (float) ($it['rafaksi'] ?? 0),
                    'price' => (float) ($it['price'] ?? 0),
                ];
            }
        } else {
            $processedItems[] = [
                'purchase_order_id' => $fallbackPoId,
                'quantity' => 1.0,
                'item_name' => 'General Material Receipt',
            ];
        }

        $arrivalDate = $request->input('arrival_date') ?? $request->input('arrivalDate') ?? date('Y-m-d');
        if (str_contains($arrivalDate, '-') && strlen(explode('-', $arrivalDate)[0]) === 2) {
            $parts = explode('-', $arrivalDate);
            $arrivalDate = "{$parts[2]}-{$parts[1]}-{$parts[0]}";
        }

        $headerData = [
            'rn_number' => $request->input('rn_number') ?? $request->input('rnNumber'),
            'supliers_id' => $supId,
            'currencies_id' => (int) ($request->input('currencies_id') ?? 1),
            'rate' => (float) ($request->input('rate') ?? 1.0),
            'arrival_date' => $arrivalDate,
            'invoice_number' => $request->input('invoice_number') ?? $request->input('invoiceNumber'),
            'invoice_date' => $request->input('invoice_date') ?? $request->input('invoiceDate'),
            'tax_invoice' => $request->input('tax_invoice') ?? $request->input('taxInvoiceNumber'),
            'tax_invoice_date' => $request->input('tax_invoice_date') ?? $request->input('taxInvoiceDate'),
            'license_plate' => $request->input('license_plate') ?? $request->input('licensePlate'),
            'note' => $request->input('note') ?? $request->input('notes'),
            'sj_number' => $request->input('sj_number') ?? $request->input('nomorPackingList'),
            'sj_date' => $request->input('sj_date') ?? $request->input('tanggalPackingList'),
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
            'message' => "Receive Note rejected successfully",
            'data' => (new ReceiveNoteViewModel($rn))->toArray(),
        ]);
    }
}
