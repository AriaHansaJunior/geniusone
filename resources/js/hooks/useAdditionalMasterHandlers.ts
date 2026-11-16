import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { PageKey, ViewState } from "../types";
import { docToSlug } from "../utils/docSlug";
import { useNotification } from "../context/NotificationContext";
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
import type { UnitReferenceRecord } from "../pages/Exim/Master/UnitReference/unit-reference-types";
import type { TransferStockReturnRecord } from "../pages/Warehouse/TransferStockReturn/transfer-stock-return-types";
import {
  saveCountryApi,
  deleteCountryApi,
  toggleCountryStatusApi,
  saveAccountApi,
  deleteAccountApi,
  toggleAccountStatusApi,
  saveJobNumberApi,
  deleteJobNumberApi,
  toggleJobNumberStatusApi,
  saveRafaksiTypeApi,
  deleteRafaksiTypeApi,
  toggleRafaksiTypeStatusApi,
  saveCurrencyApi,
  deleteCurrencyApi,
  toggleCurrencyStatusApi,
  saveUnitReferenceApi,
  deleteUnitReferenceApi,
  toggleUnitReferenceStatusApi,
} from "../data/masterApi";

interface UseAdditionalMasterHandlersParams {
  setViewState: Dispatch<SetStateAction<ViewState>>;
  handleNavigateList: (targetPage: PageKey, targetPath?: string) => void;
  setCountryRecords: Dispatch<SetStateAction<CountryRecord[]>>;
  setAccountRecords: Dispatch<SetStateAction<AccountRecord[]>>;
  setJobNumberRecords: Dispatch<SetStateAction<JobNumberRecord[]>>;
  setRafaksiTypeRecords: Dispatch<SetStateAction<RafaksiTypeRecord[]>>;
  setCurrencyRecords: Dispatch<SetStateAction<CurrencyRecord[]>>;
  setUnitReferenceRecords: Dispatch<SetStateAction<UnitReferenceRecord[]>>;
}

export function useAdditionalMasterHandlers({
  setViewState,
  handleNavigateList,
  setCountryRecords,
  setAccountRecords,
  setJobNumberRecords,
  setRafaksiTypeRecords,
  setCurrencyRecords,
  setUnitReferenceRecords,
}: UseAdditionalMasterHandlersParams) {
  const { notifySuccess, notifyError } = useNotification();

  const pushRoute = useCallback(
    (nextState: ViewState, path: string) => {
      setViewState(nextState);
      if (typeof window !== "undefined") {
        window.scrollTo(0, 0);
        window.history.pushState(nextState, "", path);
      }
    },
    [setViewState]
  );

  // =========================================================================
  // EXIM MASTER: COUNTRY
  // =========================================================================
  const handleNavigateCountryCreate = useCallback(() => {
    pushRoute({ type: "country-create" }, "/exim/master/country/create");
  }, [pushRoute]);

  const handleNavigateCountryEdit = useCallback(
    (record: CountryRecord) => {
      pushRoute(
        { type: "country-edit", id: record.id, record },
        `/exim/master/country/edit/${encodeURIComponent(record.id)}`
      );
    },
    [pushRoute]
  );

  const handleSaveCountry = useCallback(
    async (data: CountryFormData, id?: string) => {
      try {
        const saved = await saveCountryApi(data, id);
        if (!saved) {
          throw new Error("Failed to save country record to database.");
        }
        if (id) {
          setCountryRecords((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
        } else {
          setCountryRecords((prev) => [
            saved,
            ...prev.map((c, idx) => ({ ...c, no: idx + 2 })),
          ]);
        }
        handleNavigateList("country", "/exim/master/country");
        notifySuccess(
          id ? "Country Updated" : "Country Added",
          `${saved.name} saved successfully.`
        );
      } catch (err) {
        notifyError("Save Country Failed", err);
        throw err;
      }
    },
    [setCountryRecords, handleNavigateList, notifySuccess, notifyError]
  );

  const handleDeleteCountry = useCallback(
    async (id: string) => {
      try {
        await deleteCountryApi(id);
        setCountryRecords((prev) =>
          prev.filter((c) => c.id !== id).map((c, idx) => ({ ...c, no: idx + 1 }))
        );
        notifySuccess("Country Deleted", "Country record deleted from database.");
      } catch (err) {
        notifyError("Delete Country Failed", err);
        throw err;
      }
    },
    [setCountryRecords, notifySuccess, notifyError]
  );

  const handleToggleCountryStatus = useCallback(
    async (id: string) => {
      try {
        const ok = await toggleCountryStatusApi(id);
        if (!ok) {
          throw new Error("Failed to toggle country status.");
        }
        setCountryRecords((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: !c.status } : c))
        );
        notifySuccess("Status Updated", "Country status updated.");
      } catch (err) {
        notifyError("Status Update Failed", err);
        throw err;
      }
    },
    [setCountryRecords, notifySuccess, notifyError]
  );

  // =========================================================================
  // EXIM MASTER: ACCOUNT
  // =========================================================================
  const handleNavigateAccountCreate = useCallback(() => {
    pushRoute({ type: "account-create" }, "/exim/master/account/create");
  }, [pushRoute]);

  const handleNavigateAccountEdit = useCallback(
    (record: AccountRecord) => {
      pushRoute(
        { type: "account-edit", id: record.id, record },
        `/exim/master/account/edit/${encodeURIComponent(record.id)}`
      );
    },
    [pushRoute]
  );

  const handleSaveAccount = useCallback(
    async (data: AccountFormData, id?: string) => {
      try {
        const saved = await saveAccountApi(data, id);
        if (id) {
          setAccountRecords((prev) => prev.map((a) => (a.id === saved.id ? saved : a)));
        } else {
          setAccountRecords((prev) => [
            saved,
            ...prev.map((a, idx) => ({ ...a, no: idx + 2 })),
          ]);
        }
        handleNavigateList("account", "/exim/master/account");
        notifySuccess(
          id ? "Account Updated" : "Account Added",
          `${saved.accountName} saved successfully.`
        );
      } catch (err) {
        notifyError("Save Account Failed", err);
        throw err;
      }
    },
    [setAccountRecords, handleNavigateList, notifySuccess, notifyError]
  );

  const handleDeleteAccount = useCallback(
    async (id: string) => {
      try {
        await deleteAccountApi(id);
        setAccountRecords((prev) =>
          prev.filter((a) => a.id !== id).map((a, idx) => ({ ...a, no: idx + 1 }))
        );
        notifySuccess("Account Deleted", "Account record deleted from database.");
      } catch (err) {
        notifyError("Delete Account Failed", err);
        throw err;
      }
    },
    [setAccountRecords, notifySuccess, notifyError]
  );

  const handleToggleAccountStatus = useCallback(
    async (id: string) => {
      try {
        const ok = await toggleAccountStatusApi(id);
        if (!ok) {
          throw new Error("Failed to toggle account status.");
        }
        setAccountRecords((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: !a.status } : a))
        );
        notifySuccess("Status Updated", "Account status updated.");
      } catch (err) {
        notifyError("Status Update Failed", err);
        throw err;
      }
    },
    [setAccountRecords, notifySuccess, notifyError]
  );

  // =========================================================================
  // PURCHASE MASTER: JOB NUMBER
  // =========================================================================
  const handleNavigateJobNumberCreate = useCallback(() => {
    pushRoute({ type: "job-number-create" }, "/procurement/purchase-master/job-number/create");
  }, [pushRoute]);

  const handleNavigateJobNumberEdit = useCallback(
    (record: JobNumberRecord) => {
      pushRoute(
        { type: "job-number-edit", id: record.id, record },
        `/procurement/purchase-master/job-number/edit/${encodeURIComponent(record.id)}`
      );
    },
    [pushRoute]
  );

  const handleSaveJobNumber = useCallback(
    async (data: JobNumberFormData, id?: string) => {
      try {
        const saved = await saveJobNumberApi(data, id);
        if (!saved) {
          throw new Error("Failed to save job number record to database.");
        }
        if (id) {
          setJobNumberRecords((prev) => prev.map((j) => (j.id === saved.id ? saved : j)));
        } else {
          setJobNumberRecords((prev) => [
            saved,
            ...prev.map((j, idx) => ({ ...j, no: idx + 2 })),
          ]);
        }
        handleNavigateList("job-number", "/procurement/purchase-master/job-number");
        notifySuccess(
          id ? "Job Number Updated" : "Job Number Added",
          `${saved.jobNumber} saved successfully.`
        );
      } catch (err) {
        notifyError("Save Job Number Failed", err);
        throw err;
      }
    },
    [setJobNumberRecords, handleNavigateList, notifySuccess, notifyError]
  );

  const handleDeleteJobNumber = useCallback(
    async (id: string) => {
      try {
        await deleteJobNumberApi(id);
        setJobNumberRecords((prev) =>
          prev.filter((j) => j.id !== id).map((j, idx) => ({ ...j, no: idx + 1 }))
        );
        notifySuccess("Job Number Deleted", "Job Number record deleted from database.");
      } catch (err) {
        notifyError("Delete Job Number Failed", err);
        throw err;
      }
    },
    [setJobNumberRecords, notifySuccess, notifyError]
  );

  const handleToggleJobNumberStatus = useCallback(
    async (id: string) => {
      try {
        const ok = await toggleJobNumberStatusApi(id);
        if (!ok) {
          throw new Error("Failed to toggle job number status.");
        }
        setJobNumberRecords((prev) =>
          prev.map((j) => (j.id === id ? { ...j, status: !j.status } : j))
        );
        notifySuccess("Status Updated", "Job Number status updated.");
      } catch (err) {
        notifyError("Status Update Failed", err);
        throw err;
      }
    },
    [setJobNumberRecords, notifySuccess, notifyError]
  );

  // =========================================================================
  // PURCHASE MASTER: RAFAKSI TYPE
  // =========================================================================
  const handleNavigateRafaksiTypeCreate = useCallback(() => {
    pushRoute(
      { type: "rafaksi-type-create" },
      "/procurement/purchase-master/rafaksi-type/create"
    );
  }, [pushRoute]);

  const handleNavigateRafaksiTypeEdit = useCallback(
    (record: RafaksiTypeRecord) => {
      pushRoute(
        { type: "rafaksi-type-edit", id: record.id, record },
        `/procurement/purchase-master/rafaksi-type/edit/${encodeURIComponent(record.id)}`
      );
    },
    [pushRoute]
  );

  const handleSaveRafaksiType = useCallback(
    async (data: RafaksiTypeFormData, id?: string) => {
      try {
        const saved = await saveRafaksiTypeApi(data, id);
        if (!saved) {
          throw new Error("Failed to save rafaksi type record to database.");
        }
        if (id) {
          setRafaksiTypeRecords((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
        } else {
          setRafaksiTypeRecords((prev) => [
            saved,
            ...prev.map((r, idx) => ({ ...r, no: idx + 2 })),
          ]);
        }
        handleNavigateList("rafaksi-type", "/procurement/purchase-master/rafaksi-type");
        notifySuccess(
          id ? "Rafaksi Type Updated" : "Rafaksi Type Added",
          `${saved.name} saved successfully.`
        );
      } catch (err) {
        notifyError("Save Rafaksi Type Failed", err);
        throw err;
      }
    },
    [setRafaksiTypeRecords, handleNavigateList, notifySuccess, notifyError]
  );

  const handleDeleteRafaksiType = useCallback(
    async (id: string) => {
      try {
        await deleteRafaksiTypeApi(id);
        setRafaksiTypeRecords((prev) =>
          prev.filter((r) => r.id !== id).map((r, idx) => ({ ...r, no: idx + 1 }))
        );
        notifySuccess("Rafaksi Type Deleted", "Rafaksi type record deleted from database.");
      } catch (err) {
        notifyError("Delete Rafaksi Type Failed", err);
        throw err;
      }
    },
    [setRafaksiTypeRecords, notifySuccess, notifyError]
  );

  const handleToggleRafaksiTypeStatus = useCallback(
    async (id: string) => {
      try {
        const ok = await toggleRafaksiTypeStatusApi(id);
        if (!ok) {
          throw new Error("Failed to toggle rafaksi type status.");
        }
        setRafaksiTypeRecords((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: !r.status } : r))
        );
        notifySuccess("Status Updated", "Rafaksi type status updated.");
      } catch (err) {
        notifyError("Status Update Failed", err);
        throw err;
      }
    },
    [setRafaksiTypeRecords, notifySuccess, notifyError]
  );

  // =========================================================================
  // EXIM MASTER: CURRENCY
  // =========================================================================
  const handleNavigateCurrencyCreate = useCallback(() => {
    pushRoute({ type: "currency-create" }, "/exim/master/currency/create");
  }, [pushRoute]);

  const handleNavigateCurrencyEdit = useCallback(
    (record: CurrencyRecord) => {
      pushRoute(
        { type: "currency-edit", id: record.id, record },
        `/exim/master/currency/edit/${encodeURIComponent(record.id)}`
      );
    },
    [pushRoute]
  );

  const handleSaveCurrency = useCallback(
    async (data: CurrencyFormData, id?: string) => {
      try {
        const saved = await saveCurrencyApi(
          {
            currencyCode: data.currencyCode,
          },
          id
        );
        if (!saved) {
          throw new Error("Failed to save currency record to database.");
        }
        if (id) {
          setCurrencyRecords((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
        } else {
          setCurrencyRecords((prev) => [
            saved,
            ...prev.map((c, idx) => ({ ...c, no: idx + 2 })),
          ]);
        }
        handleNavigateList("currency", "/exim/master/currency");
        notifySuccess(
          id ? "Currency Updated" : "Currency Added",
          `${saved.currencyCode} saved successfully.`
        );
      } catch (err) {
        notifyError("Save Currency Failed", err);
        throw err;
      }
    },
    [setCurrencyRecords, handleNavigateList, notifySuccess, notifyError]
  );

  const handleDeleteCurrency = useCallback(
    async (id: string) => {
      try {
        await deleteCurrencyApi(id);
        setCurrencyRecords((prev) =>
          prev.filter((c) => c.id !== id).map((c, idx) => ({ ...c, no: idx + 1 }))
        );
        notifySuccess("Currency Deleted", "Currency record deleted from database.");
      } catch (err) {
        notifyError("Delete Currency Failed", err);
        throw err;
      }
    },
    [setCurrencyRecords, notifySuccess, notifyError]
  );

  const handleToggleCurrencyStatus = useCallback(
    async (id: string) => {
      try {
        const ok = await toggleCurrencyStatusApi(id);
        if (!ok) {
          throw new Error("Failed to toggle currency status.");
        }
        setCurrencyRecords((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, status: c.status === false ? true : false } : c
          )
        );
        notifySuccess("Status Updated", "Currency status updated.");
      } catch (err) {
        notifyError("Status Update Failed", err);
      }
    },
    [setCurrencyRecords, notifySuccess, notifyError]
  );

  // =========================================================================
  // EXIM MASTER: UNIT REFERENCE
  // =========================================================================
  const handleNavigateUnitReferenceCreate = useCallback(() => {
    pushRoute({ type: "unit-reference-create" }, "/exim/master/satuan/create");
  }, [pushRoute]);

  const handleNavigateUnitReferenceEdit = useCallback(
    (record: UnitReferenceRecord) => {
      pushRoute(
        { type: "unit-reference-edit", id: record.id, record },
        `/exim/master/satuan/edit/${encodeURIComponent(record.id)}`
      );
    },
    [pushRoute]
  );

  const handleSaveUnitReference = useCallback(
    async (data: Partial<UnitReferenceRecord>, id?: string) => {
      try {
        const saved = await saveUnitReferenceApi(id ? { ...data, id } : data, Boolean(id));
        if (id) {
          setUnitReferenceRecords((prev) =>
            prev.map((u) => (u.id === saved.id ? saved : u))
          );
        } else {
          setUnitReferenceRecords((prev) => [
            saved,
            ...prev.map((u, idx) => ({ ...u, no: idx + 2 })),
          ]);
        }
        handleNavigateList("satuan", "/exim/master/satuan");
        notifySuccess(
          id ? "Unit Reference Updated" : "Unit Reference Added",
          `${saved.name} saved successfully.`
        );
      } catch (err) {
        notifyError("Save Unit Reference Failed", err);
        throw err;
      }
    },
    [setUnitReferenceRecords, handleNavigateList, notifySuccess, notifyError]
  );

  const handleDeleteUnitReference = useCallback(
    async (id: string) => {
      try {
        await deleteUnitReferenceApi(id);
        setUnitReferenceRecords((prev) =>
          prev.filter((u) => u.id !== id).map((u, idx) => ({ ...u, no: idx + 1 }))
        );
        notifySuccess("Unit Reference Deleted", "Unit reference deleted from database.");
      } catch (err) {
        notifyError("Delete Unit Reference Failed", err);
      }
    },
    [setUnitReferenceRecords, notifySuccess, notifyError]
  );

  const handleToggleUnitReferenceStatus = useCallback(
    async (id: string) => {
      try {
        const ok = await toggleUnitReferenceStatusApi(id);
        if (!ok) {
          throw new Error("Failed to toggle unit reference status.");
        }
        setUnitReferenceRecords((prev) =>
          prev.map((u) => (u.id === id ? { ...u, status: !u.status } : u))
        );
        notifySuccess("Status Updated", "Unit reference status updated.");
      } catch (err) {
        notifyError("Status Update Failed", err);
      }
    },
    [setUnitReferenceRecords, notifySuccess, notifyError]
  );

  // =========================================================================
  // WAREHOUSE INCOMING: TRANSFER STOCK RETURN
  // =========================================================================
  const handleNavigateTransferStockReturnCreate = useCallback(() => {
    pushRoute(
      { type: "transfer-stock-return-create" },
      "/warehouse/incoming/transfer-stock-return/create"
    );
  }, [pushRoute]);

  const handleNavigateTransferStockReturnEdit = useCallback(
    (recordOrCode: TransferStockReturnRecord | string) => {
      const targetId =
        typeof recordOrCode === "string"
          ? recordOrCode
          : recordOrCode.id || docToSlug(recordOrCode.mutationCode);
      const recordObj = typeof recordOrCode === "string" ? undefined : recordOrCode;
      pushRoute(
        { type: "transfer-stock-return-edit", code: targetId, record: recordObj },
        `/warehouse/incoming/transfer-stock-return/edit/${encodeURIComponent(targetId)}`
      );
    },
    [pushRoute]
  );

  const handleNavigateTransferStockReturnDetail = useCallback(
    (mutationCode: string) => {
      const slug = docToSlug(String(mutationCode || ""));
      pushRoute(
        { type: "transfer-stock-return-detail", code: slug },
        `/warehouse/incoming/transfer-stock-return/detail/${slug}`
      );
    },
    [pushRoute]
  );

  return {
    handleNavigateCountryCreate,
    handleNavigateCountryEdit,
    handleSaveCountry,
    handleDeleteCountry,
    handleToggleCountryStatus,
    handleNavigateAccountCreate,
    handleNavigateAccountEdit,
    handleSaveAccount,
    handleDeleteAccount,
    handleToggleAccountStatus,
    handleNavigateJobNumberCreate,
    handleNavigateJobNumberEdit,
    handleSaveJobNumber,
    handleDeleteJobNumber,
    handleToggleJobNumberStatus,
    handleNavigateRafaksiTypeCreate,
    handleNavigateRafaksiTypeEdit,
    handleSaveRafaksiType,
    handleDeleteRafaksiType,
    handleToggleRafaksiTypeStatus,
    handleNavigateCurrencyCreate,
    handleNavigateCurrencyEdit,
    handleSaveCurrency,
    handleDeleteCurrency,
    handleToggleCurrencyStatus,
    handleNavigateUnitReferenceCreate,
    handleNavigateUnitReferenceEdit,
    handleSaveUnitReference,
    handleDeleteUnitReference,
    handleToggleUnitReferenceStatus,
    handleNavigateTransferStockReturnCreate,
    handleNavigateTransferStockReturnEdit,
    handleNavigateTransferStockReturnDetail,
  };
}
