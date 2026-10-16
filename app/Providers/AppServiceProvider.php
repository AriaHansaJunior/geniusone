<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Map of legacy root model class names to their modular domain namespaces.
     */
    protected const MODEL_DOMAIN_ALIASES = [
        // 1. Procurement / PurchaseRequest
        'App\Models\PurchaseRequisition' => \App\Models\Procurement\PurchaseRequest\PurchaseRequisition::class,
        'App\Models\PurchaseRequisitionItem' => \App\Models\Procurement\PurchaseRequest\PurchaseRequisitionItem::class,
        'App\Models\ApprovalPr' => \App\Models\Procurement\PurchaseRequest\ApprovalPr::class,

        // 2. Procurement / PurchaseOrder
        'App\Models\PurchaseOrder' => \App\Models\Procurement\PurchaseOrder\PurchaseOrder::class,
        'App\Models\PurchaseOrderItem' => \App\Models\Procurement\PurchaseOrder\PurchaseOrderItem::class,
        'App\Models\ApprovalPo' => \App\Models\Procurement\PurchaseOrder\ApprovalPo::class,
        'App\Models\AdditionalCost' => \App\Models\Procurement\PurchaseOrder\AdditionalCost::class,
        'App\Models\AdditionalCostType' => \App\Models\Procurement\PurchaseOrder\AdditionalCostType::class,
        'App\Models\PoType' => \App\Models\Procurement\PurchaseOrder\PoType::class,
        'App\Models\DiscountType' => \App\Models\Procurement\PurchaseOrder\DiscountType::class,

        // 3. Warehouse / GateReceiving
        'App\Models\ReceiveNote' => \App\Models\Warehouse\GateReceiving\ReceiveNote::class,
        'App\Models\PurchaseOrderReceiveNote' => \App\Models\Warehouse\GateReceiving\PurchaseOrderReceiveNote::class,
        'App\Models\ApprovalRn' => \App\Models\Warehouse\GateReceiving\ApprovalRn::class,
        'App\Models\ReceiveNoteReturn' => \App\Models\Warehouse\GateReceiving\ReceiveNoteReturn::class,
        'App\Models\ReceiveNoteReturnItem' => \App\Models\Warehouse\GateReceiving\ReceiveNoteReturnItem::class,

        // 4. Warehouse / InboundStorage
        'App\Models\BpbReceiveMaterial' => \App\Models\Warehouse\InboundStorage\BpbReceiveMaterial::class,
        'App\Models\PoRnToBpb' => \App\Models\Warehouse\InboundStorage\PoRnToBpb::class,
        'App\Models\ApprovalBpb' => \App\Models\Warehouse\InboundStorage\ApprovalBpb::class,

        // 5. Warehouse / Facility
        'App\Models\Warehouse' => \App\Models\Warehouse\Facility\Warehouse::class,
        'App\Models\WarehouseType' => \App\Models\Warehouse\Facility\WarehouseType::class,
        'App\Models\WarehouseCoordinate' => \App\Models\Warehouse\Facility\WarehouseCoordinate::class,

        // 6. Master / Material
        'App\Models\Item' => \App\Models\Master\Material\Item::class,
        'App\Models\ItemType' => \App\Models\Master\Material\ItemType::class,
        'App\Models\Category' => \App\Models\Master\Material\Category::class,
        'App\Models\Classification' => \App\Models\Master\Material\Classification::class,
        'App\Models\Brand' => \App\Models\Master\Material\Brand::class,
        'App\Models\Colour' => \App\Models\Master\Material\Colour::class,
        'App\Models\Style' => \App\Models\Master\Material\Style::class,
        'App\Models\Specification' => \App\Models\Master\Material\Specification::class,
        'App\Models\GroupScrapItem' => \App\Models\Master\Material\GroupScrapItem::class,
        'App\Models\Unit' => \App\Models\Master\Material\Unit::class,
        'App\Models\UnitOfMeasurement' => \App\Models\Master\Material\UnitOfMeasurement::class,

        // 7. Master / Partner
        'App\Models\Supplier' => \App\Models\Master\Partner\Supplier::class,
        'App\Models\Origin' => \App\Models\Master\Partner\Origin::class,
        'App\Models\Country' => \App\Models\Master\Partner\Country::class,
        'App\Models\Port' => \App\Models\Master\Partner\Port::class,

        // 8. Master / Finance
        'App\Models\Currency' => \App\Models\Master\Finance\Currency::class,
        'App\Models\Valuta' => \App\Models\Master\Finance\Valuta::class,
        'App\Models\PaymentTerm' => \App\Models\Master\Finance\PaymentTerm::class,
        'App\Models\PaymentMethod' => \App\Models\Master\Finance\PaymentMethod::class,
        'App\Models\DeliveryTerm' => \App\Models\Master\Finance\DeliveryTerm::class,
        'App\Models\RafaksiType' => \App\Models\Master\Finance\RafaksiType::class,
        'App\Models\Ppn' => \App\Models\Master\Finance\Ppn::class,
        'App\Models\Pph' => \App\Models\Master\Finance\Pph::class,
        'App\Models\PphType' => \App\Models\Master\Finance\PphType::class,
        'App\Models\Account' => \App\Models\Master\Finance\Account::class,

        // 9. Master / Organization
        'App\Models\Department' => \App\Models\Master\Organization\Department::class,
        'App\Models\Section' => \App\Models\Master\Organization\Section::class,
        'App\Models\ReportingType' => \App\Models\Master\Organization\ReportingType::class,
        'App\Models\JobNumber' => \App\Models\Master\Organization\JobNumber::class,

        // 10. Master / Customs
        'App\Models\Facility' => \App\Models\Master\Customs\Facility::class,
        'App\Models\HsCode' => \App\Models\Master\Customs\HsCode::class,
        'App\Models\TypeRateBm' => \App\Models\Master\Customs\TypeRateBm::class,
        'App\Models\TypeRateCukai' => \App\Models\Master\Customs\TypeRateCukai::class,
        'App\Models\CustomsReport' => \App\Models\Master\Customs\CustomsReport::class,
        'App\Models\DocumentHistory' => \App\Models\Master\Customs\DocumentHistory::class,
        'App\Models\DocumentHistoryItem' => \App\Models\Master\Customs\DocumentHistoryItem::class,

        // 11. System
        'App\Models\User' => \App\Models\System\Auth\User::class,
        'App\Models\Log' => \App\Models\System\Audit\Log::class,
    ];

    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Register runtime class aliases for backward compatibility
        foreach (self::MODEL_DOMAIN_ALIASES as $legacyClass => $domainClass) {
            if (!class_exists($legacyClass, false)) {
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
