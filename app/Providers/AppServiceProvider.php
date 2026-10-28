<?php

namespace App\Providers;

use App\Models\Master\Customs\CustomsReport;
use App\Models\Master\Customs\DocumentHistory;
use App\Models\Master\Customs\DocumentHistoryItem;
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
use App\Models\Master\Material\Item;
use App\Models\Master\Material\ItemType;
use App\Models\Master\Material\Specification;
use App\Models\Master\Material\Style;
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
use App\Models\Procurement\PurchaseOrder\AdditionalCost;
use App\Models\Procurement\PurchaseOrder\AdditionalCostType;
use App\Models\Procurement\PurchaseOrder\ApprovalPo;
use App\Models\Procurement\PurchaseOrder\DiscountType;
use App\Models\Procurement\PurchaseOrder\PoType;
use App\Models\Procurement\PurchaseOrder\PurchaseOrder;
use App\Models\Procurement\PurchaseOrder\PurchaseOrderItem;
use App\Models\Procurement\PurchaseRequest\ApprovalPr;
use App\Models\Procurement\PurchaseRequest\PurchaseRequisition;
use App\Models\Procurement\PurchaseRequest\PurchaseRequisitionItem;
use App\Models\System\Audit\Log;
use App\Models\System\Auth\User;
use App\Models\Warehouse\Facility\Warehouse;
use App\Models\Warehouse\Facility\WarehouseCoordinate;
use App\Models\Warehouse\Facility\WarehouseType;
use App\Models\Warehouse\GateReceiving\ApprovalRn;
use App\Models\Warehouse\GateReceiving\PurchaseOrderReceiveNote;
use App\Models\Warehouse\GateReceiving\ReceiveNote;
use App\Models\Warehouse\GateReceiving\ReceiveNoteReturn;
use App\Models\Warehouse\GateReceiving\ReceiveNoteReturnItem;
use App\Models\Warehouse\InboundStorage\ApprovalBpb;
use App\Models\Warehouse\InboundStorage\BpbReceiveMaterial;
use App\Models\Warehouse\InboundStorage\PoRnToBpb;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Map of legacy root model class names to their modular domain namespaces.
     */
    protected const MODEL_DOMAIN_ALIASES = [
        // 1. Procurement / PurchaseRequest
        'App\Models\PurchaseRequisition' => PurchaseRequisition::class,
        'App\Models\PurchaseRequisitionItem' => PurchaseRequisitionItem::class,
        'App\Models\ApprovalPr' => ApprovalPr::class,

        // 2. Procurement / PurchaseOrder
        'App\Models\PurchaseOrder' => PurchaseOrder::class,
        'App\Models\PurchaseOrderItem' => PurchaseOrderItem::class,
        'App\Models\ApprovalPo' => ApprovalPo::class,
        'App\Models\AdditionalCost' => AdditionalCost::class,
        'App\Models\AdditionalCostType' => AdditionalCostType::class,
        'App\Models\PoType' => PoType::class,
        'App\Models\DiscountType' => DiscountType::class,

        // 3. Warehouse / GateReceiving
        'App\Models\ReceiveNote' => ReceiveNote::class,
        'App\Models\PurchaseOrderReceiveNote' => PurchaseOrderReceiveNote::class,
        'App\Models\ApprovalRn' => ApprovalRn::class,
        'App\Models\ReceiveNoteReturn' => ReceiveNoteReturn::class,
        'App\Models\ReceiveNoteReturnItem' => ReceiveNoteReturnItem::class,

        // 4. Warehouse / InboundStorage
        'App\Models\BpbReceiveMaterial' => BpbReceiveMaterial::class,
        'App\Models\PoRnToBpb' => PoRnToBpb::class,
        'App\Models\ApprovalBpb' => ApprovalBpb::class,

        // 5. Warehouse / Facility
        'App\Models\Warehouse' => Warehouse::class,
        'App\Models\WarehouseType' => WarehouseType::class,
        'App\Models\WarehouseCoordinate' => WarehouseCoordinate::class,

        // 6. Master / Material
        'App\Models\Item' => Item::class,
        'App\Models\ItemType' => ItemType::class,
        'App\Models\Category' => Category::class,
        'App\Models\Classification' => Classification::class,
        'App\Models\Brand' => Brand::class,
        'App\Models\Colour' => Colour::class,
        'App\Models\Style' => Style::class,
        'App\Models\Specification' => Specification::class,
        'App\Models\GroupScrapItem' => GroupScrapItem::class,
        'App\Models\Unit' => Unit::class,
        'App\Models\UnitOfMeasurement' => UnitOfMeasurement::class,

        // 7. Master / Partner
        'App\Models\Supplier' => Supplier::class,
        'App\Models\Origin' => Origin::class,
        'App\Models\Country' => Country::class,
        'App\Models\Port' => Port::class,

        // 8. Master / Finance
        'App\Models\Currency' => Currency::class,
        'App\Models\Valuta' => Valuta::class,
        'App\Models\PaymentTerm' => PaymentTerm::class,
        'App\Models\PaymentMethod' => PaymentMethod::class,
        'App\Models\DeliveryTerm' => DeliveryTerm::class,
        'App\Models\RafaksiType' => RafaksiType::class,
        'App\Models\Ppn' => Ppn::class,
        'App\Models\Pph' => Pph::class,
        'App\Models\PphType' => PphType::class,
        'App\Models\Account' => Account::class,

        // 9. Master / Organization
        'App\Models\Department' => Department::class,
        'App\Models\Section' => Section::class,
        'App\Models\ReportingType' => ReportingType::class,
        'App\Models\JobNumber' => JobNumber::class,

        // 10. Master / Customs
        'App\Models\Facility' => Facility::class,
        'App\Models\HsCode' => HsCode::class,
        'App\Models\TypeRateBm' => TypeRateBm::class,
        'App\Models\TypeRateCukai' => TypeRateCukai::class,
        'App\Models\CustomsReport' => CustomsReport::class,
        'App\Models\DocumentHistory' => DocumentHistory::class,
        'App\Models\DocumentHistoryItem' => DocumentHistoryItem::class,

        // 11. System
        'App\Models\User' => User::class,
        'App\Models\Log' => Log::class,
    ];

    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Register runtime class aliases for backward compatibility
        foreach (self::MODEL_DOMAIN_ALIASES as $legacyClass => $domainClass) {
            if (! class_exists($legacyClass, false)) {
                class_alias($domainClass, $legacyClass);
            }
        }
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
