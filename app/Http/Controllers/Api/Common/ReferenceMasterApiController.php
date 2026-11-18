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
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReferenceMasterApiController extends Controller
{
    /**
     * Map frontend ReferenceMasterPageKey to Eloquent model & human label.
     *
     * @var array<string, array{model: class-string<\Illuminate\Database\Eloquent\Model>, label: string}>
     */
    private const MODEL_MAP = [
        'pph-type' => [
            'model' => PphType::class,
            'label' => 'PPH Type',
        ],
        'type-rates-bm' => [
            'model' => TypeRateBm::class,
            'label' => 'Type Rates BM',
        ],
        'type-rates-cukai' => [
            'model' => TypeRateCukai::class,
            'label' => 'Type Rates Cukai',
        ],
        'custom-report' => [
            'model' => CustomsReport::class,
            'label' => 'Custom Report',
        ],
        'item-type' => [
            'model' => ItemType::class,
            'label' => 'Item Type',
        ],
        'group-scrap-item' => [
            'model' => GroupScrapItem::class,
            'label' => 'Group Scrap Item',
        ],
        'specification' => [
            'model' => Specification::class,
            'label' => 'Specification',
        ],
        'warehouse-type' => [
            'model' => WarehouseType::class,
            'label' => 'Warehouse Type',
        ],
    ];

    /**
     * Soft-delete a reference master record by key and ID.
     * DELETE /api/master/reference/{key}/{id}
     */
    public function destroy(Request $request, string $key, int $id): JsonResponse
    {
        $this->requireActorId($request);

        $config = self::MODEL_MAP[$key] ?? null;
        if ($config === null) {
            return response()->json([
                'message' => "Unknown reference master key '{$key}'.",
            ], 404);
        }

        $modelClass = $config['model'];
        $record = $modelClass::findOrFail($id);
        $record->delete();

        return response()->json([
            'status' => 'success',
            'message' => "{$config['label']} deleted successfully.",
        ]);
    }
}
