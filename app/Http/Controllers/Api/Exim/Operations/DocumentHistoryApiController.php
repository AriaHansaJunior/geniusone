<?php

namespace App\Http\Controllers\Api\Exim\Operations;

use App\Http\Controllers\Controller;
use App\Models\Master\Customs\DocumentHistory;
use App\Models\Master\Customs\DocumentHistoryItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DocumentHistoryApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = DocumentHistory::with(['createdByUser', 'items']);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                    ->orWhere('transaction_number', 'like', "%{$search}%")
                    ->orWhere('customer_supplier', 'like', "%{$search}%")
                    ->orWhere('customs_document', 'like', "%{$search}%");
            });
        }

        $perPage = (int) $request->query('per_page', 10);
        $records = $query->latest('id')->paginate($perPage);

        return response()->json([
            'data' => $records->items(),
            'meta' => [
                'current_page' => $records->currentPage(),
                'last_page' => $records->lastPage(),
                'per_page' => $records->perPage(),
                'total' => $records->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'invoice_number' => 'required|string|max:100',
            'invoice_alias' => 'nullable|string|max:100',
            'invoice_date' => 'nullable|date',
            'transaction_number' => 'nullable|string|max:100',
            'mutation_type' => 'nullable|string|max:100',
            'customer_supplier' => 'required|string|max:255',
            'customer' => 'nullable|string|max:255',
            'destination' => 'nullable|string|max:255',
            'bl_number' => 'nullable|string|max:100',
            'currency' => 'nullable|string|max:45',
            'customs_document' => 'nullable|string|max:100',
            'amount' => 'nullable|numeric',
            'items' => 'required|array|min:1',
            'items.*.item_name' => 'required|string|max:255',
            'items.*.item_code' => 'nullable|string|max:100',
            'items.*.so_number' => 'nullable|string|max:100',
            'items.*.pl_number' => 'nullable|string|max:100',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit' => 'nullable|string|max:45',
            'items.*.unit_price' => 'nullable|numeric',
            'items.*.subtotal' => 'nullable|numeric',
            'items.*.nomor_aju' => 'nullable|string|max:100',
            'items.*.nomor_daftar' => 'nullable|string|max:100',
            'items.*.jenis_dokumen' => 'nullable|string|max:100',
            'items.*.seri_barang' => 'nullable|string|max:100',
        ]);

        return DB::transaction(function () use ($validated, $request) {
            $validated['created_by'] = $request->user()?->id ?? 1;

            $header = DocumentHistory::create($validated);

            $totalAmount = 0;
            foreach ($validated['items'] as $itemData) {
                $subtotal = $itemData['subtotal'] ?? (($itemData['quantity'] ?? 0) * ($itemData['unit_price'] ?? 0));
                $totalAmount += $subtotal;

                DocumentHistoryItem::create([
                    'document_history_id' => $header->id,
                    'item_name' => $itemData['item_name'],
                    'item_code' => $itemData['item_code'] ?? null,
                    'so_number' => $itemData['so_number'] ?? null,
                    'pl_number' => $itemData['pl_number'] ?? null,
                    'quantity' => $itemData['quantity'],
                    'unit' => $itemData['unit'] ?? 'PCS',
                    'unit_price' => $itemData['unit_price'] ?? 0,
                    'subtotal' => $subtotal,
                    'nomor_aju' => $itemData['nomor_aju'] ?? null,
                    'nomor_daftar' => $itemData['nomor_daftar'] ?? null,
                    'jenis_dokumen' => $itemData['jenis_dokumen'] ?? $header->customs_document,
                    'seri_barang' => $itemData['seri_barang'] ?? '1',
                ]);
            }

            if ($totalAmount > 0 && empty($validated['amount'])) {
                $header->update(['amount' => $totalAmount]);
            }

            return response()->json([
                'message' => 'Document history recorded successfully',
                'data' => $header->load('items'),
            ], 201);
        });
    }

    public function show(int $id): JsonResponse
    {
        $record = DocumentHistory::with(['items', 'createdByUser', 'updatedByUser'])->findOrFail($id);

        return response()->json(['data' => $record]);
    }

    public function destroy(int $id): JsonResponse
    {
        $record = DocumentHistory::findOrFail($id);
        $record->delete();

        return response()->json(['message' => 'Document history deleted successfully']);
    }
}
