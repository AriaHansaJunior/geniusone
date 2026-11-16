import React from "react";
import {
  Dashboard,
  PurchaseRequisition,
  PurchaseOrder,
  PurchaseOrderReport,
  PurchaseRequisitionReport,
  ReportingPurchaseOrder,
  SupplierIndex,
  SupplierForm,
  PaymentTermIndex,
  PaymentTermForm,
  PurchaseCategoryIndex,
  PurchaseCategoryForm,
  DeliveryTermsIndex,
  DeliveryTermsForm,
  AdditionalCostsIndex,
  AdditionalCostsForm,
  PphIndex,
  PphForm,
  UnitIndex,
  UnitForm,
  UnitReferenceIndex,
  UnitReferenceForm,
  ClassificationIndex,
  ClassificationForm,
  DepartmentIndex,
  DepartmentForm,
  BrandIndex,
  BrandForm,
  FacilityIndex,
  FacilityForm,
  HsIndex,
  HsForm,
  CategoryIndex,
  CategoryForm,
  StyleIndex,
  StyleForm,
  StyleImport,
  ColorIndex,
  ColorForm,
  ReceiveNoteIndex,
  ReceiveNoteDetail,
  ReceiveNoteForm,
  ReceiveNoteReturnIndex,
  ReceiveNoteReturnDetail,
  ReceiveNoteReturnForm,
  DocumentHistoryIndex,
  DocumentHistoryDetail,
  MasterWarehouseIndex,
  WarehouseCoordinateIndex,
  WarehouseMasterForm,
  WarehouseCoordinateForm,
  ItemIndex,
  ItemForm,
  GenerateQrCodePage,
  Warehouse,
  PurchaseRequisitionDetail,
  PurchaseOrderDetail,
  PurchaseOrderReportDetail,
  WarehouseDetail,
  WarehouseCreate,
  EditProfile,
  PlaceholderPage,
  NotFoundPage,
  CountryIndex,
  CountryForm,
  AccountIndex,
  AccountForm,
  JobNumberIndex,
  JobNumberForm,
  RafaksiTypeIndex,
  RafaksiTypeForm,
  CurrencyIndex,
  CurrencyForm,
  PurchaseRequisitionCreate,
  PurchaseOrderCreate,
  StockCardIndex,
  StockItemIndex,
  RequestMaterialIndex,
  RequestMaterialCreate,
  RequestMaterialDetail,
  StockNotificationIndex,
  StockNotificationForm,
  TypeOfRequestIndex,
  TypeOfRequestForm,
  DestinationLocationIndex,
  DestinationLocationForm,
  TransferStockReturnIndex,
  TransferStockReturnForm,
  TransferStockReturnDetail,
  UserPermissionAdmin,
  AuditLogAdmin,
  ReferenceMasterIndex,
  ReferenceMasterForm,
} from "../pages";
import { docToSlug } from "../utils/docSlug";
import { REFERENCE_MASTER_CONFIGS } from "../pages/Common/ReferenceMaster/reference-master-config";
import type {
  ReferenceMasterPageKey,
  ReferenceMasterRecord,
} from "../pages/Common/ReferenceMaster/reference-master-types";
import type { PageKey, SettingsTab, ViewState, TableRow } from "../types";
import { SettingsWorkspace } from "../pages/Settings/SettingsWorkspace";
import type { RequestMaterialRecord } from "../pages/Warehouse/Request/RequestMaterial/request-material-types";
import type { StockNotificationRecord } from "../pages/Dashboard/StockNotificationMaster/stock-notification-types";
import type { TypeOfRequestRecord } from "../pages/Warehouse/Master/TypeOfRequest/type-of-request-types";
import type { DestinationLocationRecord } from "../pages/Warehouse/Master/DestinationLocation/destination-location-types";
import type { PphRecord } from "../pages/Procurement/PurchaseMaster/Pph/pph-types";
import type { SupplierRecord, SupplierFormData } from "../pages/Procurement/PurchaseMaster/Supplier/supplier-types";
import type { PaymentTermRecord } from "../pages/Procurement/PurchaseMaster/PaymentTerm/payment-term-types";
import type { PurchaseCategoryRecord } from "../pages/Procurement/PurchaseMaster/PurchaseCategory/purchase-category-types";
import type { DeliveryTermRecord } from "../pages/Procurement/PurchaseMaster/DeliveryTerms/delivery-terms-types";
import type { AdditionalCostRecord } from "../pages/Procurement/PurchaseMaster/AdditionalCosts/additional-costs-types";
import type { UnitRecord } from "../pages/Exim/Master/Unit/unit-types";
import type {
  ClassificationRecord,
  ReportingTypeOption,
} from "../pages/Exim/Master/Classification/classification-types";
import type { DepartmentRecord } from "../pages/Exim/Master/Department/department-types";
import type { BrandRecord } from "../pages/Exim/Master/Brand/brand-types";
import type { FacilityRecord } from "../pages/Exim/Master/Facility/facility-types";
import type { HsRecord } from "../pages/Exim/Master/Hs/hs-types";
import type { CategoryRecord } from "../pages/Exim/Master/Category/category-types";
import type { StyleRecord } from "../pages/Exim/Master/Style/style-types";
import type { ColorRecord } from "../pages/Exim/Master/Color/color-types";
import type { ReceiveNoteRecord } from "../pages/Exim/ReceiveNote/receive-note-types";
import type { ReceiveNoteReturnRecord } from "../pages/Exim/ReceiveNoteReturn/receive-note-return-types";
import type { DocumentHistoryRecord } from "../pages/Exim/DocumentHistory/document-history-types";
import type {
  WarehouseMasterRecord,
  WarehouseCoordinateRecord,
  WarehouseTypeOption,
} from "../pages/Warehouse/MasterWarehouse/warehouse-master-types";
import type { ItemRecord } from "../pages/Exim/Master/Item/item-types";
import type { CountryRecord } from "../pages/Exim/Master/Country/country-types";
import type { CountryFormData } from "../pages/Exim/Master/Country/CountryForm";
import type { AccountRecord } from "../pages/Exim/Master/Account/account-types";
import type { AccountFormData } from "../pages/Exim/Master/Account/AccountForm";
import type { JobNumberRecord } from "../pages/Procurement/PurchaseMaster/JobNumber/job-number-types";
import type { JobNumberFormData } from "../pages/Procurement/PurchaseMaster/JobNumber/JobNumberForm";
import type { RafaksiTypeRecord } from "../pages/Procurement/PurchaseMaster/RafaksiType/rafaksi-type-types";
import type { RafaksiTypeFormData } from "../pages/Procurement/PurchaseMaster/RafaksiType/RafaksiTypeForm";
import type { CurrencyRecord } from "../pages/Exim/Master/Currency/currency-types";
import type { CurrencyFormData } from "../pages/Exim/Master/Currency/CurrencyForm";
import type { TransferStockReturnRecord } from "../pages/Warehouse/TransferStockReturn/transfer-stock-return-types";
import type { UnitReferenceRecord } from "../pages/Exim/Master/UnitReference/unit-reference-types";

export interface AppViewRendererProps {
  viewState: ViewState;
  currentMeta: { eyebrow: string; title: string };
  handleNavigateList: (targetPage: PageKey, targetPath?: string) => void;
  handleNavigateDetail: (module: "pr" | "po" | "report" | "warehouse", identifier: string) => void;
  handleNavigateCreate: (
    module:
      | "warehouse"
      | "supplier"
      | "payment-term"
      | "purchase-category"
      | "delivery-terms"
      | "additional-costs"
      | "pph"
      | "unit"
      | "classification"
      | "department"
      | "brand"
      | "facility"
      | "hs"
      | "category"
      | "style"
      | "colour"
      | "color"
      | "item"
      | "receive-note"
      | "receive-note-return",
    poNumber?: string,
    rnNumber?: string
  ) => void;
  handleNavigatePrCreate: () => void;
  handleNavigatePoCreate: () => void;
  handleNavigateReceiveNoteDetail: (rnNumber: string) => void;
  handleNavigateReceiveNoteReturnDetail: (rnNumber: string) => void;
  handleNavigateDocumentHistoryDetail: (invoiceNumber: string) => void;
  handleNavigateRequestMaterialCreate: () => void;
  handleNavigateRequestMaterialDetail: (id: string) => void;
  handleNavigateTransferStockReturnCreate: () => void;
  handleNavigateTransferStockReturnEdit: (recordOrCode: TransferStockReturnRecord | string) => void;
  handleNavigateTransferStockReturnDetail: (code: string) => void;
  handleNavigateReferenceCreate: (page: ReferenceMasterPageKey) => void;
  handleNavigateMasterWarehouseCreate: () => void;
  handleNavigateWarehouseMasterEdit: (warehouse: WarehouseMasterRecord) => void;
  handleDeleteWarehouseMaster: (id: string) => Promise<void>;
  handleToggleWarehouseMasterStatus: (id: string) => Promise<void> | void;
  handleNavigateWarehouseCoordinates: (warehouse: WarehouseMasterRecord) => void;
  handleNavigateWarehouseCoordinateCreate: (warehouseId: string) => void;
  handleNavigateStockNotificationCreate: () => void;
  handleEditStockNotification: (record: StockNotificationRecord) => void;
  handleSaveStockNotification: (record: StockNotificationRecord, isEdit: boolean) => Promise<void> | void;
  handleDeleteStockNotification: (id: string) => Promise<void> | void;
  handleToggleStockNotificationStatus?: (id: string) => Promise<void> | void;
  handleNavigateTypeOfRequestCreate: () => void;
  handleEditTypeOfRequest: (record: TypeOfRequestRecord) => void;
  handleSaveTypeOfRequest: (record: TypeOfRequestRecord, isEdit: boolean) => Promise<void> | void;
  handleDeleteTypeOfRequest: (id: string) => Promise<void> | void;
  handleToggleTypeOfRequestStatus?: (id: string) => Promise<void> | void;
  handleNavigateDestinationLocationCreate: () => void;
  handleEditDestinationLocation: (record: DestinationLocationRecord) => void;
  handleSaveDestinationLocation: (record: DestinationLocationRecord, isEdit: boolean) => Promise<void> | void;
  handleDeleteDestinationLocation: (id: string) => Promise<void> | void;
  handleToggleDestinationLocationStatus?: (id: string) => Promise<void> | void;
  handleToggleSupplierHide: (id: string) => void;
  handleTogglePaymentTermHide: (id: string) => void;
  handleTogglePurchaseCategoryHide: (id: string) => void;
  handleToggleDeliveryTermHide: (id: string) => void;
  handleToggleAdditionalCostHide: (id: string) => void;
  handleTogglePphHide: (id: string) => void;
  handleNavigateSupplierEdit: (record: SupplierRecord) => void;
  handleDeleteSupplier: (id: string) => Promise<void>;
  handleSaveSupplier: (formData: SupplierFormData, editId?: string) => Promise<void>;
  handleNavigatePaymentTermEdit: (record: PaymentTermRecord) => void;
  handleDeletePaymentTerm: (id: string) => Promise<void>;
  handleSavePaymentTerm: (data: { name: string }, editId?: string) => Promise<void>;
  handleNavigatePurchaseCategoryEdit: (record: PurchaseCategoryRecord) => void;
  handleDeletePurchaseCategory: (id: string) => Promise<void>;
  handleSavePurchaseCategory: (data: { code: string; name: string }, editId?: string) => Promise<void>;
  handleNavigateDeliveryTermEdit: (record: DeliveryTermRecord) => void;
  handleDeleteDeliveryTerm: (id: string) => Promise<void>;
  handleSaveDeliveryTerm: (data: { name: string }, editId?: string) => Promise<void>;
  handleNavigateAdditionalCostEdit: (record: AdditionalCostRecord) => void;
  handleDeleteAdditionalCost: (id: string) => Promise<void>;
  handleSaveAdditionalCost: (data: { code: string; name: string }, editId?: string) => Promise<void>;
  handleNavigatePphEdit: (record: PphRecord) => void;
  handleDeletePph: (id: string) => Promise<void>;
  handleSavePph: (newRec: PphRecord, isEdit?: boolean) => Promise<void>;
  handleNavigateUnitEdit: (unit: UnitRecord) => void;
  handleSaveUnit: (record: UnitRecord, isEdit: boolean) => Promise<void>;
  handleDeleteUnit: (id: string) => Promise<void>;
  handleToggleUnitStatus: (id: string) => Promise<void> | void;
  handleNavigateUnitReferenceCreate: () => void;
  handleNavigateUnitReferenceEdit: (record: UnitReferenceRecord) => void;
  handleSaveUnitReference: (data: Partial<UnitReferenceRecord>, id?: string) => Promise<void>;
  handleDeleteUnitReference: (id: string) => Promise<void>;
  handleToggleUnitReferenceStatus: (id: string) => Promise<void> | void;
  isUnitReferencesLoading?: boolean;
  handleNavigateClassificationEdit: (cls: ClassificationRecord) => void;
  handleSaveClassification: (record: ClassificationRecord, isEdit: boolean) => Promise<void>;
  handleDeleteClassification: (id: string) => Promise<void>;
  handleToggleClassificationStatus: (id: string) => void;
  handleNavigateDepartmentEdit: (dept: DepartmentRecord) => void;
  handleSaveDepartment: (record: DepartmentRecord, isEdit: boolean) => Promise<void>;
  handleDeleteDepartment: (id: string) => Promise<void>;
  handleToggleDepartmentStatus: (id: string) => void;
  handleNavigateBrandEdit: (brand: BrandRecord) => void;
  handleSaveBrand: (record: BrandRecord, isEdit: boolean) => Promise<void>;
  handleDeleteBrand: (id: string) => Promise<void>;
  handleToggleBrandStatus: (id: string) => void;
  handleNavigateFacilityEdit: (fac: FacilityRecord) => void;
  handleSaveFacility: (record: FacilityRecord, isEdit: boolean) => Promise<void>;
  handleDeleteFacility: (id: string) => Promise<void>;
  handleToggleFacilityStatus: (id: string) => void;
  handleNavigateHsEdit: (hs: HsRecord) => void;
  handleSaveHs: (record: HsRecord, isEdit: boolean) => Promise<void>;
  handleDeleteHs: (id: string) => Promise<void>;
  handleNavigateCategoryEdit: (cat: CategoryRecord) => void;
  handleSaveCategory: (record: CategoryRecord, isEdit: boolean) => Promise<void>;
  handleDeleteCategory: (id: string) => Promise<void>;
  handleToggleCategoryStatus: (id: string) => void;
  handleNavigateStyleEdit: (style: StyleRecord) => void;
  handleNavigateStyleImport: () => void;
  handleSaveStyle: (record: StyleRecord, isEdit: boolean) => Promise<void>;
  handleDeleteStyle: (id: string) => Promise<void>;
  handleToggleStyleStatus: (id: string) => void;
  handleNavigateColorEdit: (record: ColorRecord) => void;
  handleSaveColor: (record: ColorRecord, isEdit?: boolean) => Promise<void>;
  handleDeleteColor: (id: string) => Promise<void>;
  handleToggleColorStatus: (id: string) => Promise<void> | void;
  handleSaveReceiveNote: (newRecord: ReceiveNoteRecord) => Promise<void>;
  handleSaveReceiveNoteReturn: (newRecord: ReceiveNoteReturnRecord) => Promise<void>;
  handleSaveWarehouseMaster: (newWarehouse: WarehouseMasterRecord, isEdit?: boolean) => Promise<void>;
  isWarehouseTypesLoading?: boolean;
  handleSaveWarehouseCoordinate: (newCoordinate: WarehouseCoordinateRecord) => Promise<void>;
  handleDeleteWarehouseCoordinate: (warehouseId: string, coordinateId: string) => Promise<void>;
  handleToggleWarehouseCoordinateStatus?: (warehouseId: string, coordinateId: string) => Promise<void>;
  handleNavigateCountryCreate: () => void;
  handleNavigateCountryEdit: (record: CountryRecord) => void;
  handleSaveCountry: (data: CountryFormData, id?: string) => Promise<void>;
  handleDeleteCountry: (id: string) => Promise<void>;
  handleToggleCountryStatus: (id: string) => Promise<void>;
  isCountriesLoading?: boolean;
  handleNavigateAccountCreate: () => void;
  handleNavigateAccountEdit: (record: AccountRecord) => void;
  handleSaveAccount: (data: AccountFormData, id?: string) => Promise<void>;
  handleDeleteAccount: (id: string) => Promise<void>;
  handleToggleAccountStatus: (id: string) => Promise<void>;
  isAccountsLoading?: boolean;
  isReportingTypesLoading?: boolean;
  handleNavigateJobNumberCreate: () => void;
  handleNavigateJobNumberEdit: (record: JobNumberRecord) => void;
  handleSaveJobNumber: (data: JobNumberFormData, id?: string) => Promise<void>;
  handleDeleteJobNumber: (id: string) => Promise<void>;
  handleToggleJobNumberStatus: (id: string) => Promise<void>;
  isJobNumbersLoading?: boolean;
  handleNavigateRafaksiTypeCreate: () => void;
  handleNavigateRafaksiTypeEdit: (record: RafaksiTypeRecord) => void;
  handleSaveRafaksiType: (data: RafaksiTypeFormData, id?: string) => Promise<void>;
  handleDeleteRafaksiType: (id: string) => Promise<void>;
  handleToggleRafaksiTypeStatus: (id: string) => Promise<void>;
  isRafaksiTypesLoading?: boolean;
  handleNavigateCurrencyCreate: () => void;
  handleNavigateCurrencyEdit: (record: CurrencyRecord) => void;
  handleSaveCurrency: (data: CurrencyFormData, id?: string) => Promise<void>;
  handleDeleteCurrency: (id: string) => Promise<void>;
  handleToggleCurrencyStatus: (id: string) => Promise<void> | void;
  isCurrenciesLoading?: boolean;
  handleNavigateGenerateQr: () => void;
  handleNavigateItemEdit: (item: ItemRecord) => void;
  handleSaveItem: (record: ItemRecord, isEdit: boolean) => Promise<void>;
  handleDeleteItem: (id: string) => Promise<void>;
  handleToggleItemStatus: (id: string) => Promise<void> | void;
  handleSaveRequestMaterial: (newRecord: RequestMaterialRecord) => Promise<void>;
  handleProfileCancel: () => void;
  handleProfileSaveConfirmed: () => void;
  handleNavigateSettings?: (tab?: SettingsTab) => void;
  handleExitSettings?: () => void;
  // State Records & Setters
  supplierRecords: SupplierRecord[];
  editingSupplier: SupplierRecord | null;
  setEditingSupplier: React.Dispatch<React.SetStateAction<SupplierRecord | null>>;
  paymentTermRecords: PaymentTermRecord[];
  editingPaymentTerm: PaymentTermRecord | null;
  setEditingPaymentTerm: React.Dispatch<React.SetStateAction<PaymentTermRecord | null>>;
  purchaseCategoryRecords: PurchaseCategoryRecord[];
  editingPurchaseCategory: PurchaseCategoryRecord | null;
  setEditingPurchaseCategory: React.Dispatch<React.SetStateAction<PurchaseCategoryRecord | null>>;
  deliveryTermRecords: DeliveryTermRecord[];
  editingDeliveryTerm: DeliveryTermRecord | null;
  setEditingDeliveryTerm: React.Dispatch<React.SetStateAction<DeliveryTermRecord | null>>;
  additionalCostRecords: AdditionalCostRecord[];
  editingAdditionalCost: AdditionalCostRecord | null;
  setEditingAdditionalCost: React.Dispatch<React.SetStateAction<AdditionalCostRecord | null>>;
  pphRecords: PphRecord[];
  editingPph: PphRecord | null;
  setEditingPph: React.Dispatch<React.SetStateAction<PphRecord | null>>;
  unitRecords: UnitRecord[];
  editingUnit: UnitRecord | null;
  setEditingUnit: React.Dispatch<React.SetStateAction<UnitRecord | null>>;
  unitReferenceRecords: UnitReferenceRecord[];
  classificationRecords: ClassificationRecord[];
  reportingTypeRecords: ReportingTypeOption[];
  editingClassification: ClassificationRecord | null;
  setEditingClassification: React.Dispatch<React.SetStateAction<ClassificationRecord | null>>;
  departmentRecords: DepartmentRecord[];
  isDepartmentsLoading?: boolean;
  editingDepartment: DepartmentRecord | null;
  setEditingDepartment: React.Dispatch<React.SetStateAction<DepartmentRecord | null>>;
  brandRecords: BrandRecord[];
  editingBrand: BrandRecord | null;
  setEditingBrand: React.Dispatch<React.SetStateAction<BrandRecord | null>>;
  facilityRecords: FacilityRecord[];
  editingFacility: FacilityRecord | null;
  setEditingFacility: React.Dispatch<React.SetStateAction<FacilityRecord | null>>;
  hsRecords: HsRecord[];
  editingHs: HsRecord | null;
  setEditingHs: React.Dispatch<React.SetStateAction<HsRecord | null>>;
  categoryRecords: CategoryRecord[];
  editingCategory: CategoryRecord | null;
  setEditingCategory: React.Dispatch<React.SetStateAction<CategoryRecord | null>>;
  styleRecords: StyleRecord[];
  editingStyle: StyleRecord | null;
  setEditingStyle: React.Dispatch<React.SetStateAction<StyleRecord | null>>;
  colorRecords: ColorRecord[];
  editingColor: ColorRecord | null;
  setEditingColor: React.Dispatch<React.SetStateAction<ColorRecord | null>>;
  itemRecords: ItemRecord[];
  editingItem: ItemRecord | null;
  setEditingItem: React.Dispatch<React.SetStateAction<ItemRecord | null>>;
  receiveNoteRecords: ReceiveNoteRecord[];
  setReceiveNoteRecords: React.Dispatch<React.SetStateAction<ReceiveNoteRecord[]>>;
  receiveNoteReturnRecords: ReceiveNoteReturnRecord[];
  documentHistoryRecords: DocumentHistoryRecord[];
  warehouseMasterRecords: WarehouseMasterRecord[];
  editingWarehouseMaster: WarehouseMasterRecord | null;
  setEditingWarehouseMaster: React.Dispatch<React.SetStateAction<WarehouseMasterRecord | null>>;
  warehouseTypeRecords: WarehouseTypeOption[];
  referenceRecordsMap: Partial<Record<ReferenceMasterPageKey, ReferenceMasterRecord[]>>;
  masterFetchStates: Record<string, "loading" | "done">;
  countryRecords: CountryRecord[];
  accountRecords: AccountRecord[];
  jobNumberRecords: JobNumberRecord[];
  rafaksiTypeRecords: RafaksiTypeRecord[];
  currencyRecords: CurrencyRecord[];
  requestMaterialRecords: RequestMaterialRecord[];
  stockNotificationRecords: StockNotificationRecord[];
  editingStockNotification: StockNotificationRecord | null;
  setEditingStockNotification: React.Dispatch<React.SetStateAction<StockNotificationRecord | null>>;
  typeOfRequestRecords: TypeOfRequestRecord[];
  editingTypeOfRequest: TypeOfRequestRecord | null;
  setEditingTypeOfRequest: React.Dispatch<React.SetStateAction<TypeOfRequestRecord | null>>;
  destinationLocationRecords: DestinationLocationRecord[];
  editingDestinationLocation: DestinationLocationRecord | null;
  setEditingDestinationLocation: React.Dispatch<React.SetStateAction<DestinationLocationRecord | null>>;
}

export function AppViewRenderer({
  viewState,
  currentMeta,
  handleNavigateList,
  handleNavigateDetail,
  handleNavigateCreate,
  handleNavigatePrCreate,
  handleNavigatePoCreate,
  handleNavigateReceiveNoteDetail,
  handleNavigateReceiveNoteReturnDetail,
  handleNavigateDocumentHistoryDetail,
  handleNavigateRequestMaterialCreate,
  handleNavigateRequestMaterialDetail,
  handleNavigateTransferStockReturnCreate,
  handleNavigateTransferStockReturnEdit,
  handleNavigateTransferStockReturnDetail,
  handleNavigateReferenceCreate,
  handleNavigateMasterWarehouseCreate,
  handleNavigateWarehouseMasterEdit,
  handleDeleteWarehouseMaster,
  handleToggleWarehouseMasterStatus,
  handleNavigateWarehouseCoordinates,
  handleNavigateWarehouseCoordinateCreate,
  handleNavigateStockNotificationCreate,
  handleEditStockNotification,
  handleSaveStockNotification,
  handleDeleteStockNotification,
  handleToggleStockNotificationStatus,
  handleNavigateTypeOfRequestCreate,
  handleEditTypeOfRequest,
  handleSaveTypeOfRequest,
  handleDeleteTypeOfRequest,
  handleToggleTypeOfRequestStatus,
  handleNavigateDestinationLocationCreate,
  handleEditDestinationLocation,
  handleSaveDestinationLocation,
  handleDeleteDestinationLocation,
  handleToggleDestinationLocationStatus,
  handleToggleSupplierHide,
  handleTogglePaymentTermHide,
  handleTogglePurchaseCategoryHide,
  handleToggleDeliveryTermHide,
  handleToggleAdditionalCostHide,
  handleTogglePphHide,
  handleNavigateSupplierEdit,
  handleDeleteSupplier,
  handleSaveSupplier,
  handleNavigatePaymentTermEdit,
  handleDeletePaymentTerm,
  handleSavePaymentTerm,
  handleNavigatePurchaseCategoryEdit,
  handleDeletePurchaseCategory,
  handleSavePurchaseCategory,
  handleNavigateDeliveryTermEdit,
  handleDeleteDeliveryTerm,
  handleSaveDeliveryTerm,
  handleNavigateAdditionalCostEdit,
  handleDeleteAdditionalCost,
  handleSaveAdditionalCost,
  handleNavigatePphEdit,
  handleDeletePph,
  handleSavePph,
  handleNavigateUnitEdit,
  handleSaveUnit,
  handleDeleteUnit,
  handleToggleUnitStatus,
  handleNavigateUnitReferenceCreate,
  handleNavigateUnitReferenceEdit,
  handleSaveUnitReference,
  handleDeleteUnitReference,
  handleToggleUnitReferenceStatus,
  isUnitReferencesLoading = false,
  handleNavigateClassificationEdit,
  handleSaveClassification,
  handleDeleteClassification,
  handleToggleClassificationStatus,
  handleNavigateDepartmentEdit,
  handleSaveDepartment,
  handleDeleteDepartment,
  handleToggleDepartmentStatus,
  handleNavigateBrandEdit,
  handleSaveBrand,
  handleDeleteBrand,
  handleToggleBrandStatus,
  handleNavigateFacilityEdit,
  handleSaveFacility,
  handleDeleteFacility,
  handleToggleFacilityStatus,
  handleNavigateHsEdit,
  handleSaveHs,
  handleDeleteHs,
  handleNavigateCategoryEdit,
  handleSaveCategory,
  handleDeleteCategory,
  handleToggleCategoryStatus,
  handleNavigateStyleEdit,
  handleNavigateStyleImport,
  handleSaveStyle,
  handleDeleteStyle,
  handleToggleStyleStatus,
  handleNavigateColorEdit,
  handleSaveColor,
  handleDeleteColor,
  handleToggleColorStatus,
  handleSaveReceiveNote,
  handleSaveReceiveNoteReturn,
  handleSaveWarehouseMaster,
  isWarehouseTypesLoading,
  handleSaveWarehouseCoordinate,
  handleDeleteWarehouseCoordinate,
  handleToggleWarehouseCoordinateStatus,
  handleNavigateCountryCreate,
  handleNavigateCountryEdit,
  handleSaveCountry,
  handleNavigateAccountCreate,
  handleNavigateAccountEdit,
  handleSaveAccount,
  handleDeleteCountry,
  handleToggleCountryStatus,
  isCountriesLoading = false,
  handleDeleteAccount,
  handleToggleAccountStatus,
  isAccountsLoading = false,
  isReportingTypesLoading = false,
  handleNavigateJobNumberCreate,
  handleNavigateJobNumberEdit,
  handleSaveJobNumber,
  handleDeleteJobNumber,
  handleToggleJobNumberStatus,
  isJobNumbersLoading = false,
  handleNavigateRafaksiTypeCreate,
  handleNavigateRafaksiTypeEdit,
  handleSaveRafaksiType,
  handleDeleteRafaksiType,
  handleToggleRafaksiTypeStatus,
  isRafaksiTypesLoading = false,
  handleNavigateCurrencyCreate,
  handleNavigateCurrencyEdit,
  handleSaveCurrency,
  handleDeleteCurrency,
  handleToggleCurrencyStatus,
  isCurrenciesLoading = false,
  handleNavigateGenerateQr,
  handleNavigateItemEdit,
  handleSaveItem,
  handleDeleteItem,
  handleToggleItemStatus,
  handleSaveRequestMaterial,
  handleProfileCancel,
  handleProfileSaveConfirmed,
  handleNavigateSettings,
  handleExitSettings,
  supplierRecords,
  editingSupplier,
  setEditingSupplier,
  paymentTermRecords,
  editingPaymentTerm,
  setEditingPaymentTerm,
  purchaseCategoryRecords,
  editingPurchaseCategory,
  setEditingPurchaseCategory,
  deliveryTermRecords,
  editingDeliveryTerm,
  setEditingDeliveryTerm,
  additionalCostRecords,
  editingAdditionalCost,
  setEditingAdditionalCost,
  pphRecords,
  editingPph,
  setEditingPph,
  unitRecords,
  editingUnit,
  setEditingUnit,
  unitReferenceRecords,
  classificationRecords,
  reportingTypeRecords,
  editingClassification,
  setEditingClassification,
  departmentRecords,
  isDepartmentsLoading,
  editingDepartment,
  setEditingDepartment,
  brandRecords,
  editingBrand,
  setEditingBrand,
  facilityRecords,
  editingFacility,
  setEditingFacility,
  hsRecords,
  editingHs,
  setEditingHs,
  categoryRecords,
  editingCategory,
  setEditingCategory,
  styleRecords,
  editingStyle,
  setEditingStyle,
  colorRecords,
  editingColor,
  setEditingColor,
  itemRecords,
  editingItem,
  setEditingItem,
  receiveNoteRecords,
  setReceiveNoteRecords,
  receiveNoteReturnRecords,
  documentHistoryRecords,
  warehouseMasterRecords,
  editingWarehouseMaster,
  setEditingWarehouseMaster,
  warehouseTypeRecords,
  referenceRecordsMap,
  masterFetchStates,
  countryRecords,
  accountRecords,
  jobNumberRecords,
  rafaksiTypeRecords,
  currencyRecords,
  requestMaterialRecords,
  stockNotificationRecords,
  editingStockNotification,
  setEditingStockNotification,
  typeOfRequestRecords,
  editingTypeOfRequest,
  setEditingTypeOfRequest,
  destinationLocationRecords,
  editingDestinationLocation,
  setEditingDestinationLocation,
}: AppViewRendererProps) {
  return (
    <>
      {/* Dashboard Landing Page */}
      {viewState.type === "dashboard" && (
        <Dashboard
          onAddNewBufferRule={handleNavigateStockNotificationCreate}
          onManageBufferRules={() =>
            handleNavigateList("stock-notification-master", "/dashboard/stock-notification-master")
          }
          onNavigatePrCreate={handleNavigatePrCreate}
          onNavigateDetail={handleNavigateDetail}
          onNavigateReceiveNoteDetail={handleNavigateReceiveNoteDetail}
          onNavigateRequestMaterialDetail={handleNavigateRequestMaterialDetail}
          onNavigateTransferStockReturnDetail={handleNavigateTransferStockReturnDetail}
          receiveNoteRecords={receiveNoteRecords}
          requestMaterialRecords={requestMaterialRecords}
          onReceiveNotesUpdate={setReceiveNoteRecords}
        />
      )}

      {/* SuperAdmin User & Permission Administration */}
      {viewState.type === "list" && viewState.page === "user-permission-admin" && (
        <UserPermissionAdmin
          onNavigateAudit={() => handleNavigateList("audit-log-admin", "/admin/audit-logs")}
        />
      )}

      {/* SuperAdmin System Audit Trail & History */}
      {viewState.type === "list" && viewState.page === "audit-log-admin" && (
        <AuditLogAdmin
          onNavigateUsers={() => handleNavigateList("user-permission-admin", "/admin/user-permissions")}
        />
      )}

      {/* Existing Core List Page Views */}
      {viewState.type === "list" && viewState.page === "pr" && (
        <PurchaseRequisition
          onCreate={handleNavigatePrCreate}
          onDetail={(row: TableRow) =>
            handleNavigateDetail("pr", row._rawNumber || row._rawPr || row._id || "")
          }
        />
      )}

      {viewState.type === "list" && viewState.page === "po" && (
        <PurchaseOrder
          onCreate={handleNavigatePoCreate}
          onDetail={(row: TableRow) =>
            handleNavigateDetail("po", row._rawNumber || row._rawPo || row._id || "")
          }
          onSelectPr={(prNumber: string) =>
            handleNavigateDetail("pr", prNumber)
          }
        />
      )}

      {viewState.type === "list" && viewState.page === "report" && (
        <PurchaseOrderReport
          onDetail={(row: TableRow) =>
            handleNavigateDetail("report", row._rawPo || row._rawPr || row._rawNumber || row._id || "")
          }
          onSelectPo={(poNumber: string) =>
            handleNavigateDetail("po", poNumber)
          }
          onSelectPr={(prNumber: string) =>
            handleNavigateDetail("pr", prNumber)
          }
        />
      )}

      {/* Purchase Requisition Report */}
      {viewState.type === "list" && viewState.page === "pr-report" && (
        <PurchaseRequisitionReport
          onDetail={(prNumber: string) =>
            handleNavigateDetail("pr", prNumber)
          }
          onNavigatePo={(poNumber: string) =>
            handleNavigateDetail("po", poNumber)
          }
        />
      )}

      {/* Reporting Purchase Order */}
      {viewState.type === "list" && viewState.page === "po-report" && (
        <ReportingPurchaseOrder
          onDetail={(poNumber: string) =>
            handleNavigateDetail("po", poNumber)
          }
          onNavigatePr={(prNumber: string) =>
            handleNavigateDetail("pr", prNumber)
          }
        />
      )}

      {viewState.type === "list" && viewState.page === "warehouse" && (
        <Warehouse
          onDetail={(row: TableRow) =>
            handleNavigateDetail("warehouse", row._rawNumber || row._rawRn || row._id || "")
          }
          onCreate={() => handleNavigateCreate("warehouse")}
        />
      )}

      {/* Supplier Master Listing */}
      {viewState.type === "list" && viewState.page === "supplier" && (
        <SupplierIndex
          records={supplierRecords}
          onToggleHide={handleToggleSupplierHide}
          onAddNew={() => handleNavigateCreate("supplier")}
        />
      )}

      {/* Payment Term Listing */}
      {viewState.type === "list" && viewState.page === "payment-term" && (
        <PaymentTermIndex
          records={paymentTermRecords}
          onToggleHide={handleTogglePaymentTermHide}
          onAddNew={() => handleNavigateCreate("payment-term")}
        />
      )}

      {/* Purchase Category Listing */}
      {viewState.type === "list" && viewState.page === "purchase-category" && (
        <PurchaseCategoryIndex
          records={purchaseCategoryRecords}
          onToggleHide={handleTogglePurchaseCategoryHide}
          onAddNew={() => handleNavigateCreate("purchase-category")}
        />
      )}

      {/* Delivery Terms Listing */}
      {viewState.type === "list" && viewState.page === "delivery-terms" && (
        <DeliveryTermsIndex
          records={deliveryTermRecords}
          onToggleHide={handleToggleDeliveryTermHide}
          onAddNew={() => handleNavigateCreate("delivery-terms")}
        />
      )}

      {/* Additional Costs Listing */}
      {viewState.type === "list" && viewState.page === "additional-costs" && (
        <AdditionalCostsIndex
          records={additionalCostRecords}
          onToggleHide={handleToggleAdditionalCostHide}
          onAddNew={() => handleNavigateCreate("additional-costs")}
        />
      )}

      {/* PPH Listing */}
      {viewState.type === "list" && viewState.page === "pph" && (
        <PphIndex
          records={pphRecords}
          onToggleHide={handleTogglePphHide}
          onAddNew={() => handleNavigateCreate("pph")}
        />
      )}

      {/* Exim Unit Master Listing */}
      {viewState.type === "list" && viewState.page === "unit" && (
        <UnitIndex
          records={unitRecords}
          onAddNew={() => handleNavigateCreate("unit")}
          onToggleStatus={handleToggleUnitStatus}
        />
      )}

      {/* Exim Unit Reference (Satuan) Listing */}
      {viewState.type === "list" && (viewState.page === "satuan" || (viewState.page as string) === "unit-reference") && (
        <UnitReferenceIndex
          records={unitReferenceRecords}
          onAddNew={handleNavigateUnitReferenceCreate}
          onToggleStatus={handleToggleUnitReferenceStatus}
        />
      )}

      {/* Exim Master Classification Listing */}
      {viewState.type === "list" && viewState.page === "classification" && (
        <ClassificationIndex
          records={classificationRecords}
          onAddNew={() => handleNavigateCreate("classification")}
          onToggleStatus={handleToggleClassificationStatus}
        />
      )}

      {/* Exim Master Department Listing */}
      {viewState.type === "list" && viewState.page === "department" && (
        <DepartmentIndex
          records={departmentRecords}
          onAddNew={() => handleNavigateCreate("department")}
          onToggleStatus={handleToggleDepartmentStatus}
        />
      )}

      {/* Exim Master Brand Listing */}
      {viewState.type === "list" && viewState.page === "brand" && (
        <BrandIndex
          records={brandRecords}
          onAddNew={() => handleNavigateCreate("brand")}
          onToggleStatus={handleToggleBrandStatus}
        />
      )}

      {/* Exim Master Facility Listing */}
      {viewState.type === "list" && viewState.page === "facility" && (
        <FacilityIndex
          records={facilityRecords}
          onAddNew={() => handleNavigateCreate("facility")}
          onToggleStatus={handleToggleFacilityStatus}
        />
      )}

      {/* Exim Master HS Listing */}
      {viewState.type === "list" && viewState.page === "hs" && (
        <HsIndex
          records={hsRecords}
          onAddNew={() => handleNavigateCreate("hs")}
        />
      )}

      {/* Exim Master Category Listing */}
      {viewState.type === "list" && viewState.page === "category" && (
        <CategoryIndex
          records={categoryRecords}
          onAddNew={() => handleNavigateCreate("category")}
          onToggleStatus={handleToggleCategoryStatus}
        />
      )}

      {/* Exim Master Specification/Model (Style) Listing */}
      {viewState.type === "list" && viewState.page === "style" && (
        <StyleIndex
          records={styleRecords}
          onAddNew={() => handleNavigateCreate("style")}
          onImportExcel={handleNavigateStyleImport}
          onToggleStatus={handleToggleStyleStatus}
        />
      )}

      {/* Exim Master Warna (Color) Listing */}
      {viewState.type === "list" && viewState.page === "colour" && (
        <ColorIndex
          records={colorRecords}
          onAddNew={() => handleNavigateCreate("colour")}
          onToggleStatus={handleToggleColorStatus}
        />
      )}

      {/* Exim Master Item Listing */}
      {viewState.type === "list" && viewState.page === "item" && (
        <ItemIndex
          records={itemRecords}
          onAddNew={() => handleNavigateCreate("item")}
          onGenerateQr={handleNavigateGenerateQr}
          onToggleStatus={handleToggleItemStatus}
        />
      )}

      {/* Exim Receive Note Listing */}
      {viewState.type === "list" && viewState.page === "receive-note" && (
        <ReceiveNoteIndex
          records={receiveNoteRecords}
          onAddNew={() => handleNavigateCreate("receive-note")}
          onViewDetail={handleNavigateReceiveNoteDetail}
        />
      )}

      {/* Exim Receive Note Return Listing */}
      {viewState.type === "list" && viewState.page === "receive-note-return" && (
        <ReceiveNoteReturnIndex
          records={receiveNoteReturnRecords}
          onAddNew={() => handleNavigateCreate("receive-note-return")}
          onViewDetail={handleNavigateReceiveNoteReturnDetail}
        />
      )}

      {/* Exim Document History Listing */}
      {viewState.type === "list" && viewState.page === "document-history" && (
        <DocumentHistoryIndex
          records={documentHistoryRecords}
          onViewDetail={handleNavigateDocumentHistoryDetail}
        />
      )}

      {/* Warehouse Master Listing */}
      {viewState.type === "list" && viewState.page === "warehouse-master" && (
        <MasterWarehouseIndex
          records={warehouseMasterRecords}
          onAddNew={handleNavigateMasterWarehouseCreate}
          onToggleStatus={handleToggleWarehouseMasterStatus}
          onViewCoordinates={handleNavigateWarehouseCoordinates}
        />
      )}

      {/* Country Master Listing */}
      {viewState.type === "list" && viewState.page === "country" && (
        <CountryIndex
          records={countryRecords}
          onAddNew={handleNavigateCountryCreate}
          onToggleStatus={handleToggleCountryStatus}
        />
      )}

      {/* Account Master Listing */}
      {viewState.type === "list" && viewState.page === "account" && (
        <AccountIndex
          records={accountRecords}
          onAddNew={handleNavigateAccountCreate}
          onToggleStatus={handleToggleAccountStatus}
        />
      )}

      {/* Job Number Master Listing */}
      {viewState.type === "list" && viewState.page === "job-number" && (
        <JobNumberIndex
          records={jobNumberRecords}
          onAddNew={handleNavigateJobNumberCreate}
          onToggleStatus={handleToggleJobNumberStatus}
        />
      )}

      {/* Rafaksi Type Master Listing */}
      {viewState.type === "list" && viewState.page === "rafaksi-type" && (
        <RafaksiTypeIndex
          records={rafaksiTypeRecords}
          onAddNew={handleNavigateRafaksiTypeCreate}
          onToggleStatus={handleToggleRafaksiTypeStatus}
        />
      )}

      {/* Currency Master Listing */}
      {viewState.type === "list" && viewState.page === "currency" && (
        <CurrencyIndex
          records={currencyRecords}
          onAddNew={handleNavigateCurrencyCreate}
          onToggleStatus={handleToggleCurrencyStatus}
        />
      )}

      {/* Warehouse Stock Card Report */}
      {viewState.type === "list" && viewState.page === "wh-rep-stock-card" && (
        <StockCardIndex />
      )}

      {/* Warehouse Stock (Stock Item) Report */}
      {viewState.type === "list" && viewState.page === "wh-rep-stock-item" && (
        <StockItemIndex />
      )}

      {/* Warehouse Request Material Listing */}
      {viewState.type === "list" && viewState.page === "wh-req-material" && (
        <RequestMaterialIndex
          records={requestMaterialRecords}
          onAddNew={handleNavigateRequestMaterialCreate}
          onOpenDetail={handleNavigateRequestMaterialDetail}
        />
      )}

      {/* Stock Notification Master Listing */}
      {viewState.type === "list" && viewState.page === "stock-notification-master" && (
        <StockNotificationIndex
          records={stockNotificationRecords}
          onAddNew={handleNavigateStockNotificationCreate}
          onToggleStatus={handleToggleStockNotificationStatus}
        />
      )}

      {/* Warehouse Type of Request Master Listing */}
      {viewState.type === "list" && viewState.page === "wh-type-of-request" && (
        <TypeOfRequestIndex
          records={typeOfRequestRecords}
          onAddNew={handleNavigateTypeOfRequestCreate}
          onToggleStatus={handleToggleTypeOfRequestStatus}
        />
      )}

      {/* Warehouse Destination Location Master Listing */}
      {viewState.type === "list" && viewState.page === "wh-destination-location" && (
        <DestinationLocationIndex
          records={destinationLocationRecords}
          onAddNew={handleNavigateDestinationLocationCreate}
          onToggleStatus={handleToggleDestinationLocationStatus}
        />
      )}

      {/* Warehouse Incoming: Transfer Stock Return */}
      {viewState.type === "list" && viewState.page === "transfer-stock-return" && (
        <TransferStockReturnIndex
          onAddNew={handleNavigateTransferStockReturnCreate}
          onEdit={handleNavigateTransferStockReturnEdit}
          onOpenDetail={handleNavigateTransferStockReturnDetail}
        />
      )}

      {/* Read-Backed Reference Master Listings */}
      {viewState.type === "list" &&
        viewState.page in REFERENCE_MASTER_CONFIGS && (() => {
          const refKey = viewState.page as ReferenceMasterPageKey;
          const config = REFERENCE_MASTER_CONFIGS[refKey];
          return (
            <ReferenceMasterIndex
              config={config}
              records={referenceRecordsMap[refKey] || []}
              isLoading={masterFetchStates[`ref-${refKey}`] === "loading"}
              onAddNew={() => handleNavigateReferenceCreate(refKey)}
            />
          );
        })()}

      {/* New Lightweight Placeholder Pages */}
      {viewState.type === "list" &&
        !(viewState.page in REFERENCE_MASTER_CONFIGS) &&
        viewState.page !== "pr" &&
        viewState.page !== "po" &&
        viewState.page !== "report" &&
        viewState.page !== "pr-report" &&
        viewState.page !== "po-report" &&
        viewState.page !== "warehouse" &&
        viewState.page !== "transfer-stock-return" &&
        viewState.page !== "supplier" &&
        viewState.page !== "payment-term" &&
        viewState.page !== "purchase-category" &&
        viewState.page !== "delivery-terms" &&
        viewState.page !== "additional-costs" &&
        viewState.page !== "pph" &&
        viewState.page !== "unit" &&
        viewState.page !== "satuan" &&
        viewState.page !== "unit-reference" &&
        viewState.page !== "classification" &&
        viewState.page !== "department" &&
        viewState.page !== "brand" &&
        viewState.page !== "facility" &&
        viewState.page !== "hs" &&
        viewState.page !== "category" &&
        viewState.page !== "style" &&
        viewState.page !== "colour" &&
        viewState.page !== "item" &&
        viewState.page !== "receive-note" &&
        viewState.page !== "receive-note-return" &&
        viewState.page !== "document-history" &&
        viewState.page !== "warehouse-master" &&
        viewState.page !== "wh-rep-stock-card" &&
        viewState.page !== "wh-rep-stock-item" &&
        viewState.page !== "wh-req-material" &&
        viewState.page !== "stock-notification-master" &&
        viewState.page !== "wh-type-of-request" &&
        viewState.page !== "wh-destination-location" &&
        viewState.page !== "country" &&
        viewState.page !== "account" &&
        viewState.page !== "job-number" &&
        viewState.page !== "rafaksi-type" &&
        viewState.page !== "currency" &&
        viewState.page !== "user-permission-admin" &&
        viewState.page !== "audit-log-admin" &&
        viewState.page !== "dashboard" && (
          <PlaceholderPage
            eyebrow={currentMeta.eyebrow}
            title={currentMeta.title}
          />
        )}

      {/* Dedicated Full Page Detail Views */}
      {viewState.type === "pr-detail" && (
        <PurchaseRequisitionDetail
          code={viewState.code}
          onBack={() => handleNavigateList("pr", "/procurement/transactions/purchase-requisition")}
          onNavigateDetail={handleNavigateDetail}
        />
      )}

      {viewState.type === "po-detail" && (
        <PurchaseOrderDetail
          code={viewState.code}
          onBack={() => handleNavigateList("po", "/procurement/transactions/purchase-order")}
          onNavigateDetail={handleNavigateDetail}
        />
      )}

      {viewState.type === "report-detail" && (
        <PurchaseOrderReportDetail
          code={viewState.code}
          onBack={() => handleNavigateList("report", "/procurement/reports/report-pr-po")}
          onNavigateDetail={handleNavigateDetail}
        />
      )}

      {viewState.type === "warehouse-detail" && (
        <WarehouseDetail
          code={viewState.code}
          onBack={() => handleNavigateList("warehouse", "/warehouse/incoming/receive-material-bpb")}
          onNavigateDetail={handleNavigateDetail}
        />
      )}

      {/* Dedicated Request Material Detail View */}
      {viewState.type === "wh-req-material-detail" && (
        <RequestMaterialDetail
          id={viewState.id}
          records={requestMaterialRecords}
          onBack={() => handleNavigateList("wh-req-material", "/warehouse/request/request-material")}
        />
      )}

      {/* Dedicated Transfer Stock Return Detail View */}
      {viewState.type === "transfer-stock-return-detail" && (
        <TransferStockReturnDetail
          code={viewState.code}
          onBack={() =>
            handleNavigateList(
              "transfer-stock-return",
              "/warehouse/incoming/transfer-stock-return"
            )
          }
          onEdit={(rec) => handleNavigateTransferStockReturnEdit(rec)}
        />
      )}

      {/* Dedicated Exim Receive Note Detail */}
      {viewState.type === "receive-note-detail" && (
        <ReceiveNoteDetail
          code={viewState.code}
          record={
            receiveNoteRecords.find(
              (r) =>
                r.id === viewState.code ||
                r.rnNumber === viewState.code ||
                (typeof r.rnNumber === "string" && r.rnNumber.replace(/[\/\\]/g, "-") === viewState.code)
            )
          }
          onApprovalChange={(rnNum, nextState) => {
            const mappedStatus =
              nextState.status === "APPROVED"
                ? "Approved"
                : nextState.status === "WAITING_APPROVE_2"
                  ? "Waiting for Approve 2"
                  : nextState.status === "REJECTED"
                    ? "Rejected"
                    : "Waiting for Approve 1";
            setReceiveNoteRecords((prev) =>
              prev.map((r) =>
                r.rnNumber === rnNum
                  ? {
                    ...r,
                    status: mappedStatus as any,
                    approval1At: nextState.approved1At
                      ? `${nextState.approved1At}${nextState.approved1By ? ` by ${nextState.approved1By}` : ""}`
                      : r.approval1At,
                    approval2At: nextState.approved2At
                      ? `${nextState.approved2At}${nextState.approved2By ? ` by ${nextState.approved2By}` : ""}`
                      : r.approval2At,
                  }
                  : r
              )
            );
          }}
          onBack={() => handleNavigateList("receive-note", "/exim/receive-note")}
          onCreateBpb={(rnNum) => handleNavigateCreate("warehouse", undefined, rnNum)}
        />
      )}

      {/* Dedicated Exim Receive Note Return Detail */}
      {viewState.type === "receive-note-return-detail" && (
        <ReceiveNoteReturnDetail
          code={viewState.code}
          record={
            receiveNoteReturnRecords.find(
              (r) =>
                r.id === viewState.code ||
                r.rnNumber === viewState.code ||
                (typeof r.rnNumber === "string" && r.rnNumber.replace(/[\/\\]/g, "-") === viewState.code)
            )
          }
          onBack={() => handleNavigateList("receive-note-return", "/exim/receive-note-return")}
        />
      )}

      {/* Dedicated Exim Document History Detail */}
      {viewState.type === "document-history-detail" && (
        <DocumentHistoryDetail
          code={viewState.code}
          record={
            documentHistoryRecords.find(
              (r) =>
                r.id === viewState.code ||
                r.invoiceNumber === viewState.code ||
                (typeof r.invoiceNumber === "string" && r.invoiceNumber.replace(/[\/\\]/g, "-") === viewState.code)
            )
          }
          onBack={() => handleNavigateList("document-history", "/exim/document-history")}
        />
      )}

      {/* Master Warehouse - Warehouse Coordinate Listing */}
      {viewState.type === "warehouse-coordinate" && (() => {
        const activeWarehouse =
          warehouseMasterRecords.find(
            (w) =>
              w.id === viewState.warehouseId ||
              w.code === viewState.warehouseId ||
              docToSlug(w.code || w.name) === docToSlug(viewState.warehouseId)
          ) || warehouseMasterRecords[0];
        return (
          <WarehouseCoordinateIndex
            warehouse={activeWarehouse}
            onAddNew={() => handleNavigateWarehouseCoordinateCreate(viewState.warehouseId)}
            onBack={() => handleNavigateList("warehouse-master", "/warehouse/master/warehouse")}
            onToggleCoordinateStatus={(coordId) =>
              activeWarehouse
                ? handleToggleWarehouseCoordinateStatus?.(activeWarehouse.id, coordId)
                : undefined
            }
          />
        );
      })()}

      {/* Master Warehouse - Add / Edit Warehouse Form */}
      {(viewState.type === "warehouse-master-create" ||
        viewState.type === "warehouse-master-edit") && (
        <WarehouseMasterForm
          initialRecord={
            viewState.type === "warehouse-master-edit"
              ? viewState.record ??
                editingWarehouseMaster ??
                warehouseMasterRecords.find((w) => String(w.id) === String(viewState.id)) ??
                null
              : null
          }
          warehouseTypes={warehouseTypeRecords}
          isWarehouseTypesLoading={isWarehouseTypesLoading}
          onBack={() => {
            setEditingWarehouseMaster(null);
            handleNavigateList("warehouse-master", "/warehouse/master/warehouse");
          }}
          onSave={handleSaveWarehouseMaster}
        />
      )}

      {/* Master Warehouse - Add New Coordinate Form */}
      {viewState.type === "warehouse-coordinate-create" && (
        <WarehouseCoordinateForm
          warehouse={
            warehouseMasterRecords.find(
              (w) =>
                w.id === viewState.warehouseId ||
                w.code === viewState.warehouseId ||
                docToSlug(w.code || w.name) === docToSlug(viewState.warehouseId)
            ) || warehouseMasterRecords[0]
          }
          onBack={() => {
            const wh =
              warehouseMasterRecords.find(
                (w) =>
                  w.id === viewState.warehouseId ||
                  w.code === viewState.warehouseId ||
                  docToSlug(w.code || w.name) === docToSlug(viewState.warehouseId)
              ) || warehouseMasterRecords[0];
            handleNavigateWarehouseCoordinates(wh);
          }}
          onSave={handleSaveWarehouseCoordinate}
        />
      )}

      {/* Dedicated Full Page Create Views */}
      {viewState.type === "pr-create" && (
        <PurchaseRequisitionCreate
          availableJobNumbers={jobNumberRecords.map((j) => j.jobNumber)}
          availableItems={itemRecords}
          onBack={() => handleNavigateList("pr", "/procurement/transactions/purchase-requisition")}
          onSaveSuccess={() => handleNavigateList("pr", "/procurement/transactions/purchase-requisition")}
        />
      )}

      {viewState.type === "po-create" && (
        <PurchaseOrderCreate
          initialPrNumber={viewState.prNumber}
          availableAdditionalCosts={additionalCostRecords}
          availableItems={itemRecords}
          onBack={() => handleNavigateList("po", "/procurement/transactions/purchase-order")}
          onSaveSuccess={() => handleNavigateList("po", "/procurement/transactions/purchase-order")}
        />
      )}

      {viewState.type === "warehouse-create" && (
        <WarehouseCreate
          initialPoNumber={viewState.poNumber}
          initialRnNumber={viewState.rnNumber}
          onBack={() => handleNavigateList("warehouse", "/warehouse/incoming/receive-material-bpb")}
          onSaved={() => handleNavigateList("warehouse", "/warehouse/incoming/receive-material-bpb")}
        />
      )}

      {/* Dedicated Full Page Request Material Create View */}
      {viewState.type === "wh-req-material-create" && (
        <RequestMaterialCreate
          onSave={handleSaveRequestMaterial}
          onCancel={() => handleNavigateList("wh-req-material", "/warehouse/request/request-material")}
          availableTypesOfRequest={typeOfRequestRecords.filter((t) => t.status === "Active").map((t) => t.name)}
          availableDestinations={destinationLocationRecords.filter((d) => d.status === "Active").map((d) => d.name)}
        />
      )}

      {(viewState.type === "supplier-create" || viewState.type === "supplier-edit") && (
        <SupplierForm
          mode={viewState.type === "supplier-edit" ? "edit" : "create"}
          recordId={viewState.type === "supplier-edit" ? viewState.id : undefined}
          initialRecord={
            viewState.type === "supplier-edit"
              ? viewState.record ??
                editingSupplier ??
                supplierRecords.find((s) => String(s.id) === String(viewState.id)) ??
                null
              : null
          }
          onBack={() => {
            setEditingSupplier(null);
            handleNavigateList("supplier", "/procurement/purchase-master/supplier");
          }}
          onSave={handleSaveSupplier}
        />
      )}

      {(viewState.type === "payment-term-create" || viewState.type === "payment-term-edit") && (
        <PaymentTermForm
          initialRecord={
            viewState.type === "payment-term-edit"
              ? viewState.record ??
                editingPaymentTerm ??
                paymentTermRecords.find((p) => String(p.id) === String(viewState.id)) ??
                null
              : null
          }
          onBack={() => {
            setEditingPaymentTerm(null);
            handleNavigateList("payment-term", "/procurement/purchase-master/payment-term");
          }}
          onSave={handleSavePaymentTerm}
        />
      )}

      {(viewState.type === "purchase-category-create" ||
        viewState.type === "purchase-category-edit") && (
        <PurchaseCategoryForm
          initialRecord={
            viewState.type === "purchase-category-edit"
              ? viewState.record ??
                editingPurchaseCategory ??
                purchaseCategoryRecords.find((c) => String(c.id) === String(viewState.id)) ??
                null
              : null
          }
          onBack={() => {
            setEditingPurchaseCategory(null);
            handleNavigateList(
              "purchase-category",
              "/procurement/purchase-master/purchase-category"
            );
          }}
          onSave={handleSavePurchaseCategory}
        />
      )}

      {(viewState.type === "delivery-terms-create" ||
        viewState.type === "delivery-terms-edit") && (
        <DeliveryTermsForm
          initialRecord={
            viewState.type === "delivery-terms-edit"
              ? viewState.record ??
                editingDeliveryTerm ??
                deliveryTermRecords.find((d) => String(d.id) === String(viewState.id)) ??
                null
              : null
          }
          onBack={() => {
            setEditingDeliveryTerm(null);
            handleNavigateList("delivery-terms", "/procurement/purchase-master/delivery-terms");
          }}
          onSave={handleSaveDeliveryTerm}
        />
      )}

      {(viewState.type === "additional-costs-create" ||
        viewState.type === "additional-costs-edit") && (
        <AdditionalCostsForm
          initialRecord={
            viewState.type === "additional-costs-edit"
              ? viewState.record ??
                editingAdditionalCost ??
                additionalCostRecords.find((a) => String(a.id) === String(viewState.id)) ??
                null
              : null
          }
          onBack={() => {
            setEditingAdditionalCost(null);
            handleNavigateList(
              "additional-costs",
              "/procurement/purchase-master/additional-costs"
            );
          }}
          onSave={handleSaveAdditionalCost}
        />
      )}

      {(viewState.type === "pph-create" || viewState.type === "pph-edit") && (
        <PphForm
          initialRecord={
            viewState.type === "pph-edit"
              ? viewState.record ??
                editingPph ??
                pphRecords.find((p) => String(p.id) === String(viewState.id)) ??
                null
              : null
          }
          onBack={() => {
            setEditingPph(null);
            handleNavigateList("pph", "/procurement/purchase-master/pph");
          }}
          onSave={handleSavePph}
        />
      )}

      {/* Dedicated Exim Unit Form (Add / Edit) */}
      {(viewState.type === "unit-create" || viewState.type === "unit-edit") && (
        <UnitForm
          initialRecord={
            viewState.type === "unit-edit" && viewState.record
              ? viewState.record
              : editingUnit
          }
          onBack={() => {
            setEditingUnit(null);
            handleNavigateList("unit", "/exim/master/unit");
          }}
          onSave={handleSaveUnit}
        />
      )}

      {/* Dedicated Exim Classification Form (Add / Edit) */}
      {(viewState.type === "classification-create" || viewState.type === "classification-edit") && (
        <ClassificationForm
          initialRecord={
            viewState.type === "classification-edit" && viewState.record
              ? viewState.record
              : editingClassification
          }
          reportingTypes={reportingTypeRecords}
          accounts={accountRecords}
          isReportingTypesLoading={isReportingTypesLoading}
          isAccountsLoading={isAccountsLoading}
          onBack={() => {
            setEditingClassification(null);
            handleNavigateList("classification", "/exim/master/classification");
          }}
          onSave={handleSaveClassification}
        />
      )}

      {/* Dedicated Exim Department Form (Add / Edit) */}
      {(viewState.type === "department-create" || viewState.type === "department-edit") && (
        <DepartmentForm
          initialRecord={
            viewState.type === "department-edit" && viewState.record
              ? viewState.record
              : editingDepartment
          }
          units={unitRecords}
          onBack={() => {
            setEditingDepartment(null);
            handleNavigateList("department", "/exim/master/department");
          }}
          onSave={handleSaveDepartment}
        />
      )}

      {/* Dedicated Exim Brand Form (Add / Edit) */}
      {(viewState.type === "brand-create" || viewState.type === "brand-edit") && (
        <BrandForm
          initialRecord={
            viewState.type === "brand-edit" && viewState.record
              ? viewState.record
              : editingBrand
          }
          onBack={() => {
            setEditingBrand(null);
            handleNavigateList("brand", "/exim/master/brand");
          }}
          onSave={handleSaveBrand}
        />
      )}

      {/* Dedicated Exim Facility Form (Add / Edit) */}
      {(viewState.type === "facility-create" || viewState.type === "facility-edit") && (
        <FacilityForm
          initialRecord={
            viewState.type === "facility-edit" && viewState.record
              ? viewState.record
              : editingFacility
          }
          onBack={() => {
            setEditingFacility(null);
            handleNavigateList("facility", "/exim/master/facility");
          }}
          onSave={handleSaveFacility}
        />
      )}

      {/* Dedicated Exim HS Form (Add / Edit) */}
      {(viewState.type === "hs-create" || viewState.type === "hs-edit") && (
        <HsForm
          initialRecord={
            viewState.type === "hs-edit" && viewState.record
              ? viewState.record
              : editingHs
          }
          onBack={() => {
            setEditingHs(null);
            handleNavigateList("hs", "/exim/master/hs");
          }}
          onSave={handleSaveHs}
        />
      )}

      {/* Dedicated Exim Category Form (Add / Edit) */}
      {(viewState.type === "category-create" || viewState.type === "category-edit") && (
        <CategoryForm
          initialRecord={
            viewState.type === "category-edit" && viewState.record
              ? viewState.record
              : editingCategory
          }
          onBack={() => {
            setEditingCategory(null);
            handleNavigateList("category", "/exim/master/category");
          }}
          onSave={handleSaveCategory}
        />
      )}

      {/* Dedicated Exim Style Form (Add / Edit) */}
      {(viewState.type === "style-create" || viewState.type === "style-edit") && (
        <StyleForm
          initialRecord={
            viewState.type === "style-edit" && viewState.record
              ? viewState.record
              : editingStyle
          }
          onBack={() => {
            setEditingStyle(null);
            handleNavigateList("style", "/exim/master/style");
          }}
          onSave={handleSaveStyle}
        />
      )}

      {/* Dedicated Exim Style Import Excel Page */}
      {viewState.type === "style-import" && (
        <StyleImport
          onBack={() => {
            handleNavigateList("style", "/exim/master/style");
          }}
        />
      )}

      {/* Dedicated Exim Color Form (Add / Edit Color) */}
      {(viewState.type === "colour-create" || viewState.type === "colour-edit") && (
        <ColorForm
          initialRecord={
            viewState.type === "colour-edit"
              ? viewState.record ??
                editingColor ??
                colorRecords.find((c) => String(c.id) === String(viewState.id)) ??
                null
              : null
          }
          onBack={() => {
            setEditingColor(null);
            handleNavigateList("colour", "/exim/master/colour");
          }}
          onSave={handleSaveColor}
        />
      )}

      {/* Dedicated Exim Receive Note Create Form */}
      {viewState.type === "receive-note-create" && (
        <ReceiveNoteForm
          onBack={() => handleNavigateList("receive-note", "/exim/receive-note")}
          onSave={handleSaveReceiveNote}
          existingReceiveNotes={receiveNoteRecords}
        />
      )}

      {/* Dedicated Exim Receive Note Return Create Form */}
      {viewState.type === "receive-note-return-create" && (
        <ReceiveNoteReturnForm
          onBack={() => handleNavigateList("receive-note-return", "/exim/receive-note-return")}
          onSave={handleSaveReceiveNoteReturn}
        />
      )}

      {/* Dedicated Exim Item Form (Add / Edit) */}
      {(viewState.type === "item-create" || viewState.type === "item-edit") && (
        <ItemForm
          initialRecord={
            viewState.type === "item-edit" && viewState.record
              ? viewState.record
              : editingItem
          }
          onBack={() => {
            setEditingItem(null);
            handleNavigateList("item", "/exim/master/item");
          }}
          onSave={handleSaveItem}
        />
      )}

      {/* Dedicated Generate QR Code Page */}
      {viewState.type === "item-qr" && (
        <GenerateQrCodePage
          allItems={itemRecords}
          onCancel={() => handleNavigateList("item", "/exim/master/item")}
        />
      )}

      {/* Dedicated Stock Notification Master Form (Add / Edit) */}
      {(viewState.type === "stock-notification-create" || viewState.type === "stock-notification-edit") && (
        <StockNotificationForm
          initialRecord={
            viewState.type === "stock-notification-edit" && viewState.record
              ? viewState.record
              : editingStockNotification
          }
          onBack={() => {
            setEditingStockNotification(null);
            handleNavigateList("stock-notification-master", "/dashboard/stock-notification-master");
          }}
          onSave={handleSaveStockNotification}
        />
      )}

      {/* Dedicated Warehouse Type of Request Form (Add / Edit) */}
      {(viewState.type === "wh-type-of-request-create" || viewState.type === "wh-type-of-request-edit") && (
        <TypeOfRequestForm
          initialRecord={
            viewState.type === "wh-type-of-request-edit" && viewState.record
              ? viewState.record
              : editingTypeOfRequest
          }
          departments={departmentRecords}
          isDepartmentsLoading={isDepartmentsLoading}
          onBack={() => {
            setEditingTypeOfRequest(null);
            handleNavigateList("wh-type-of-request", "/warehouse/master/type-of-request");
          }}
          onSave={handleSaveTypeOfRequest}
        />
      )}

      {/* Dedicated Warehouse Destination Location Form (Add / Edit) */}
      {(viewState.type === "wh-destination-location-create" || viewState.type === "wh-destination-location-edit") && (
        <DestinationLocationForm
          initialRecord={
            viewState.type === "wh-destination-location-edit" && viewState.record
              ? viewState.record
              : editingDestinationLocation
          }
          onBack={() => {
            setEditingDestinationLocation(null);
            handleNavigateList("wh-destination-location", "/warehouse/master/destination-location");
          }}
          onSave={handleSaveDestinationLocation}
        />
      )}

      {/* Dedicated Exim Master Country Form (Add / Edit) */}
      {(viewState.type === "country-create" || viewState.type === "country-edit") && (
        <CountryForm
          mode={viewState.type === "country-edit" ? "edit" : "create"}
          recordId={viewState.type === "country-edit" ? viewState.id : undefined}
          initialRecord={viewState.type === "country-edit" ? viewState.record ?? null : null}
          records={countryRecords}
          isLoading={isCountriesLoading}
          onSave={handleSaveCountry}
          onCancel={() => handleNavigateList("country", "/exim/master/country")}
        />
      )}

      {/* Dedicated Exim Master Account Form (Add / Edit) */}
      {(viewState.type === "account-create" || viewState.type === "account-edit") && (
        <AccountForm
          mode={viewState.type === "account-edit" ? "edit" : "create"}
          recordId={viewState.type === "account-edit" ? viewState.id : undefined}
          initialRecord={viewState.type === "account-edit" ? viewState.record ?? null : null}
          records={accountRecords}
          isLoading={isAccountsLoading}
          onSave={handleSaveAccount}
          onCancel={() => handleNavigateList("account", "/exim/master/account")}
        />
      )}

      {/* Dedicated Purchase Master Job Number Form (Add / Edit) */}
      {(viewState.type === "job-number-create" || viewState.type === "job-number-edit") && (
        <JobNumberForm
          mode={viewState.type === "job-number-edit" ? "edit" : "create"}
          recordId={viewState.type === "job-number-edit" ? viewState.id : undefined}
          initialRecord={viewState.type === "job-number-edit" ? viewState.record ?? null : null}
          records={jobNumberRecords}
          isLoading={isJobNumbersLoading}
          departments={departmentRecords}
          isDepartmentsLoading={isDepartmentsLoading}
          onSave={handleSaveJobNumber}
          onCancel={() => handleNavigateList("job-number", "/procurement/purchase-master/job-number")}
        />
      )}

      {/* Dedicated Purchase Master Rafaksi Type Form (Add / Edit) */}
      {(viewState.type === "rafaksi-type-create" || viewState.type === "rafaksi-type-edit") && (
        <RafaksiTypeForm
          mode={viewState.type === "rafaksi-type-edit" ? "edit" : "create"}
          recordId={viewState.type === "rafaksi-type-edit" ? viewState.id : undefined}
          initialRecord={viewState.type === "rafaksi-type-edit" ? viewState.record ?? null : null}
          records={rafaksiTypeRecords}
          isLoading={isRafaksiTypesLoading}
          onSave={handleSaveRafaksiType}
          onCancel={() =>
            handleNavigateList("rafaksi-type", "/procurement/purchase-master/rafaksi-type")
          }
        />
      )}

      {/* Dedicated Exim Master Currency Form (Add / Edit) */}
      {(viewState.type === "currency-create" || viewState.type === "currency-edit") && (
        <CurrencyForm
          mode={viewState.type === "currency-edit" ? "edit" : "create"}
          recordId={viewState.type === "currency-edit" ? viewState.id : undefined}
          initialRecord={viewState.type === "currency-edit" ? viewState.record ?? null : null}
          records={currencyRecords}
          isLoading={isCurrenciesLoading}
          onSave={handleSaveCurrency}
          onCancel={() => handleNavigateList("currency", "/exim/master/currency")}
        />
      )}

      {/* Dedicated Exim Unit Reference (Satuan) Form (Add / Edit) */}
      {(viewState.type === "unit-reference-create" || viewState.type === "unit-reference-edit") && (
        <UnitReferenceForm
          mode={viewState.type === "unit-reference-edit" ? "edit" : "create"}
          recordId={viewState.type === "unit-reference-edit" ? viewState.id : undefined}
          initialRecord={
            viewState.type === "unit-reference-edit" ? viewState.record ?? null : null
          }
          records={unitReferenceRecords}
          isLoading={isUnitReferencesLoading}
          onSave={handleSaveUnitReference}
          onCancel={() => handleNavigateList("satuan", "/exim/master/satuan")}
        />
      )}

      {/* Read-Backed Reference Master Create Forms */}
      {viewState.type === "reference-master-create" &&
        viewState.page in REFERENCE_MASTER_CONFIGS && (() => {
          const config = REFERENCE_MASTER_CONFIGS[viewState.page as ReferenceMasterPageKey];
          return (
            <ReferenceMasterForm
              config={config}
              onCancel={() => handleNavigateList(config.pageKey, config.listPath)}
            />
          );
        })()}

      {/* Dedicated Warehouse Incoming: Transfer Stock Return Form (Add / Edit) */}
      {(viewState.type === "transfer-stock-return-create" ||
        viewState.type === "transfer-stock-return-edit") && (
        <TransferStockReturnForm
          mode={viewState.type === "transfer-stock-return-edit" ? "edit" : "create"}
          recordCode={
            viewState.type === "transfer-stock-return-edit" ? viewState.code : undefined
          }
          initialRecord={
            viewState.type === "transfer-stock-return-edit" ? viewState.record ?? null : null
          }
          onBack={() =>
            handleNavigateList(
              "transfer-stock-return",
              "/warehouse/incoming/transfer-stock-return"
            )
          }
          onSaved={() =>
            handleNavigateList(
              "transfer-stock-return",
              "/warehouse/incoming/transfer-stock-return"
            )
          }
        />
      )}

      {/* Dedicated Full-Screen Settings Workspace */}
      {viewState.type === "settings" && (
        <SettingsWorkspace
          activeTab={viewState.tab}
          onSelectTab={(tab) => handleNavigateSettings?.(tab)}
          onExitSettings={() =>
            handleExitSettings
              ? handleExitSettings()
              : handleNavigateList("dashboard", "/dashboard")
          }
        />
      )}

      {/* Dedicated Edit Profile View */}
      {viewState.type === "edit-profile" && (
        <EditProfile
          onBack={handleProfileCancel}
          onSaveConfirmed={handleProfileSaveConfirmed}
        />
      )}

      {/* 404 Not Found Page */}
      {viewState.type === "not-found" && (
        <NotFoundPage
          path={viewState.path}
          onGoHome={() => handleNavigateList("dashboard", "/dashboard")}
        />
      )}
    </>
  );
}
