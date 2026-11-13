<?php

namespace App\Http\Controllers\Api\Exim\Operations;

use App\Http\Controllers\Controller;
use App\Models\Common\ExchangeRate;
use App\Models\Master\Finance\Currency;
use App\Models\Warehouse\GateReceiving\PurchaseOrderReceiveNote;
use App\Models\Warehouse\GateReceiving\ReceiveNoteReturn;
use App\Models\Warehouse\GateReceiving\ReceiveNoteReturnItem;
use App\Services\DocumentNumber\DocumentNumberGenerator;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReceiveNoteReturnApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = ReceiveNoteReturn::with(['createdByUser', 'updatedByUser', 'items']);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('rn_number', 'like', "%{$search}%")
                    ->orWhere('delivery_order', 'like', "%{$search}%")
                    ->orWhere('customer', 'like', "%{$search}%")
                    ->orWhere('sales_delivery_number', 'like', "%{$search}%");
            });
        }

        if ($status = $request->query('approval_status')) {
            $query->where('approval_status', $status);
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

    /**
     * List approved Receive Note line items eligible for return.
     */
    public function availableSourceItems(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));

        $rnItems = PurchaseOrderReceiveNote::with([
            'receiveNote.supplier',
            'receiveNote.currency',
            'receiveNote.approvals',
            'purchaseOrder',
            'poItem.directItem.unitOfMeasurement',
            'poItem.item.unitOfMeasurement',
        ])
            ->whereHas('receiveNote')
            ->latest('id')
            ->get()
            ->filter(function (PurchaseOrderReceiveNote $line) use ($search) {
                if (! $line->receiveNote || $line->receiveNote->status !== 'Approved') {
                    return false;
                }
                if ($search === '') {
                    return true;
                }
                $needle = strtolower($search);
                $item = $line->poItem?->directItem ?? $line->poItem?->item;
                $haystack = strtolower(implode(' ', [
                    $line->receiveNote->rn_number ?? '',
                    $line->receiveNote->supplier?->name ?? '',
                    $item?->code ?? '',
                    $item?->name ?? $line->item_name ?? '',
                ]));

                return str_contains($haystack, $needle);
            })
            ->values()
            ->map(function (PurchaseOrderReceiveNote $line) {
                $rn = $line->receiveNote;
                $item = $line->poItem?->directItem ?? $line->poItem?->item;

                return [
                    'po_has_rn_id' => $line->id,
                    'receive_note_id' => $rn->id,
                    'rn_number' => $rn->rn_number,
                    'rn_date' => $rn->arrival_date ? date('Y-m-d', strtotime((string) $rn->arrival_date)) : $rn->created_at?->format('Y-m-d'),
                    'supplier' => $rn->supplier?->name ?? '—',
                    'facility' => $rn->facility ?? '',
                    'bc_code' => $rn->bc_code ?? '',
                    'aju_number' => $rn->aju_number ?? '',
                    'no_daftar' => $rn->no_daftar ?? '',
                    'currency' => $rn->currency?->name ?? 'IDR',
                    'exchange_rate' => (float) ($rn->rate ?? 1),
                    'items_id' => $item?->id,
                    'item_code' => $item?->code ?? '',
                    'item_name' => $item?->name ?? $line->item_name ?? '—',
                    'unit' => $item?->unitOfMeasurement?->name ?? $item?->unitOfMeasurement?->code ?? '',
                    'quantity' => (float) ($line->quantity ?? 0),
                    'price' => (float) ($line->price ?? 0),
                    'sj_number' => $rn->sj_number ?? '',
                    'do_number' => $line->dn_number ?? $rn->invoice_number ?? '',
                ];
            });

        return response()->json([
            'status' => 'success',
            'data' => $rnItems,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $actorId = $this->requireActorId($request);

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
            'currency' => 'nullable|string|max:20',
            'exchange_rate' => 'nullable|numeric|gt:0',
            'type_of_return' => 'nullable|string|max:100',
            'sales_delivery_number' => 'nullable|string|max:100',
            'vehicle_type' => 'nullable|string|max:100',
            'license_plate' => 'nullable|string|max:45',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.items_id' => 'nullable|exists:items,id',
            'items.*.item_name' => 'required|string|max:255',
            'items.*.item_code' => 'nullable|string|max:100',
            'items.*.quantity' => 'required|numeric|min:0.0001',
            'items.*.unit' => 'nullable|string|max:45',
            'items.*.price' => 'nullable|numeric',
            'items.*.subtotal' => 'nullable|numeric',
            'items.*.retur_qty' => 'nullable|numeric',
            'items.*.do_number' => 'nullable|string|max:100',
            'items.*.sj_number' => 'nullable|string|max:100',
        ]);

        return DB::transaction(function () use ($validated, $actorId) {
            if (empty($validated['rn_number'])) {
                $validated['rn_number'] = DocumentNumberGenerator::generateReceiveNoteReturnNumber(
                    ! empty($validated['rn_date']) ? Carbon::parse($validated['rn_date']) : null
                );
            }

            $currencyCode = strtoupper(trim((string) ($validated['currency'] ?? '')));
            if ($currencyCode === '') {
                $currencyCode = Currency::where('status', 1)->orderBy('id')->value('name') ?? 'IDR';
            }
            $validated['currency'] = $currencyCode;

            $rate = (float) ($validated['exchange_rate'] ?? 0);
            if ($rate <= 0) {
                $currencyId = Currency::where('name', $currencyCode)->value('id');
                $dbRate = $currencyId
                    ? ExchangeRate::where('currencies_id', $currencyId)->orderByDesc('rate_date')->orderByDesc('id')->value('middle_rate')
                    : null;
                $rate = $dbRate ? (float) $dbRate : 1.0;
            }
            $validated['exchange_rate'] = $rate;

            $validated['created_by'] = $actorId;
            $validated['updated_by'] = $actorId;
            $validated['approval_status'] = 'Draft';

            $header = ReceiveNoteReturn::create($validated);

            $totalAmount = 0;
            foreach ($validated['items'] as $itemData) {
                $qty = (float) ($itemData['quantity'] ?? 0);
                $price = (float) ($itemData['price'] ?? 0);
                $subtotal = (float) ($itemData['subtotal'] ?? ($qty * $price));
                $totalAmount += $subtotal;

                ReceiveNoteReturnItem::create([
                    'receive_note_return_id' => $header->id,
                    'items_id' => $itemData['items_id'] ?? null,
                    'item_name' => $itemData['item_name'],
                    'item_code' => $itemData['item_code'] ?? null,
                    'quantity' => $qty,
                    'unit' => $itemData['unit'] ?? '',
                    'price' => $price,
                    'subtotal' => $subtotal,
                    'subtotal_idr' => $subtotal * $rate,
                    'delivery_qty' => $itemData['delivery_qty'] ?? $qty,
                    'retur_qty' => $itemData['retur_qty'] ?? $qty,
                    'do_number' => $itemData['do_number'] ?? $header->delivery_order,
                    'sj_number' => $itemData['sj_number'] ?? null,
                ]);
            }

            if ($totalAmount > 0 && empty($validated['amount'])) {
                $header->update(['amount' => $totalAmount]);
            }

            return response()->json([
                'message' => 'Receive note return created successfully',
                'data' => $header->load(['items', 'createdByUser', 'updatedByUser']),
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
        $actorId = $this->requireActorId($request);
        $record = ReceiveNoteReturn::findOrFail($id);
        $record->update([
            'approval_status' => 'Approved',
            'rejection_note' => null,
            'updated_by' => $actorId,
        ]);

        return response()->json([
            'message' => 'Receive note return approved successfully',
            'data' => $record->load(['items', 'createdByUser', 'updatedByUser']),
        ]);
    }

    public function reject(Request $request, int $id): JsonResponse
    {
        $actorId = $this->requireActorId($request);
        $validated = $request->validate([
            'reason' => 'nullable|string|max:500',
            'note' => 'nullable|string|max:500',
            'rejection_note' => 'nullable|string|max:500',
        ]);

        $record = ReceiveNoteReturn::findOrFail($id);
        $record->update([
            'approval_status' => 'Rejected',
            'rejection_note' => $validated['reason'] ?? $validated['note'] ?? $validated['rejection_note'] ?? null,
            'updated_by' => $actorId,
        ]);

        return response()->json([
            'message' => 'Receive note return rejected successfully',
            'data' => $record->load(['items', 'createdByUser', 'updatedByUser']),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $record = ReceiveNoteReturn::findOrFail($id);
        $record->delete();

        return response()->json(['message' => 'Receive note return deleted successfully']);
    }
}
