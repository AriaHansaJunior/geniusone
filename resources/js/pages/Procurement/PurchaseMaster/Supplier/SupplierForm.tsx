import React, { useState, useEffect, useMemo } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";
import { CustomSelect } from "../../../../components/ui/CustomSelect";
import { fetchMasterLookupsApi } from "../../../../data/masterApi";
import type { SupplierFormData } from "./supplier-types";

interface SupplierFormProps {
  onBack: () => void;
  onSave?: (data: SupplierFormData) => void | Promise<any>;
}

interface LookupRow {
  id: number;
  code?: string;
  name: string;
}

interface SupplierLookupState {
  countries: LookupRow[];
  paymentTerms: LookupRow[];
  paymentMethods: LookupRow[];
  rafaksiTypes: LookupRow[];
  currencies: LookupRow[];
  ports: LookupRow[];
}

export function SupplierForm({ onBack, onSave }: SupplierFormProps) {
  const [lookups, setLookups] = useState<SupplierLookupState>({
    countries: [],
    paymentTerms: [],
    paymentMethods: [],
    rafaksiTypes: [],
    currencies: [],
    ports: [],
  });
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<SupplierFormData>({
    autoGenerateCode: true,
    supplierCode: "",
    supplierName: "",
    address: "",
    contactPerson: "",
    city: "",
    state: "",
    country: "",
    zipcode: "",
    email: "",
    telephoneNumber: "",
    paymentTerm: "",
    paymentMethod: "",
    typeRafaksi: "-",
    currency: "",
    port: "",
    npwp: "",
    nitku: "",
    whatsapp: "",
    wechatId: "",
  });

  const [notification, setNotification] = useState<{
    type: "info" | "warning";
    message: string;
  } | null>(null);

  const [currencySearch, setCurrencySearch] = useState("");
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingLookups(true);

    fetchMasterLookupsApi()
      .then((data) => {
        if (cancelled) return;
        const d = data || {};
        setLookups({
          countries: Array.isArray(d.countries) ? d.countries : [],
          paymentTerms: Array.isArray(d.payment_terms) ? d.payment_terms : [],
          paymentMethods: Array.isArray(d.payment_methods) ? d.payment_methods : [],
          rafaksiTypes: Array.isArray(d.rafaksi_types) ? d.rafaksi_types : [],
          currencies: Array.isArray(d.currencies) ? d.currencies : [],
          ports: Array.isArray(d.ports) ? d.ports : [],
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setNotification({
            type: "warning",
            message: err?.message || "Failed to load supplier reference options from database.",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingLookups(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredCurrencies = useMemo(
    () =>
      lookups.currencies.filter((c) => {
        const term = currencySearch.trim().toLowerCase();
        if (!term) return true;
        return (
          c.name.toLowerCase().includes(term) ||
          (c.code && c.code.toLowerCase().includes(term))
        );
      }),
    [lookups.currencies, currencySearch]
  );

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleToggleAutoGenerate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setFormData((prev) => ({
      ...prev,
      autoGenerateCode: checked,
      supplierCode: checked ? "" : prev.supplierCode,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.supplierName.trim()) {
      setNotification({
        type: "warning",
        message: "Please enter the Supplier Name before proceeding.",
      });
      return;
    }

    if (onSave) {
      try {
        setSaving(true);
        setNotification(null);
        await onSave(formData);
      } catch (err: any) {
        setNotification({
          type: "warning",
          message: err?.message || "Failed to save supplier to database.",
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <div className="supplier-form-page">
      {/* Page Header */}
      <div className="supplier-form-header">
        <h1 className="supplier-page-title">Add Supplier</h1>
      </div>


      {/* Honest Demonstration Status Banner */}
      {notification && (
        <div
          className={`supplier-form-alert supplier-form-alert--${notification.type}`}
        >
          <Icon
            name={notification.type === "info" ? "check" : "alertTriangle"}
            size={16}
          />
          <div className="supplier-form-alert__content">
            <strong>
              {notification.type === "info"
                ? "Form Validated"
                : "Required Information Missing"}
            </strong>
            <p>{notification.message}</p>
          </div>
          <button
            type="button"
            className="alert-close-btn"
            onClick={() => setNotification(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* Main Form Container Card */}
      <form onSubmit={handleSave} className="supplier-card-form">
        <div className="supplier-form-grid">
          {/* Row 1: Supplier Code & Supplier Name */}
          <div className="form-field-group col-span-1">
            <div className="field-label-with-checkbox">
              <label htmlFor="supplierCode" className="field-label">
                Supplier Code
              </label>
              <label className="checkbox-auto-generate">
                <input
                  type="checkbox"
                  checked={formData.autoGenerateCode}
                  onChange={handleToggleAutoGenerate}
                />
                <span>Auto Generate</span>
              </label>
            </div>
            <input
              id="supplierCode"
              name="supplierCode"
              type="text"
              className={`form-input ${formData.autoGenerateCode ? "input--disabled" : ""}`}
              disabled={formData.autoGenerateCode}
              placeholder={formData.autoGenerateCode ? "[Auto Generated]" : "Enter Supplier Code"}
              value={formData.supplierCode}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-field-group col-span-2">
            <label htmlFor="supplierName" className="field-label">
              Supplier Name
            </label>
            <input
              id="supplierName"
              name="supplierName"
              type="text"
              className="form-input"
              placeholder="Enter Supplier Name"
              value={formData.supplierName}
              onChange={handleInputChange}
              required
            />
          </div>

          {/* Row 2: Address (wide span) & Contact Person */}
          <div className="form-field-group col-span-2">
            <label htmlFor="address" className="field-label">
              Address
            </label>
            <textarea
              id="address"
              name="address"
              rows={2}
              className="form-textarea"
              placeholder="Enter Address"
              value={formData.address}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-field-group col-span-1">
            <label htmlFor="contactPerson" className="field-label">
              Contact Person
            </label>
            <input
              id="contactPerson"
              name="contactPerson"
              type="text"
              className="form-input"
              placeholder="Enter Contact Person"
              value={formData.contactPerson}
              onChange={handleInputChange}
            />
          </div>

          {/* Row 3: City, State, Country */}
          <div className="form-field-group col-span-1">
            <label htmlFor="city" className="field-label">
              City
            </label>
            <input
              id="city"
              name="city"
              type="text"
              className="form-input"
              placeholder="Enter City"
              value={formData.city}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-field-group col-span-1">
            <label htmlFor="state" className="field-label">
              State
            </label>
            <input
              id="state"
              name="state"
              type="text"
              className="form-input"
              placeholder="Enter State"
              value={formData.state}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-field-group col-span-1">
            <label htmlFor="country" className="field-label">
              Country
            </label>
            <CustomSelect
              id="country"
              value={formData.countries_id ? String(formData.countries_id) : ""}
              onChange={(val) => {
                const chosen = lookups.countries.find((c) => String(c.id) === val);
                setFormData((prev) => ({
                  ...prev,
                  countries_id: chosen ? Number(chosen.id) : undefined,
                  country: chosen ? chosen.name : "",
                }));
              }}
              placeholder={loadingLookups ? "Loading countries..." : "Choose Country"}
              disabled={loadingLookups}
              options={[
                { value: "", label: "Choose Country" },
                ...lookups.countries.map((c) => ({
                  value: String(c.id),
                  label: c.code ? `${c.code} - ${c.name}` : c.name,
                })),
              ]}
            />
          </div>

          {/* Row 4: Zipcode, Email, Telephone Number */}
          <div className="form-field-group col-span-1">
            <label htmlFor="zipcode" className="field-label">
              Zipcode
            </label>
            <input
              id="zipcode"
              name="zipcode"
              type="text"
              className="form-input"
              placeholder="Enter Zipcode"
              value={formData.zipcode}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-field-group col-span-1">
            <label htmlFor="email" className="field-label">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="form-input"
              placeholder="Enter Email"
              value={formData.email}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-field-group col-span-1">
            <label htmlFor="telephoneNumber" className="field-label">
              Telephone Number
            </label>
            <input
              id="telephoneNumber"
              name="telephoneNumber"
              type="tel"
              className="form-input"
              placeholder="Enter Telephone Number"
              value={formData.telephoneNumber}
              onChange={handleInputChange}
            />
          </div>

          {/* Row 5: Payment Term, Payment Method, Type Rafaksi */}
          <div className="form-field-group col-span-1">
            <label htmlFor="paymentTerm" className="field-label">
              Payment Term
            </label>
            <CustomSelect
              id="paymentTerm"
              value={formData.payment_terms_id ? String(formData.payment_terms_id) : ""}
              onChange={(val) => {
                const chosen = lookups.paymentTerms.find((p) => String(p.id) === val);
                setFormData((prev) => ({
                  ...prev,
                  payment_terms_id: chosen ? Number(chosen.id) : undefined,
                  paymentTerm: chosen ? chosen.name : "",
                }));
              }}
              placeholder={loadingLookups ? "Loading payment terms..." : "Choose Payment Term"}
              disabled={loadingLookups}
              options={[
                { value: "", label: "Choose Payment Term" },
                ...lookups.paymentTerms.map((p) => ({
                  value: String(p.id),
                  label: p.name,
                })),
              ]}
            />
          </div>

          <div className="form-field-group col-span-1">
            <label htmlFor="paymentMethod" className="field-label">
              Payment Method
            </label>
            <CustomSelect
              id="paymentMethod"
              value={formData.payment_methods_id ? String(formData.payment_methods_id) : ""}
              onChange={(val) => {
                const chosen = lookups.paymentMethods.find((p) => String(p.id) === val);
                setFormData((prev) => ({
                  ...prev,
                  payment_methods_id: chosen ? Number(chosen.id) : undefined,
                  paymentMethod: chosen ? chosen.name : "",
                }));
              }}
              placeholder={loadingLookups ? "Loading payment methods..." : "Choose Payment Method"}
              disabled={loadingLookups}
              options={[
                { value: "", label: "Choose Payment Method" },
                ...lookups.paymentMethods.map((p) => ({
                  value: String(p.id),
                  label: p.name,
                })),
              ]}
            />
          </div>

          <div className="form-field-group col-span-1">
            <label htmlFor="typeRafaksi" className="field-label">
              Type Rafaksi
            </label>
            <CustomSelect
              id="typeRafaksi"
              value={formData.rafaksi_types_id ? String(formData.rafaksi_types_id) : ""}
              onChange={(val) => {
                const chosen = lookups.rafaksiTypes.find((r) => String(r.id) === val);
                setFormData((prev) => ({
                  ...prev,
                  rafaksi_types_id: chosen ? Number(chosen.id) : undefined,
                  typeRafaksi: chosen ? chosen.name : "-",
                }));
              }}
              placeholder={loadingLookups ? "Loading rafaksi types..." : "-"}
              disabled={loadingLookups}
              options={[
                { value: "", label: "-" },
                ...lookups.rafaksiTypes.map((r) => ({
                  value: String(r.id),
                  label: r.code ? `${r.code} - ${r.name}` : r.name,
                })),
              ]}
            />
          </div>

          {/* Row 6: Currency & Port */}
          <div className="form-field-group col-span-1 relative">
            <label htmlFor="currency" className="field-label">
              Currency
            </label>
            <div className="searchable-currency-container">
              <input
                id="currency"
                type="text"
                className="form-input"
                placeholder={loadingLookups ? "Loading currencies..." : "Find Currency"}
                value={formData.currency || currencySearch}
                onFocus={() => setCurrencyDropdownOpen(true)}
                onChange={(e) => {
                  setCurrencySearch(e.target.value);
                  setFormData((prev) => ({ ...prev, currency: "", currencies_id: undefined }));
                  setCurrencyDropdownOpen(true);
                }}
              />
              <button
                type="button"
                className="currency-dropdown-toggle"
                onClick={() => setCurrencyDropdownOpen((prev) => !prev)}
                tabIndex={-1}
              >
                <Icon name="chevronDown" size={14} />
              </button>
            </div>

            {currencyDropdownOpen && (
              <div className="currency-options-dropdown">
                {filteredCurrencies.length > 0 ? (
                  filteredCurrencies.map((curr) => (
                    <button
                      key={curr.id}
                      type="button"
                      className="currency-option-item"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          currencies_id: Number(curr.id),
                          currency: curr.name,
                        }));
                        setCurrencySearch("");
                        setCurrencyDropdownOpen(false);
                      }}
                    >
                      <strong>{curr.code || curr.name}</strong>
                      {curr.code && curr.code !== curr.name && <span>{curr.name}</span>}
                    </button>
                  ))
                ) : (
                  <div className="currency-option-empty">No currency found</div>
                )}
              </div>
            )}
          </div>

          <div className="form-field-group col-span-2">
            <label htmlFor="port" className="field-label">
              Port
            </label>
            <CustomSelect
              id="port"
              value={formData.ports_id ? String(formData.ports_id) : ""}
              onChange={(val) => {
                const chosen = lookups.ports.find((p) => String(p.id) === val);
                setFormData((prev) => ({
                  ...prev,
                  ports_id: chosen ? Number(chosen.id) : undefined,
                  port: chosen ? chosen.name : "",
                }));
              }}
              placeholder={loadingLookups ? "Loading ports..." : "Choose Port"}
              disabled={loadingLookups}
              options={[
                { value: "", label: "Choose Port" },
                ...lookups.ports.map((p) => ({
                  value: String(p.id),
                  label: p.name,
                })),
              ]}
            />
          </div>

          {/* Row 7: NPWP & NITKU */}
          <div className="form-field-group col-span-1">
            <label htmlFor="npwp" className="field-label">
              NPWP
            </label>
            <input
              id="npwp"
              name="npwp"
              type="text"
              className="form-input font-mono"
              placeholder="e.g. 727131559048000"
              value={formData.npwp}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-field-group col-span-2">
            <label htmlFor="nitku" className="field-label">
              NITKU
            </label>
            <input
              id="nitku"
              name="nitku"
              type="text"
              className="form-input font-mono"
              placeholder="e.g. 0024578734604000000000"
              value={formData.nitku}
              onChange={handleInputChange}
            />
          </div>

          {/* Row 8: Whatsapp & WeChat ID */}
          <div className="form-field-group col-span-1">
            <label htmlFor="whatsapp" className="field-label">
              Whatsapp
            </label>
            <input
              id="whatsapp"
              name="whatsapp"
              type="text"
              className="form-input"
              placeholder="Enter Whatsapp Number"
              value={formData.whatsapp}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-field-group col-span-2">
            <label htmlFor="wechatId" className="field-label">
              WeChat ID
            </label>
            <input
              id="wechatId"
              name="wechatId"
              type="text"
              className="form-input"
              placeholder="Enter WeChat ID"
              value={formData.wechatId}
              onChange={handleInputChange}
            />
          </div>
        </div>

        {/* Buttons Action Footer */}
        <div className="supplier-form-actions">
          <Button type="button" variant="ghost" onClick={onBack} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" icon="check" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default SupplierForm;
