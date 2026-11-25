<?php

namespace App\Http\Controllers\Api\Common;

use App\Http\Controllers\Controller;
use App\Models\Master\Customs\CustomsReport;
use App\Models\Master\Customs\TypeRateBm;
use App\Models\Master\Customs\TypeRateCukai;
use App\Models\Master\Finance\PphType;
use App\Models\Master\Material\GroupScrapItem;
use App\Models\Master\Material\ItemType;
use App\Models\Master\Material\Specification;
use App\Models\Warehouse\Facility\WarehouseType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReferenceMasterApiController extends Controller
{
    /**
     * Map frontend ReferenceMasterPageKey to Eloquent model & schema configuration.
     *
     * @var array<string, array{
     *     model: class-string<Model>,
     *     label: string,
     *     nameColumn: string,
     *     hasCode: bool,
     *     hasStatus: bool,
     *     statusType?: string
     * }>
     */
    private const MODEL_MAP = [
        'pph-type' => [
            'model' => PphType::class,
            'label' => 'PPH Type',
            'nameColumn' => 'nama',
            'hasCode' => false,
            'hasStatus' => false,
        ],
        'type-rates-bm' => [
            'model' => TypeRateBm::class,
            'label' => 'Type Rates BM',
            'nameColumn' => 'name',
            'hasCode' => false,
            'hasStatus' => true,
            'statusType' => 'int',
        ],
        'type-rates-cukai' => [
            'model' => TypeRateCukai::class,
            'label' => 'Type Rates Cukai',
            'nameColumn' => 'name',
            'hasCode' => false,
            'hasStatus' => true,
            'statusType' => 'int',
        ],
        'custom-report' => [
            'model' => CustomsReport::class,
            'label' => 'Custom Report',
            'nameColumn' => 'name',
            'hasCode' => false,
            'hasStatus' => true,
            'statusType' => 'int',
        ],
        'item-type' => [
            'model' => ItemType::class,
            'label' => 'Item Type',
            'nameColumn' => 'name',
            'hasCode' => false,
            'hasStatus' => true,
            'statusType' => 'string',
        ],
        'group-scrap-item' => [
            'model' => GroupScrapItem::class,
            'label' => 'Group Scrap Item',
            'nameColumn' => 'name',
            'hasCode' => true,
            'hasStatus' => true,
            'statusType' => 'int',
        ],
        'specification' => [
            'model' => Specification::class,
            'label' => 'Specification',
            'nameColumn' => 'name',
            'hasCode' => false,
            'hasStatus' => true,
            'statusType' => 'int',
        ],
        'warehouse-type' => [
            'model' => WarehouseType::class,
            'label' => 'Warehouse Type',
            'nameColumn' => 'name',
            'hasCode' => false,
            'hasStatus' => true,
            'statusType' => 'int',
        ],
    ];

    /**
     * List reference master records by key.
     */
    public function index(Request $request): JsonResponse
    {
        $key = (string) ($request->route('key') ?? '');
        $config = self::MODEL_MAP[$key] ?? null;
        if ($config === null) {
            return $this->unknownKeyResponse($key);
        }

        $modelClass = $config['model'];
        $nameCol = $config['nameColumn'];
        $query = $modelClass::query()->orderBy('id');

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($q) use ($search, $nameCol, $config) {
                $q->where($nameCol, 'like', "%{$search}%");
                if ($config['hasCode']) {
                    $q->orWhere('code', 'like', "%{$search}%");
                }
            });
        }

        $perPage = min(max((int) $request->query('per_page', 100), 1), 500);
        $paginated = $query->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $paginated->getCollection()->map(fn (Model $row) => $this->serializeRecord($row, $config))->values(),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    /**
     * Create a reference master record by key.
     */
    public function store(Request $request): JsonResponse
    {
        $this->requireActorId($request);

        $key = (string) ($request->route('key') ?? '');
        $config = self::MODEL_MAP[$key] ?? null;
        if ($config === null) {
            return $this->unknownKeyResponse($key);
        }

        $rules = [
            'name' => 'required|string|max:45',
            'status' => 'nullable|boolean',
        ];
        if ($config['hasCode']) {
            $rules['code'] = 'required|string|max:45';
        }

        $validated = $request->validate($rules);
        $modelClass = $config['model'];
        $nameCol = $config['nameColumn'];
        $trimmedName = trim((string) $validated['name']);

        if ($modelClass::query()->whereRaw("LOWER({$nameCol}) = ?", [strtolower($trimmedName)])->exists()) {
            return response()->json([
                'message' => "The {$config['label']} name '{$trimmedName}' already exists.",
                'errors' => ['name' => ["The {$config['label']} name already exists."]],
            ], 422);
        }

        $attributes = [$nameCol => $trimmedName];

        if ($config['hasCode']) {
            $trimmedCode = trim((string) $validated['code']);
            if ($modelClass::query()->whereRaw('LOWER(code) = ?', [strtolower($trimmedCode)])->exists()) {
                return response()->json([
                    'message' => "The {$config['label']} code '{$trimmedCode}' already exists.",
                    'errors' => ['code' => ["The {$config['label']} code already exists."]],
                ], 422);
            }
            $attributes['code'] = $trimmedCode;
        }

        if ($config['hasStatus']) {
            $isActive = array_key_exists('status', $validated) ? (bool) $validated['status'] : true;
            $attributes['status'] = ($config['statusType'] ?? 'int') === 'string'
                ? ($isActive ? 'active' : 'inactive')
                : ($isActive ? 1 : 0);
        }

        $record = $modelClass::create($attributes);
        SystemContextApiController::forgetLookupsCache();

        return response()->json([
            'status' => 'success',
            'message' => "{$config['label']} created successfully.",
            'data' => $this->serializeRecord($record, $config),
        ], 201);
    }

    /**
     * Update an existing reference master record by key and ID.
     */
    public function update(Request $request): JsonResponse
    {
        $this->requireActorId($request);

        $key = (string) ($request->route('key') ?? '');
        $id = (int) ($request->route('id') ?? 0);
        $config = self::MODEL_MAP[$key] ?? null;
        if ($config === null) {
            return $this->unknownKeyResponse($key);
        }

        $modelClass = $config['model'];
        $record = $modelClass::findOrFail($id);

        $rules = [
            'name' => 'required|string|max:45',
            'status' => 'nullable|boolean',
        ];
        if ($config['hasCode']) {
            $rules['code'] = 'required|string|max:45';
        }

        $validated = $request->validate($rules);
        $nameCol = $config['nameColumn'];
        $trimmedName = trim((string) $validated['name']);

        $duplicateName = $modelClass::query()
            ->where('id', '!=', $id)
            ->whereRaw("LOWER({$nameCol}) = ?", [strtolower($trimmedName)])
            ->exists();
        if ($duplicateName) {
            return response()->json([
                'message' => "The {$config['label']} name '{$trimmedName}' already exists.",
                'errors' => ['name' => ["The {$config['label']} name already exists."]],
            ], 422);
        }

        $attributes = [$nameCol => $trimmedName];

        if ($config['hasCode']) {
            $trimmedCode = trim((string) $validated['code']);
            $duplicateCode = $modelClass::query()
                ->where('id', '!=', $id)
                ->whereRaw('LOWER(code) = ?', [strtolower($trimmedCode)])
                ->exists();
            if ($duplicateCode) {
                return response()->json([
                    'message' => "The {$config['label']} code '{$trimmedCode}' already exists.",
                    'errors' => ['code' => ["The {$config['label']} code already exists."]],
                ], 422);
            }
            $attributes['code'] = $trimmedCode;
        }

        if ($config['hasStatus'] && array_key_exists('status', $validated)) {
            $isActive = (bool) $validated['status'];
            $attributes['status'] = ($config['statusType'] ?? 'int') === 'string'
                ? ($isActive ? 'active' : 'inactive')
                : ($isActive ? 1 : 0);
        }

        $record->update($attributes);
        SystemContextApiController::forgetLookupsCache();

        return response()->json([
            'status' => 'success',
            'message' => "{$config['label']} updated successfully.",
            'data' => $this->serializeRecord($record->fresh(), $config),
        ]);
    }

    /**
     * Toggle active/inactive status of a reference master record by key and ID.
     */
    public function toggleStatus(Request $request): JsonResponse
    {
        $this->requireActorId($request);

        $key = (string) ($request->route('key') ?? '');
        $id = (int) ($request->route('id') ?? 0);
        $config = self::MODEL_MAP[$key] ?? null;
        if ($config === null) {
            return $this->unknownKeyResponse($key);
        }

        if (! $config['hasStatus']) {
            return response()->json([
                'message' => "Status toggle is not supported for {$config['label']}.",
            ], 422);
        }

        $modelClass = $config['model'];
        $record = $modelClass::findOrFail($id);
        $currentlyActive = $this->isRecordActive($record->getAttribute('status'));
        $nextActive = ! $currentlyActive;

        $record->status = ($config['statusType'] ?? 'int') === 'string'
            ? ($nextActive ? 'active' : 'inactive')
            : ($nextActive ? 1 : 0);
        $record->save();
        SystemContextApiController::forgetLookupsCache();

        return response()->json([
            'status' => 'success',
            'message' => "{$config['label']} status updated successfully.",
            'data' => $this->serializeRecord($record, $config),
        ]);
    }

    /**
     * Soft-delete a reference master record by key and ID.
     * DELETE /api/master/reference/{key}/{id}
     */
    public function destroy(Request $request): JsonResponse
    {
        $this->requireActorId($request);

        $key = (string) ($request->route('key') ?? '');
        $id = (int) ($request->route('id') ?? 0);
        $config = self::MODEL_MAP[$key] ?? null;
        if ($config === null) {
            return $this->unknownKeyResponse($key);
        }

        $modelClass = $config['model'];
        $record = $modelClass::findOrFail($id);
        $record->delete();
        SystemContextApiController::forgetLookupsCache();

        return response()->json([
            'status' => 'success',
            'message' => "{$config['label']} deleted successfully.",
        ]);
    }

    private function unknownKeyResponse(string $key): JsonResponse
    {
        return response()->json([
            'message' => "Unknown reference master key '{$key}'.",
        ], 404);
    }

    private function isRecordActive(mixed $raw): bool
    {
        if (is_bool($raw)) {
            return $raw;
        }
        if (is_numeric($raw)) {
            return (int) $raw === 1;
        }
        if (is_string($raw)) {
            return in_array(strtolower(trim($raw)), ['1', 'true', 'active', 'yes'], true);
        }

        return (bool) $raw;
    }

    /**
     * @param  array{model: class-string<Model>, label: string, nameColumn: string, hasCode: bool, hasStatus: bool, statusType?: string}  $config
     */
    private function serializeRecord(Model $record, array $config): array
    {
        $payload = [
            'id' => $record->getKey(),
            'name' => $record->getAttribute($config['nameColumn']),
        ];

        if ($config['nameColumn'] !== 'name') {
            $payload[$config['nameColumn']] = $record->getAttribute($config['nameColumn']);
        }

        if ($config['hasCode']) {
            $payload['code'] = $record->getAttribute('code');
        }

        if ($config['hasStatus']) {
            $payload['status'] = $this->isRecordActive($record->getAttribute('status'));
        }

        return $payload;
    }
}
