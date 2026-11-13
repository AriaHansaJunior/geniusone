<?php

namespace App\Http\Controllers\Api\Common;

use App\Http\Controllers\Controller;
use App\Models\Inventory\StockNotification;
use App\Models\Master\Customs\CustomsReport;
use App\Models\Master\Customs\Facility;
use App\Models\Master\Customs\HsCode;
use App\Models\Master\Customs\TypeRateBm;
use App\Models\Master\Customs\TypeRateCukai;
use App\Models\Master\Finance\Account;
use App\Models\Master\Finance\Currency;
use App\Models\Master\Finance\DeliveryTerm;
use App\Models\Master\Finance\PaymentMethod;
use App\Models\Master\Finance\PaymentTerm;
use App\Models\Master\Finance\Pph;
use App\Models\Master\Finance\PphType;
use App\Models\Master\Finance\Ppn;
use App\Models\Master\Finance\RafaksiType;
use App\Models\Master\Finance\Valuta;
use App\Models\Master\Material\Brand;
use App\Models\Master\Material\Category;
use App\Models\Master\Material\Classification;
use App\Models\Master\Material\Colour;
use App\Models\Master\Material\GroupScrapItem;
use App\Models\Master\Material\ItemType;
use App\Models\Master\Material\Specification;
use App\Models\Master\Material\Unit;
use App\Models\Master\Material\UnitOfMeasurement;
use App\Models\Master\Organization\Department;
use App\Models\Master\Organization\JobNumber;
use App\Models\Master\Organization\ReportingType;
use App\Models\Master\Organization\Section;
use App\Models\Master\Partner\Country;
use App\Models\Master\Partner\Origin;
use App\Models\Master\Partner\Port;
use App\Models\Master\Partner\Supplier;
use App\Models\Procurement\PurchaseOrder\AdditionalCostType;
use App\Models\Procurement\PurchaseOrder\DiscountType;
use App\Models\Procurement\PurchaseOrder\PoType;
use App\Models\Procurement\PurchaseOrder\PurchaseOrder;
use App\Models\Procurement\PurchaseRequest\PurchaseRequisition;
use App\Models\System\Setting\ReferenceOption;
use App\Models\System\Setting\SystemSetting;
use App\Models\Warehouse\Facility\Warehouse;
use App\Models\Warehouse\Facility\WarehouseCoordinate;
use App\Models\Warehouse\Facility\WarehouseType;
use App\Models\Warehouse\GateReceiving\ReceiveNote;
use App\Models\Warehouse\GateReceiving\ReceiveNoteReturn;
use App\Models\Warehouse\InboundStorage\BpbReceiveMaterial;
use App\Models\Warehouse\RequestMaterial\DestinationLocation;
use App\Models\Warehouse\RequestMaterial\RequestMaterial;
use App\Models\Warehouse\RequestMaterial\TypeOfRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SystemContextApiController extends Controller
{
    /**
     * Live DB system branding settings, document prefixes, and dynamic menu counts.
     * GET /api/system/context
     */
    public function context(): JsonResponse
    {
        $settings = SystemSetting::mapAll();

        $pendingPr = PurchaseRequisition::whereIn('status', ['Waiting for Approve 1', 'Waiting for Approve 2'])->count();
        $pendingPo = PurchaseOrder::whereIn('status', ['Waiting for Approve 1', 'Waiting for Approve 2'])->count();
        $pendingRn = ReceiveNote::whereIn('status', ['Waiting for Approve 1', 'Waiting for Approve 2'])->count();
        $pendingBpb = BpbReceiveMaterial::whereIn('status', ['Waiting for Approve 1', 'Waiting for Approve 2'])->count();
        $pendingRm = RequestMaterial::whereIn('status', ['Waiting for Approve 1', 'Waiting for Approve 2'])->count();
        $pendingRet = ReceiveNoteReturn::whereIn('approval_status', ['Waiting for Approve 1', 'Waiting for Approve 2'])->count();

        $reportCount = PurchaseRequisition::count()
            + PurchaseOrder::count()
            + ReceiveNote::count()
            + BpbReceiveMaterial::count();

        // Count active stock buffer notifications currently violated
        $stockByItem = DB::table('warehouse_stocks')
            ->select('items_id', DB::raw('SUM(quantity) as total_qty'))
            ->groupBy('items_id')
            ->pluck('total_qty', 'items_id');

        $triggeredAlerts = 0;
        foreach (StockNotification::with('item:id,stock')->where('status', 1)->get() as $rule) {
            $currentQty = $rule->items_id !== null
                ? (float) ($stockByItem[$rule->items_id] ?? $rule->item?->stock ?? 0)
                : 0.0;
            $buffer = (float) $rule->buffer_quantity;
            $cond = (string) $rule->trigger_condition;
            $isHit = match ($cond) {
                'Stock < Buffer' => $currentQty < $buffer,
                'Stock == 0' => $currentQty <= 0,
                default => $currentQty <= $buffer,
            };
            if ($isHit) {
                $triggeredAlerts++;
            }
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'settings' => $settings,
                'counts' => [
                    'pr_total' => PurchaseRequisition::count(),
                    'po_total' => PurchaseOrder::count(),
                    'rn_total' => ReceiveNote::count(),
                    'bpb_total' => BpbReceiveMaterial::count(),
                    'rm_total' => RequestMaterial::count(),
                    'pending_approvals' => $pendingPr + $pendingPo + $pendingRn + $pendingBpb + $pendingRm + $pendingRet,
                    'active_stock_alerts' => $triggeredAlerts,
                    'report_count' => $reportCount,
                ],
            ],
        ]);
    }

    /**
     * List all system settings.
     * GET /api/system/settings
     */
    public function settings(): JsonResponse
    {
        $rows = SystemSetting::orderBy('group')->orderBy('key')->get();

        return response()->json([
            'status' => 'success',
            'data' => $rows,
            'map' => $rows->pluck('value', 'key'),
        ]);
    }

    /**
     * Update system settings in DB.
     * PUT /api/system/settings
     */
    public function updateSettings(Request $request): JsonResponse
    {
        $this->requireActorId($request);

        $validated = $request->validate([
            'settings' => 'required|array',
        ]);

        foreach ($validated['settings'] as $key => $val) {
            if (is_array($val)) {
                SystemSetting::updateOrCreate(
                    ['key' => (string) $key],
                    [
                        'value' => $val['value'] ?? '',
                        'group' => $val['group'] ?? 'general',
                        'label' => $val['label'] ?? (string) $key,
                    ]
                );
            } else {
                SystemSetting::updateOrCreate(
                    ['key' => (string) $key],
                    ['value' => (string) $val]
                );
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => 'System settings updated successfully.',
            'data' => SystemSetting::mapAll(),
        ]);
    }

    /**
     * Unified DB lookup endpoint replacing hardcoded frontend dropdowns.
     * GET /api/master/lookups
     */
    public function lookups(Request $request): JsonResponse
    {
        $categoryFilter = $request->query('category');

        $refQuery = ReferenceOption::where('status', 1)->orderBy('category')->orderBy('sort_order')->orderBy('name');
        if ($categoryFilter) {
            $refQuery->where('category', $categoryFilter);
        }
        $referenceOptions = $refQuery->get()->groupBy('category')->map(fn ($group) => $group->map(fn ($r) => [
            'id' => $r->id,
            'code' => $r->code,
            'name' => $r->name,
            'meta' => $r->meta,
        ])->values())->toArray();

        if ($categoryFilter && ! $request->boolean('all')) {
            return response()->json([
                'status' => 'success',
                'data' => $referenceOptions[$categoryFilter] ?? [],
            ]);
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'reference_options' => $referenceOptions,
                'departments' => Department::orderBy('name')->get(['id', 'name', 'status']),
                'sections' => Section::orderBy('name')->get(['id', 'name', 'status']),
                'warehouses' => Warehouse::with(['type', 'coordinates'])->orderBy('name')->get(),
                'warehouse_coordinates' => WarehouseCoordinate::orderBy('name')->get(),
                'warehouse_types' => WarehouseType::orderBy('name')->get(['id', 'name', 'status']),
                'type_of_requests' => TypeOfRequest::orderBy('name')->get(),
                'destination_locations' => DestinationLocation::orderBy('name')->get(),
                'job_numbers' => JobNumber::orderBy('name')->get(),
                'suppliers' => Supplier::orderBy('name')->get(),
                'currencies' => Currency::orderBy('name')->get(['id', 'name', 'status']),
                'valutas' => Valuta::orderBy('code')->get(),
                'po_types' => PoType::orderBy('name')->get(['id', 'code', 'name', 'status']),
                'payment_terms' => PaymentTerm::orderBy('name')->get(['id', 'name', 'status']),
                'payment_methods' => PaymentMethod::orderBy('name')->get(['id', 'name', 'status']),
                'delivery_terms' => DeliveryTerm::orderBy('name')->get(['id', 'name', 'status']),
                'ppn_rates' => Ppn::orderBy('value')->get(['id', 'name', 'value', 'status']),
                'pph_rates' => Pph::with('type')->orderBy('name')->get(),
                'pph_types' => PphType::orderBy('nama')->get(['id', 'nama']),
                'discount_types' => DiscountType::orderBy('name')->get(['id', 'name', 'status']),
                'facilities' => Facility::orderBy('name')->get(['id', 'name', 'description', 'status']),
                'origins' => Origin::orderBy('name')->get(['id', 'name', 'status']),
                'classifications' => Classification::orderBy('name')->get(['id', 'code', 'name', 'status']),
                'categories' => Category::orderBy('name')->get(['id', 'code', 'name', 'status']),
                'brands' => Brand::orderBy('name')->get(['id', 'name', 'status']),
                'colours' => Colour::orderBy('name')->get(['id', 'code', 'grade', 'name', 'status']),
                'units_of_measurements' => UnitOfMeasurement::orderBy('name')->get(['id', 'code', 'name', 'description', 'status']),
                'units' => Unit::orderBy('nama')->get(['id', 'nama', 'status']),
                'item_types' => ItemType::orderBy('name')->get(['id', 'name', 'status']),
                'hs_codes' => HsCode::orderBy('name')->get(),
                'accounts' => Account::orderBy('code')->get(['id', 'code', 'name', 'category', 'status']),
                'countries' => Country::orderBy('name')->get(['id', 'code', 'name', 'status']),
                'ports' => Port::orderBy('name')->get(['id', 'name', 'status']),
                'reporting_types' => ReportingType::orderBy('name')->get(['id', 'name', 'status']),
                'rafaksi_types' => RafaksiType::orderBy('name')->get(['id', 'code', 'name', 'description', 'status']),
                'group_scrap_items' => GroupScrapItem::orderBy('name')->get(['id', 'code', 'name', 'status']),
                'specifications' => Specification::orderBy('name')->get(['id', 'name', 'status']),
                'types_rates_bm' => TypeRateBm::orderBy('name')->get(['id', 'name', 'status']),
                'types_rates_cukai' => TypeRateCukai::orderBy('name')->get(['id', 'name', 'status']),
                'customs_reports' => CustomsReport::orderBy('name')->get(['id', 'name', 'status']),
                'additional_cost_types' => AdditionalCostType::orderBy('name')->get(['id', 'code', 'name', 'status']),
            ],
        ]);
    }
}

