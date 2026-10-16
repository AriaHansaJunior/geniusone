<?php

namespace App\Http\Controllers\Api\Exim\Operations;

use App\Http\Controllers\Controller;
use App\Models\Warehouse\GateReceiving\ReceiveNoteReturn;
use App\Models\Warehouse\GateReceiving\ReceiveNoteReturnItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReceiveNoteReturnApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = ReceiveNoteReturn::with(['createdByUser', 'items']);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('rn_number', 'like', "%{$search}%")
                  ->orWhere('delivery_order', 'like', "%{$search}%")
                  ->orWhere('customer', 'like', "%{$search}%")
                  ->orWhere('sales_delivery_number', 'like', "%{$search}%");
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
            'rn_number' => 'nullable|string|max:100',
            'rn_date' => 'nullable|date',
            'delivery_order' => 'nullable|string|max:100',
            'do_date' => 'nullable|date',
            'customer' => 'required|string|max:255',
            'facility' => 'nullable|string|max:100',
            'bc_code' => 'nullable|string|max:45',
            'aju_number' => 'nullable|string|max:100',
            'no_daftar' => 'nullable|string|max:100',
            'amount' => 'nullable|numeric',
            'type_of_return' => 'nullable|string|max:100',
            'sales_delivery_number' => 'nullable|string|max:100',
            'vehicle_type' => 'nullable|string|max:100',
            'license_plate' => 'nullable|string|max:45',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.item_name' => 'required|string|max:255',
            'items.*.item_code' => 'nullable|string|max:100',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit' => 'nullable|string|max:45',
            'items.*.price' => 'nullable|numeric',
            'items.*.subtotal' => 'nullable|numeric',
            'items.*.retur_qty' => 'nullable|numeric',
            'items.*.do_number' => 'nullable|string|max:100',
            'items.*.sj_number' => 'nullable|string|max:100',
        ]);

        return DB::transaction(function () use ($validated, $request) {
            if (empty($validated['rn_number'])) {
                $nextId = (ReceiveNoteReturn::max('id') ?? 0) + 1;
                $validated['rn_number'] = 'RNR-' . date('Y') . '-' . str_pad((string) $nextId, 4, '0', STR_PAD_LEFT);
            }

            $validated['created_by'] = $request->user()?->id ?? 1;
            $validated['approval_status'] = 'Draft';

            $header = ReceiveNoteReturn::create($validated);

            $totalAmount = 0;
            foreach ($validated['items'] as $itemData) {
                $subtotal = $itemData['subtotal'] ?? (($itemData['quantity'] ?? 0) * ($itemData['price'] ?? 0));
                $totalAmount += $subtotal;

                ReceiveNoteReturnItem::create([
                    'receive_note_return_id' => $header->id,
                    'item_name' => $itemData['item_name'],
                    'item_code' => $itemData['item_code'] ?? null,
                    'quantity' => $itemData['quantity'],
                    'unit' => $itemData['unit'] ?? 'PCS',
                    'price' => $itemData['price'] ?? 0,
                    'subtotal' => $subtotal,
                    'subtotal_idr' => $subtotal,
                    'delivery_qty' => $itemData['delivery_qty'] ?? $itemData['quantity'],
                    'retur_qty' => $itemData['retur_qty'] ?? $itemData['quantity'],
                    'do_number' => $itemData['do_number'] ?? $header->delivery_order,
                    'sj_number' => $itemData['sj_number'] ?? null,
                ]);
            }

            if ($totalAmount > 0 && empty($validated['amount'])) {
                $header->update(['amount' => $totalAmount]);
            }

            return response()->json([
                'message' => 'Receive note return created successfully',
                'data' => $header->load('items'),
            ], 201);
        });
    }

    public function show(int $id): JsonResponse
    {
        $record = ReceiveNoteReturn::with(['items', 'createdByUser', 'updatedByUser'])->findOrFail($id);
        return response()->json(['data' => $record]);
    }

    public function approve(Request $request, int $id): JsonResponse
    {
        $record = ReceiveNoteReturn::findOrFail($id);
        $record->update([
            'approval_status' => 'Approved',
            'updated_by' => $request->user()?->id ?? 1,
        ]);

        return response()->json([
            'message' => 'Receive note return approved successfully',
            'data' => $record->load('items'),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $record = ReceiveNoteReturn::findOrFail($id);
        $record->delete();

        return response()->json(['message' => 'Receive note return deleted successfully']);
    }
}
