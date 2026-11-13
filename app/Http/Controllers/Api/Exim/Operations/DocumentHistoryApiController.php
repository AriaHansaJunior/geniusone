<?php

namespace App\Http\Controllers\Api\Exim\Operations;

use App\Http\Controllers\Controller;
use App\Models\Master\Customs\DocumentHistory;
use App\Models\Master\Customs\DocumentHistoryItem;
use App\Models\Warehouse\GateReceiving\ReceiveNote;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DocumentHistoryApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = DocumentHistory::with(['createdByUser', 'updatedByUser', 'items']);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                    ->orWhere('transaction_number', 'like', "%{$search}%")
                    ->orWhere('customer_supplier', 'like', "%{$search}%")
                    ->orWhere('customs_document', 'like', "%{$search}%");
            });
        }

        if ($mutationType = $request->query('mutation_type')) {
            $query->where('mutation_type', $mutationType);
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
        $actorId = $this->requireActorId($request);

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
            'items.*.quantity' => 'required|numeric|min:0.0001',
            'items.*.unit' => 'nullable|string|max:45',
            'items.*.unit_price' => 'nullable|numeric',
            'items.*.subtotal' => 'nullable|numeric',
            'items.*.nomor_aju' => 'nullable|string|max:100',
            'items.*.nomor_daftar' => 'nullable|string|max:100',
            'items.*.jenis_dokumen' => 'nullable|string|max:100',
            'items.*.seri_barang' => 'nullable|string|max:100',
        ]);

        return DB::transaction(function () use ($validated, $actorId) {
            $validated['created_by'] = $actorId;
            $validated['updated_by'] = $actorId;

            $header = DocumentHistory::create($validated);

            $totalAmount = 0;
            foreach (array_values($validated['items']) as $idx => $itemData) {
                $subtotal = $itemData['subtotal'] ?? (($itemData['quantity'] ?? 0) * ($itemData['unit_price'] ?? 0));
                $totalAmount += $subtotal;

                DocumentHistoryItem::create([
                    'document_history_id' => $header->id,
                    'item_name' => $itemData['item_name'],
                    'item_code' => $itemData['item_code'] ?? null,
                    'so_number' => $itemData['so_number'] ?? null,
                    'pl_number' => $itemData['pl_number'] ?? null,
                    'quantity' => $itemData['quantity'],
                    'unit' => $itemData['unit'] ?? '',
                    'unit_price' => $itemData['unit_price'] ?? 0,
                    'subtotal' => $subtotal,
                    'nomor_aju' => $itemData['nomor_aju'] ?? null,
                    'nomor_daftar' => $itemData['nomor_daftar'] ?? null,
                    'jenis_dokumen' => $itemData['jenis_dokumen'] ?? $header->customs_document,
                    'seri_barang' => isset($itemData['seri_barang']) && $itemData['seri_barang'] !== ''
                        ? (string) $itemData['seri_barang']
                        : (string) ($idx + 1),
                ]);
            }

            if ($totalAmount > 0 && empty($validated['amount'])) {
                $header->update(['amount' => $totalAmount]);
            }

            return response()->json([
                'message' => 'Document history recorded successfully',
                'data' => $header->load(['items', 'createdByUser', 'updatedByUser']),
            ], 201);
        });
    }

    /**
     * Synchronize approved Receive Notes into Document Histories from MySQL.
     */
    public function synchronize(Request $request): JsonResponse
    {
        $actorId = $this->requireActorId($request);

        return DB::transaction(function () use ($actorId) {
            $existingTxNumbers = DocumentHistory::pluck('transaction_number')->filter()->flip();

            $approvedRns = ReceiveNote::with([
                'supplier',
                'currency',
                'approvals',
                'items.poItem.directItem.unitOfMeasurement',
                'items.poItem.item.unitOfMeasurement',
            ])
                ->orderByDesc('id')
                ->get()
                ->filter(fn (ReceiveNote $rn) => $rn->status === 'Approved');

            $synced = [];
            foreach ($approvedRns as $rn) {
                if ($existingTxNumbers->has($rn->rn_number)) {
                    continue;
                }

                $history = $this->createFromReceiveNote($rn, $actorId);
                $synced[] = $history->load(['items', 'createdByUser']);
            }

            return response()->json([
                'status' => 'success',
                'message' => count($synced).' document(s) synchronized from approved Receive Notes.',
                'data' => $synced,
                'synced_count' => count($synced),
            ]);
        });
    }

    /**
     * Generate a Document History entry from a specified Receive Note or payload.
     */
    public function generate(Request $request): JsonResponse
    {
        $actorId = $this->requireActorId($request);

        if ($rnId = $request->input('receive_note_id')) {
            $rn = ReceiveNote::with([
                'supplier',
                'currency',
                'approvals',
                'items.poItem.directItem.unitOfMeasurement',
                'items.poItem.item.unitOfMeasurement',
            ])->findOrFail((int) $rnId);

            return DB::transaction(function () use ($rn, $actorId) {
                $existing = DocumentHistory::where('transaction_number', $rn->rn_number)->first();
                if ($existing) {
                    return response()->json([
                        'status' => 'success',
                        'message' => 'Document history already exists for '.$rn->rn_number,
                        'data' => $existing->load(['items', 'createdByUser']),
                    ]);
                }

                $history = $this->createFromReceiveNote($rn, $actorId);

                return response()->json([
                    'status' => 'success',
                    'message' => 'Document history generated from '.$rn->rn_number,
                    'data' => $history->load(['items', 'createdByUser']),
                ], 201);
            });
        }

        return $this->store($request);
    }

    private function createFromReceiveNote(ReceiveNote $rn, int $actorId): DocumentHistory
    {
        $totalAmount = (float) $rn->items->sum(fn ($it) => (float) ($it->grand_total ?? (($it->quantity ?? 0) * ($it->price ?? 0))));

        $history = DocumentHistory::create([
            'invoice_number' => $rn->invoice_number ?: $rn->rn_number,
            'invoice_alias' => $rn->pl_number ?: $rn->sj_number ?: $rn->rn_number,
            'invoice_date' => $rn->invoice_date ?: $rn->arrival_date ?: $rn->created_at,
            'transaction_number' => $rn->rn_number,
            'mutation_type' => 'Receive Note',
            'customer_supplier' => $rn->supplier?->name ?? '—',
            'customer' => $rn->supplier?->name ?? null,
            'destination' => $rn->facility ?: null,
            'bl_number' => $rn->sj_number ?: $rn->pl_number ?: null,
            'currency' => $rn->currency?->name ?? 'IDR',
            'customs_document' => $rn->bc_code ?: $rn->facility ?: null,
            'amount' => $totalAmount,
            'created_by' => $actorId,
            'updated_by' => $actorId,
        ]);

        foreach ($rn->items->values() as $idx => $rnItem) {
            $itemModel = $rnItem->poItem?->directItem ?? $rnItem->poItem?->item;
            $qty = (float) ($rnItem->quantity ?? 0);
            $price = (float) ($rnItem->price ?? 0);
            $subtotal = (float) ($rnItem->grand_total ?? ($qty * $price));

            DocumentHistoryItem::create([
                'document_history_id' => $history->id,
                'item_name' => $itemModel?->name ?? $rnItem->item_name ?? '—',
                'item_code' => $itemModel?->code ?? null,
                'so_number' => $rnItem->dn_number ?? null,
                'pl_number' => $rn->pl_number ?? null,
                'quantity' => $qty > 0 ? $qty : 1,
                'unit' => $itemModel?->unitOfMeasurement?->name ?? $itemModel?->unitOfMeasurement?->code ?? '',
                'unit_price' => $price,
                'subtotal' => $subtotal,
                'nomor_aju' => $rn->aju_number ?? null,
                'nomor_daftar' => $rn->no_daftar ?? null,
                'jenis_dokumen' => $rn->bc_code ?: $rn->facility ?: null,
                'seri_barang' => (string) ($idx + 1),
            ]);
        }

        return $history;
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
