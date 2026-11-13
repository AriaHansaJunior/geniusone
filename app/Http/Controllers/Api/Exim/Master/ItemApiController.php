<?php

namespace App\Http\Controllers\Api\Exim\Master;

use App\Http\Controllers\Controller;
use App\Models\Master\Material\Item;
use App\Models\Master\Material\ItemType;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ItemApiController extends Controller
{
    /**
     * Authorize user action on master item based on role and permissions (BE-03).
     */
    protected function authorizeItemAction(Request $request, string $action = 'create'): void
    {
        $user = $request->user();
        if (! $user && $headerId = $request->header('X-User-Id')) {
            $user = \App\Models\System\Auth\User::find($headerId);
        }

        if ($user) {
            $hasPerm = $user->hasPermission("master_item.{$action}")
                || $user->hasPermission('master_item.*')
                || $user->isSuperAdmin()
                || $user->isAdmin()
                || in_array($user->role, ['superadmin', 'admin', 'procurement', 'accounting', 'master_item_manager'], true);

            if (! $hasPerm) {
                abort(403, "Forbidden: Your role does not possess 'master_item.{$action}' permission.");
            }
        }
    }
    private function itemRelations(): array
    {
        return [
            'classification',
            'category',
            'facility',
            'unitOfMeasurement',
            'smallestUnit',
            'greatestUnit',
            'itemType',
            'origin',
            'brand',
            'colour',
            'style',
            'hsCode',
            'customsReport',
            'groupScrapItem',
            'specification',
            'jobNumber',
            'createdByUser',
            'updatedByUser',
        ];
    }

    private function itemValidationRules(?int $id = null): array
    {
        $isUpdate = $id !== null;
        $req = $isUpdate ? 'nullable' : 'required';

        return [
            'name' => ($isUpdate ? 'sometimes|required' : 'required').'|string|max:255',
            'code' => 'nullable|string|max:45|unique:items,code'.($id ? ','.$id : ''),
            'external_code' => 'nullable|string|max:45',
            'categories_id' => 'nullable|exists:categories,id',
            'classifications_id' => $req.'|exists:classifications,id',
            'facilities_id' => $req.'|exists:facilities,id',
            'origins_id' => 'nullable|exists:origins,id',
            'item_types_id' => 'nullable|exists:item_types,id',
            'units_of_measurements_id' => $req.'|exists:units_of_measurements,id',
            'smallest_unit_id' => 'nullable|exists:units_of_measurements,id',
            'greatest_unit_id' => 'nullable|exists:units_of_measurements,id',
            'unit_conversion' => 'nullable|numeric',
            'netto' => 'nullable|numeric',
            'size' => 'nullable|string|max:100',
            'dimension_p' => 'nullable|numeric',
            'dimension_l' => 'nullable|numeric',
            'dimension_t' => 'nullable|numeric',
            'colours_id' => 'nullable|exists:colours,id',
            'brands_id' => 'nullable|exists:brands,id',
            'styles_id' => 'nullable|exists:styles,id',
            'customs_reports_id' => 'nullable|exists:customs_reports,id',
            'group_scrap_items_id' => 'nullable|exists:group_scrap_items,id',
            'specifications_id' => 'nullable|exists:specifications,id',
            'hs_code_id' => 'nullable|exists:hs_code,id',
            'job_number_id' => 'nullable|exists:job_number,id',
            'trace_by_lot' => 'nullable|integer',
            'status' => 'nullable|integer',
            'stock' => 'nullable|numeric',
        ];
    }

    /**
     * List master items with rich relations for the Item table & picker modal.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Item::with($this->itemRelations());

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('external_code', 'like', "%{$search}%");
            });
        }

        if ($request->has('status')) {
            $status = $request->query('status');
            if ($status === 'Active' || $status === '1') {
                $query->where('status', 1);
            } elseif ($status === 'Inactive' || $status === '0') {
                $query->where('status', 0);
            }
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
     * Store new master item.
     */
    public function store(Request $request): JsonResponse
    {
        $this->authorizeItemAction($request, 'create');

        $validated = $request->validate($this->itemValidationRules());

        if (empty($validated['code'])) {
            $nextId = (Item::max('id') ?? 0) + 1;
            $validated['code'] = 'ITM.'.str_pad((string) $nextId, 5, '0', STR_PAD_LEFT);
        }

        if (empty($validated['item_types_id'])) {
            $firstType = ItemType::orderBy('id')->first();
            if (! $firstType) {
                return response()->json(['message' => 'Reference table item_types has no records. Run database seeders first.'], 422);
            }
            $validated['item_types_id'] = $firstType->id;
        }

        $actorId = $this->requireActorId($request);
        $validated['created_by'] = $actorId;
        $validated['updated_by'] = $actorId;

        $item = Item::create($validated);

        return response()->json([
            'message' => 'Item created successfully',
            'data' => $item->load($this->itemRelations()),
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $item = Item::with($this->itemRelations())->findOrFail($id);

        return response()->json(['data' => $item]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $this->authorizeItemAction($request, 'update');

        $item = Item::findOrFail($id);

        $validated = $request->validate($this->itemValidationRules($id));

        $actorId = $this->requireActorId($request);
        $validated['updated_by'] = $actorId;

        $item->update($validated);

        return response()->json([
            'message' => 'Item updated successfully',
            'data' => $item->load($this->itemRelations()),
        ]);
    }

    public function toggleStatus(Request $request, int $id): JsonResponse
    {
        $this->authorizeItemAction($request, 'update');
        $actorId = $this->requireActorId($request);

        $item = Item::findOrFail($id);
        $item->status = (int) $item->status === 1 ? 0 : 1;
        $item->updated_by = $actorId;
        $item->save();

        return response()->json([
            'message' => 'Item status updated successfully',
            'data' => $item->load($this->itemRelations()),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->authorizeItemAction($request, 'delete');
        $actorId = $this->requireActorId($request);

        $item = Item::findOrFail($id);
        $item->delete();

        AuditLogger::log(
            type: 'ITEM_DELETED',
            old: ['id' => $id, 'code' => $item->code, 'name' => $item->name],
            new: null,
            userId: $actorId
        );

        return response()->json(['message' => 'Item deleted successfully']);
    }
}
