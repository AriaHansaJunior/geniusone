<?php

namespace App\Services;

use App\Services\DocumentNumber\DocumentNumberGenerator;
use App\Services\Procurement\ProcurementCalculationService;
use App\Services\Procurement\PurchaseRequisitionService;
use App\Services\Procurement\PurchaseOrderService;
use App\Services\Procurement\ApprovalWorkflowService;
use App\Services\Warehouse\ReceiveNoteService;
use App\Services\Warehouse\BpbWarehouseService;
use App\Services\Warehouse\WarehouseApprovalService;
use App\Services\Inventory\InventoryService;
use App\Services\Reporting\PrPoTraceabilityService;
use App\ViewModels\PurchaseRequisitionViewModel;
use App\ViewModels\PurchaseOrderViewModel;
use App\ViewModels\ReceiveNoteViewModel;
use App\ViewModels\BpbViewModel;
use App\ViewModels\PrPoTraceabilityViewModel;
use App\Models\Procurement\PurchaseRequest\PurchaseRequisition;
use App\Models\Procurement\PurchaseOrder\PurchaseOrder;
use App\Models\Warehouse\GateReceiving\ReceiveNote;
use App\Models\Warehouse\InboundStorage\BpbReceiveMaterial;
use Illuminate\Support\Collection;

/**
 * Unified Backend Entry Point & Facade for GeniusOne System.
 *
 * Provides a single, clean orchestrator interface connecting all separated domain services:
 * - Procurement (PR, PO, Financial Calculations, Multi-Tier Approvals)
 * - Warehouse & Logistics (Gate Receive Notes, Warehouse Inbound BPB, Warehouse Approvals)
 * - Inventory & Stock Tracking
 * - Cross-Functional Reporting & Traceability
 * - Document Numbering Sequences
 * - Enterprise Audit Trail Logging
 */
class GeniusOneBackend
{
    // =========================================================================
    // MODULAR DOMAIN SERVICE ACCESSORS
    // =========================================================================

    /**
     * Purchase Requisition Service.
     */
    public static function pr(): PurchaseRequisitionService
    {
        return app(PurchaseRequisitionService::class);
    }

    /**
     * Purchase Order Service.
     */
    public static function po(): PurchaseOrderService
    {
        return app(PurchaseOrderService::class);
    }

    /**
     * Procurement Financial Calculation Engine.
     */
    public static function calculation(): ProcurementCalculationService
    {
        return app(ProcurementCalculationService::class);
    }

    /**
     * Procurement Approval Workflow Service (PR & PO Multi-Tier).
     */
    public static function procurementApproval(): ApprovalWorkflowService
    {
        return app(ApprovalWorkflowService::class);
    }

    /**
     * Unified Procurement Domain Accessor.
     */
    public static function procurement(): object
    {
        return new class {
            public function createPr(array $headerData, array $itemsData, int $userId) {
                return GeniusOneBackend::pr()->createPr($headerData, $itemsData, $userId);
            }
            public function createPo(array $headerData, array $items, array $additionalCosts = [], int $userId = 1) {
                return GeniusOneBackend::po()->createPo($headerData, $items, $additionalCosts, $userId);
            }
            public function approvePr(int $id, int $userId, int $tier = 1, ?string $note = null) {
                return GeniusOneBackend::procurementApproval()->approvePr($id, $userId, $tier, $note);
            }
            public function rejectPr(int $id, int $userId, int $tier = 1, ?string $reason = null) {
                return GeniusOneBackend::procurementApproval()->rejectPr($id, $userId, $tier, $reason);
            }
            public function approvePo(int $id, int $userId, int $tier = 1, ?string $note = null) {
                return GeniusOneBackend::procurementApproval()->approvePo($id, $userId, $tier, $note);
            }
            public function rejectPo(int $id, int $userId, int $tier = 1, ?string $reason = null) {
                return GeniusOneBackend::procurementApproval()->rejectPo($id, $userId, $tier, $reason);
            }
        };
    }

    /**
     * Warehouse Receive Note Service (Gate Inbound).
     */
    public static function receiveNote(): ReceiveNoteService
    {
        return app(ReceiveNoteService::class);
    }

    /**
     * Warehouse Inbound BPB Service (Warehouse Storage Allocation).
     */
    public static function bpb(): BpbWarehouseService
    {
        return app(BpbWarehouseService::class);
    }

    /**
     * Warehouse Approval Workflow Service (RN & BPB).
     */
    public static function warehouseApproval(): WarehouseApprovalService
    {
        return app(WarehouseApprovalService::class);
    }

    /**
     * Real-time Inventory & Stock Tracking Service.
     */
    public static function inventory(): InventoryService
    {
        return app(InventoryService::class);
    }

    /**
     * End-to-End Procurement & Warehouse Traceability Service.
     */
    public static function traceability(): PrPoTraceabilityService
    {
        return app(PrPoTraceabilityService::class);
    }

    /**
     * Corporate Standard Document Number Generator.
     */
    public static function numbering(): DocumentNumberGenerator
    {
        return app(DocumentNumberGenerator::class);
    }

    /**
     * Enterprise Activity & Workflow Audit Logger.
     */
    public static function audit(): AuditLogger
    {
        return app(AuditLogger::class);
    }

    /**
     * Check if the currently authenticated user has the specified permission.
     */
    public static function can(string $permission): bool
    {
        $user = \Illuminate\Support\Facades\Auth::user();
        return $user ? $user->hasPermission($permission) : false;
    }

    /**
     * Check if the currently authenticated user has the specified role(s).
     */
    public static function hasRole(string|array $roles): bool
    {
        $user = \Illuminate\Support\Facades\Auth::user();
        return $user ? $user->hasRole($roles) : false;
    }

    // =========================================================================
    // VIEW MODEL / PRESENTATION DTO FACTORIES
    // =========================================================================

    /**
     * Wrap Purchase Requisition in presentation ViewModel.
     */
    public static function prView(PurchaseRequisition $pr): PurchaseRequisitionViewModel
    {
        return new PurchaseRequisitionViewModel($pr);
    }

    /**
     * Wrap Purchase Order in presentation ViewModel.
     */
    public static function poView(PurchaseOrder $po): PurchaseOrderViewModel
    {
        return new PurchaseOrderViewModel($po);
    }

    /**
     * Wrap Receive Note in presentation ViewModel.
     */
    public static function rnView(ReceiveNote $rn): ReceiveNoteViewModel
    {
        return new ReceiveNoteViewModel($rn);
    }

    /**
     * Wrap BPB in presentation ViewModel.
     */
    public static function bpbView(BpbReceiveMaterial $bpb): BpbViewModel
    {
        return new BpbViewModel($bpb);
    }

    /**
     * Wrap Traceability matrix in presentation ViewModel.
     */
    public static function traceabilityView(Collection $rows, array $summary = []): PrPoTraceabilityViewModel
    {
        return new PrPoTraceabilityViewModel($rows, $summary);
    }
}
