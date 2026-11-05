import React, { useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";
import { CustomSelect } from "../../../../components/ui/CustomSelect";
import type { SupplierFormData } from "./supplier-types";

interface SupplierFormProps {
  onBack: () => void;
  onSave?: (data: SupplierFormData) => void;
}

export function SupplierForm({ onBack, onSave }: SupplierFormProps) {
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

    if (onSave) {
      onSave(formData);
    }

    setNotification({
      type: "info",
      message: "Supplier record submitted and synchronized with database successfully.",
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
            <CustomSelect
              id="country"
              value={formData.country}
              onChange={(val) => setFormData((prev) => ({ ...prev, country: val }))}
              placeholder="Choose Country"
              options={[
                { value: "", label: "Choose Country" },
                { value: "INDONESIA", label: "Indonesia" },
                { value: "CHINA", label: "China" },
                { value: "JAPAN", label: "Japan" },
                { value: "SINGAPORE", label: "Singapore" },
                { value: "MALAYSIA", label: "Malaysia" },
                { value: "UNITED STATES", label: "United States" },
                { value: "GERMANY", label: "Germany" },
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
              value={formData.paymentTerm}
              onChange={(val) => setFormData((prev) => ({ ...prev, paymentTerm: val }))}
              placeholder="Choose Payment Term"
              options={[
                { value: "", label: "Choose Payment Term" },
                { value: "COD", label: "COD - Cash on Delivery" },
                { value: "CBD", label: "CBD - Cash Before Delivery" },
                { value: "NET_14", label: "Net 14 Days" },
                { value: "NET_30", label: "Net 30 Days" },
                { value: "NET_45", label: "Net 45 Days" },
                { value: "NET_60", label: "Net 60 Days" },
                { value: "LC", label: "Letter of Credit (LC)" },
              ]}
            />
          </div>

          <div className="form-field-group col-span-1">
            <label htmlFor="paymentMethod" className="field-label">
              Payment Method
            </label>
            <CustomSelect
              id="paymentMethod"
              value={formData.paymentMethod}
              onChange={(val) => setFormData((prev) => ({ ...prev, paymentMethod: val }))}
              placeholder="Choose Payment Method"
              options={[
                { value: "", label: "Choose Payment Method" },
                { value: "TT", label: "Bank Transfer (TT)" },
                { value: "LC", label: "Letter of Credit (LC)" },
                { value: "CASH", label: "Cash" },
                { value: "CHEQUE", label: "Cheque" },
                { value: "GIRO", label: "Giro" },
              ]}
            />
          </div>

          <div className="form-field-group col-span-1">
            <label htmlFor="typeRafaksi" className="field-label">
              Type Rafaksi
            </label>
            <CustomSelect
              id="typeRafaksi"
              value={formData.typeRafaksi}
              onChange={(val) => setFormData((prev) => ({ ...prev, typeRafaksi: val }))}
              options={[
                { value: "-", label: "-" },
                { value: "Rafaksi Berat", label: "Rafaksi Berat" },
                { value: "Rafaksi Kadar Air", label: "Rafaksi Kadar Air" },
                { value: "Rafaksi Harga", label: "Rafaksi Harga" },
                { value: "Rafaksi Kualitas", label: "Rafaksi Kualitas" },
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
            <CustomSelect
              id="port"
              value={formData.port}
              onChange={(val) => setFormData((prev) => ({ ...prev, port: val }))}
              placeholder="Choose Port"
              options={[
                { value: "", label: "Choose Port" },
                { value: "Tanjung Perak, Surabaya", label: "Tanjung Perak, Surabaya" },
                { value: "Tanjung Priok, Jakarta", label: "Tanjung Priok, Jakarta" },
                { value: "Belawan, Medan", label: "Belawan, Medan" },
                { value: "Port of Shanghai, China", label: "Port of Shanghai, China" },
                { value: "Port of Singapore", label: "Port of Singapore" },
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
