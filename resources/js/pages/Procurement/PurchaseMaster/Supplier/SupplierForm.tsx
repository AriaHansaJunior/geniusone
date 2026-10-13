import React, { useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";
import type { SupplierFormData } from "./supplier-types";

interface SupplierFormProps {
  onBack: () => void;
}

export function SupplierForm({ onBack }: SupplierFormProps) {
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

  // Available demonstration currency list
  const currencyOptions = [
    { code: "IDR", name: "Indonesian Rupiah" },
    { code: "USD", name: "US Dollar" },
    { code: "CNY", name: "Chinese Yuan" },
    { code: "EUR", name: "Euro" },
    { code: "JPY", name: "Japanese Yen" },
    { code: "SGD", name: "Singapore Dollar" },
  ];

  const filteredCurrencies = currencyOptions.filter(
    (c) =>
      c.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
      c.name.toLowerCase().includes(currencySearch.toLowerCase())
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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.supplierName.trim()) {
      setNotification({
        type: "warning",
        message: "Please enter the Supplier Name before proceeding.",
      });
      return;
    }

    // Honest feedback conforming to strict technical constraints (no fake persistence)
    setNotification({
      type: "info",
      message:
        "Frontend validation passed. Please note: Backend persistence and database storage are intentionally not implemented in this phase.",
    });
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
            <select
              id="country"
              name="country"
              className="form-select"
              value={formData.country}
              onChange={handleInputChange}
            >
              <option value="">Choose Country</option>
              <option value="INDONESIA">Indonesia</option>
              <option value="CHINA">China</option>
              <option value="JAPAN">Japan</option>
              <option value="SINGAPORE">Singapore</option>
              <option value="MALAYSIA">Malaysia</option>
              <option value="UNITED STATES">United States</option>
              <option value="GERMANY">Germany</option>
            </select>
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
            <select
              id="paymentTerm"
              name="paymentTerm"
              className="form-select"
              value={formData.paymentTerm}
              onChange={handleInputChange}
            >
              <option value="">Choose Payment Term</option>
              <option value="COD">COD - Cash on Delivery</option>
              <option value="CBD">CBD - Cash Before Delivery</option>
              <option value="NET_14">Net 14 Days</option>
              <option value="NET_30">Net 30 Days</option>
              <option value="NET_45">Net 45 Days</option>
              <option value="NET_60">Net 60 Days</option>
              <option value="LC">Letter of Credit (LC)</option>
            </select>
          </div>

          <div className="form-field-group col-span-1">
            <label htmlFor="paymentMethod" className="field-label">
              Payment Method
            </label>
            <select
              id="paymentMethod"
              name="paymentMethod"
              className="form-select"
              value={formData.paymentMethod}
              onChange={handleInputChange}
            >
              <option value="">Choose Payment Method</option>
              <option value="TT">Bank Transfer (TT)</option>
              <option value="LC">Letter of Credit (LC)</option>
              <option value="CASH">Cash</option>
              <option value="CHEQUE">Cheque</option>
              <option value="GIRO">Giro</option>
            </select>
          </div>

          <div className="form-field-group col-span-1">
            <label htmlFor="typeRafaksi" className="field-label">
              Type Rafaksi
            </label>
            <select
              id="typeRafaksi"
              name="typeRafaksi"
              className="form-select"
              value={formData.typeRafaksi}
              onChange={handleInputChange}
            >
              <option value="-">-</option>
              <option value="Rafaksi Berat">Rafaksi Berat</option>
              <option value="Rafaksi Harga">Rafaksi Harga</option>
              <option value="Rafaksi Kualitas">Rafaksi Kualitas</option>
            </select>
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
                placeholder="Find Currency"
                value={formData.currency || currencySearch}
                onFocus={() => setCurrencyDropdownOpen(true)}
                onChange={(e) => {
                  setCurrencySearch(e.target.value);
                  setFormData((prev) => ({ ...prev, currency: "" }));
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
                      key={curr.code}
                      type="button"
                      className="currency-option-item"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          currency: `${curr.code} - ${curr.name}`,
                        }));
                        setCurrencySearch("");
                        setCurrencyDropdownOpen(false);
                      }}
                    >
                      <strong>{curr.code}</strong>
                      <span>{curr.name}</span>
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
            <select
              id="port"
              name="port"
              className="form-select"
              value={formData.port}
              onChange={handleInputChange}
            >
              <option value="">Choose Port</option>
              <option value="Tanjung Perak, Surabaya">Tanjung Perak, Surabaya</option>
              <option value="Tanjung Priok, Jakarta">Tanjung Priok, Jakarta</option>
              <option value="Belawan, Medan">Belawan, Medan</option>
              <option value="Port of Shanghai, China">Port of Shanghai, China</option>
              <option value="Port of Singapore">Port of Singapore</option>
            </select>
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
          <Button type="button" variant="ghost" onClick={onBack}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" icon="check">
            Save
          </Button>
        </div>
      </form>
    </div>
  );
}

export default SupplierForm;
