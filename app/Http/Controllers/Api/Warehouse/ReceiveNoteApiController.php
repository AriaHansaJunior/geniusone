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
        $validated = $request->validate([
            'rn_number' => 'nullable|string|max:100',
            'supliers_id' => 'required|exists:supliers,id',
            'currencies_id' => 'nullable|exists:currencies,id',
            'rate' => 'nullable|numeric',
            'arrival_date' => 'required|date',
            'invoice_number' => 'nullable|string|max:100',
            'invoice_date' => 'nullable|date',
            'tax_invoice' => 'nullable|string|max:100',
            'tax_invoice_date' => 'nullable|date',
            'license_plate' => 'nullable|string|max:45',
            'note' => 'nullable|string|max:255',
            'sj_number' => 'nullable|string|max:45',
            'sj_date' => 'nullable|date',
            'items' => 'required|array|min:1',
            'items.*.purchase_order_id' => 'required|exists:purchase_order,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.item_name' => 'nullable|string|max:255',
            'items.*.job_number_id' => 'nullable|exists:job_number,id',
            'items.*.rafaksi' => 'nullable|numeric',
            'items.*.price' => 'nullable|numeric',
        ]);

        $userId = $request->user()?->id ?? 1;

        $headerData = [
            'rn_number' => $validated['rn_number'] ?? null,
            'supliers_id' => $validated['supliers_id'],
            'currencies_id' => $validated['currencies_id'] ?? 1,
            'rate' => $validated['rate'] ?? 1.0,
            'arrival_date' => $validated['arrival_date'],
            'invoice_number' => $validated['invoice_number'] ?? null,
            'invoice_date' => $validated['invoice_date'] ?? null,
            'tax_invoice' => $validated['tax_invoice'] ?? null,
            'tax_invoice_date' => $validated['tax_invoice_date'] ?? null,
            'license_plate' => $validated['license_plate'] ?? null,
            'note' => $validated['note'] ?? null,
            'sj_number' => $validated['sj_number'] ?? null,
            'sj_date' => $validated['sj_date'] ?? null,
        ];

        $rn = GeniusOneBackend::warehouse()->createReceiveNote($headerData, $validated['items'], $userId);

        return response()->json([
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
