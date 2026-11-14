import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { Button } from "../../../../components/ui/Button";
import { SearchField } from "../../../../components/ui/SearchField";
import { Icon } from "../../../../components/ui/Icon";
import { Badge, type BadgeTone } from "../../../../components/ui/Badge";
import { Pagination } from "../../../../components/ui/Pagination";
import { CustomDatePicker } from "../../../../components/ui/CustomDatePicker";
import { CustomSelect } from "../../../../components/ui/CustomSelect";
import { ApprovalStatusBadge } from "../../../../components/approval/ApprovalStatusBadge";
import { getLocalApprovalState } from "../../../../services/approvalApi";
import { normalizeApprovalStatus } from "../../../../types/approval";
import {
  requestMaterialTypesList,
  requestMaterialCreatedByList,
  requestMaterialDestinationsList,
  requestMaterialApprovalsList,
  requestMaterialDepartmentsList,
  requestMaterialProjectTypesList,
  initialRequestMaterialRecords,
} from "./request-material-data";
import type { RequestMaterialRecord } from "./request-material-types";

interface RequestMaterialIndexProps {
  records?: RequestMaterialRecord[];
  onAddNew: () => void;
  onOpenDetail: (id: string) => void;
}

export function RequestMaterialIndex({
  records = initialRequestMaterialRecords,
  onAddNew,
  onOpenDetail,
}: RequestMaterialIndexProps) {
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [typeOfRequest, setTypeOfRequest] = useState("All Types");
  const [createdBy, setCreatedBy] = useState("All Users");
  const [destinationLocation, setDestinationLocation] = useState("All Destinations");
  const [approval, setApproval] = useState("All Approvals");
  const [department, setDepartment] = useState("All Departments");
  const [projectType, setProjectType] = useState("All Projects");

  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [notification, setNotification] = useState<{
    type: "error" | "warning" | "success" | "info";
    message: string;
  } | null>(null);

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (val && endDate && val > endDate) {
      setNotification({
        type: "warning",
        message: "Start Date cannot be later than End Date.",
      });
    } else {
      setNotification(null);
    }
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    if (startDate && val && startDate > val) {
      setNotification({
        type: "warning",
        message: "End Date cannot be earlier than Start Date.",
      });
    } else {
      setNotification(null);
    }
  };

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      // Search
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const matchesCode = rec.requestCode.toLowerCase().includes(query);
        const matchesJob = rec.jobNumber.toLowerCase().includes(query);
        const matchesCust = rec.customer.toLowerCase().includes(query);
        const matchesNote = rec.requestNote.toLowerCase().includes(query);
        if (!matchesCode && !matchesJob && !matchesCust && !matchesNote) {
          return false;
        }
      }
      // Date range
      if (startDate && rec.requestDate < startDate) {
        return false;
      }
      if (endDate && rec.requestDate > endDate) {
        return false;
      }
      // Type of Request
      if (typeOfRequest !== "All Types" && rec.typeOfRequest !== typeOfRequest) {
        return false;
      }
      // Created By
      if (createdBy !== "All Users" && rec.createdBy !== createdBy) {
        return false;
      }
      // Destination Location
      if (
        destinationLocation !== "All Destinations" &&
        rec.destinationLocation !== destinationLocation
      ) {
        return false;
      }
      // Approval
      if (approval !== "All Approvals" && rec.approval !== approval) {
        return false;
      }
      // Department
      if (department !== "All Departments" && rec.department !== department) {
        return false;
      }
      // Project Type
      if (projectType !== "All Projects" && rec.projectType !== projectType) {
        return false;
      }
      return true;
    });
  }, [
    records,
    search,
    startDate,
    endDate,
    typeOfRequest,
    createdBy,
    destinationLocation,
    approval,
    department,
    projectType,
  ]);

  // Pagination calculation
  const totalRecords = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedRecords = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * pageSize;
    return filteredRecords.slice(startIdx, startIdx + pageSize);
  }, [filteredRecords, safeCurrentPage, pageSize]);

  // Export to Excel (.xlsx) using SheetJS
  const handleExportExcel = () => {
    try {
      if (filteredRecords.length === 0) {
        setNotification({
          type: "warning",
          message: "No request material records found matching the active filters to export.",
        });
        return;
      }
      setNotification(null);

      const headers = [
        "No.",
        "Request Code",
        "Request Date",
        "Destination Location",
        "Department",
        "Type of Request",
        "Job Number",
        "Customer",
        "Request Note",
        "Total Items",
        "Approval",
        "Project Type",
        "Created Date",
        "Last Updated Date",
      ];

      const rowsData = filteredRecords.map((r, idx) => [
        idx + 1,
        r.requestCode,
        r.requestDate,
        r.destinationLocation,
        r.department,
        r.typeOfRequest,
        r.jobNumber,
        r.customer,
        r.requestNote,
        r.totalItems,
        r.approval,
        r.projectType,
        r.createdDate,
        r.lastUpdatedDate,
      ]);

      const worksheet = XLSX.utils.aoa_to_sheet([
        ["REQUEST MATERIAL LISTING"],
        [`Export Date: ${new Date().toISOString().slice(0, 10)}`],
        [],
        headers,
        ...rowsData,
      ]);

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Request Material");
      XLSX.writeFile(
        workbook,
        `Request_Material_Export_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err?.message || "Failed to generate Excel export file.",
      });
    }
  };

  const getApprovalBadgeTone = (appr: string): BadgeTone => {
    if (appr === "Approved 2") return "blue";
    if (appr === "Approved 1") return "green";
    if (appr === "Draft") return "cyan";
    if (appr === "Rejected") return "red";
    return "gray";
  };

  const handleOpenDetailSafe = (id: string) => {
    try {
      if (!id || !id.trim()) {
        setNotification({
          type: "error",
          message: "Unable to open detail: Invalid Request Material ID.",
        });
        return;
      }
      onOpenDetail(id);
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err?.message || "Failed to navigate to Request Material Detail.",
      });
    }
  };

  return (
    <div className="request-material-page transaction-create-page">
      {/* GeniusOne Notification Banner */}
      {notification && (
        <div
          style={{
            padding: "10px 16px",
            background:
              notification.type === "error"
                ? "#fef2f2"
                : notification.type === "warning"
                ? "#fffbeb"
                : "#f0fdf4",
            border: `1px solid ${
              notification.type === "error"
                ? "#fecaca"
                : notification.type === "warning"
                ? "#fde68a"
                : "#bbf7d0"
            }`,
            borderRadius: "var(--radius-sm)",
            color:
              notification.type === "error"
                ? "#b91c1c"
                : notification.type === "warning"
                ? "#92400e"
                : "#15803d",
            fontSize: "12.5px",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Icon
              name={notification.type === "success" ? "check" : "alertTriangle"}
              size={15}
            />
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            style={{
              border: 0,
              background: "transparent",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "16px",
              color: "inherit",
            }}
            title="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Top Action Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: "10px",
          marginBottom: "12px",
        }}
      >
        <Button
          type="button"
          variant="primary"
          onClick={onAddNew}
        >
          Add New
        </Button>
        <Button
          type="button"
          variant="excel"
          onClick={handleExportExcel}
        >
          Export to Excel
        </Button>
      </div>

      {/* Filter Panel */}
      <div className="tx-panel" style={{ padding: "16px 20px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "14px",
            alignItems: "flex-end",
          }}
        >
          {/* Search */}
          <div className="master-form-group" style={{ gridColumn: "span 2" }}>
            <label className="master-form-label">Search</label>
            <SearchField
              value={search}
              onChange={(val) => {
                setSearch(val);
                setCurrentPage(1);
              }}
              placeholder="Search request code, job no, customer, note..."
            />
          </div>

          {/* Request Date: Start */}
          <div className="master-form-group">
            <label className="master-form-label">Request Date From</label>
            <CustomDatePicker
              value={startDate}
              onChange={(val) => {
                handleStartDateChange(val);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Request Date: End */}
          <div className="master-form-group">
            <label className="master-form-label">Request Date To</label>
            <CustomDatePicker
              value={endDate}
              onChange={(val) => {
                handleEndDateChange(val);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Type of Request */}
          <div className="master-form-group">
            <label className="master-form-label">Type of Request</label>
            <CustomSelect
              value={typeOfRequest}
              onChange={(val) => {
                setTypeOfRequest(val);
                setCurrentPage(1);
              }}
              options={requestMaterialTypesList}
            />
          </div>

          {/* Created By */}
          <div className="master-form-group">
            <label className="master-form-label">Created By</label>
            <CustomSelect
              value={createdBy}
              onChange={(val) => {
                setCreatedBy(val);
                setCurrentPage(1);
              }}
              options={requestMaterialCreatedByList}
            />
          </div>

          {/* Destination Location */}
          <div className="master-form-group">
            <label className="master-form-label">Destination Location</label>
            <CustomSelect
              value={destinationLocation}
              onChange={(val) => {
                setDestinationLocation(val);
                setCurrentPage(1);
              }}
              options={requestMaterialDestinationsList}
            />
          </div>

          {/* Approval */}
          <div className="master-form-group">
            <label className="master-form-label">Approval</label>
            <CustomSelect
              value={approval}
              onChange={(val) => {
                setApproval(val);
                setCurrentPage(1);
              }}
              options={requestMaterialApprovalsList}
            />
          </div>

          {/* Department */}
          <div className="master-form-group">
            <label className="master-form-label">Department</label>
            <CustomSelect
              value={department}
              onChange={(val) => {
                setDepartment(val);
                setCurrentPage(1);
              }}
              options={requestMaterialDepartmentsList}
            />
          </div>

          {/* Project Type */}
          <div className="master-form-group">
            <label className="master-form-label">Project Type</label>
            <CustomSelect
              value={projectType}
              onChange={(val) => {
                setProjectType(val);
                setCurrentPage(1);
              }}
              options={requestMaterialProjectTypesList}
            />
          </div>
        </div>
      </div>

      {/* Table Panel */}
      <div className="panel" style={{ padding: "0" }}>
        <div className="table-frame">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "50px", textAlign: "center" }}>No.</th>
                  <th style={{ minWidth: "150px" }}>Request Code</th>
                  <th style={{ minWidth: "100px" }}>Request Date</th>
                  <th style={{ minWidth: "150px" }}>Destination Location</th>
                  <th style={{ minWidth: "120px" }}>Department</th>
                  <th style={{ minWidth: "130px" }}>Type of Request</th>
                  <th style={{ minWidth: "120px" }}>Job Number</th>
                  <th style={{ minWidth: "160px" }}>Customer</th>
                  <th style={{ minWidth: "200px" }}>Request Note</th>
                  <th style={{ minWidth: "80px", textAlign: "center" }}>Total Items</th>
                  <th style={{ minWidth: "110px", textAlign: "center" }}>Approval</th>
                  <th style={{ minWidth: "140px" }}>Project Type</th>
                  <th style={{ minWidth: "130px" }}>Created Date</th>
                  <th style={{ minWidth: "130px" }}>Last Updated Date</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.length > 0 ? (
                  paginatedRecords.map((item, index) => {
                    const rowNumber =
                      (safeCurrentPage - 1) * pageSize + index + 1;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => handleOpenDetailSafe(item.requestCode || item.id)}
                        style={{ cursor: "pointer" }}
                        title="Click row to open request material details"
                      >
                        <td style={{ textAlign: "center", color: "var(--muted)", fontWeight: 600 }}>
                          {rowNumber}
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetailSafe(item.requestCode || item.id);
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              padding: 0,
                              cursor: "pointer",
                              textAlign: "left",
                            }}
                          >
                            <strong className="cell-code" style={{ color: "var(--blue-700)" }}>
                              {item.requestCode}
                            </strong>
                          </button>
                        </td>
                        <td>{item.requestDate}</td>
                        <td>{item.destinationLocation}</td>
                        <td>
                          <span className="cell-dept">{item.department}</span>
                        </td>
                        <td>{item.typeOfRequest}</td>
                        <td>
                          <span style={{ fontSize: "11.5px", fontWeight: 700 }}>
                            {item.jobNumber}
                          </span>
                        </td>
                        <td>{item.customer || "—"}</td>
                        <td style={{ maxWidth: "240px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.requestNote}>
                          {item.requestNote}
                        </td>
                        <td style={{ textAlign: "center", fontWeight: 700 }}>
                          {item.totalItems}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <ApprovalStatusBadge
                            status={
                              getLocalApprovalState(
                                "request_material",
                                item.requestCode,
                                normalizeApprovalStatus(item.approval)
                              ).status
                            }
                          />
                        </td>
                        <td>{item.projectType}</td>
                        <td style={{ fontSize: "11px", color: "var(--muted)" }}>
                          {item.createdDate}
                        </td>
                        <td style={{ fontSize: "11px", color: "var(--muted)" }}>
                          {item.lastUpdatedDate}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={14} style={{ textAlign: "center", padding: "40px 16px" }}>
                      <div className="empty">
                        <div className="empty__icon">
                          <Icon name="search" />
                        </div>
                        <strong>No material requests found</strong>
                        <span>Try adjusting your filters or search terms.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Unified Pagination */}
          <Pagination
            totalRecords={totalRecords}
            currentPage={safeCurrentPage}
            pageSize={pageSize}
            showPageSize={true}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default RequestMaterialIndex;
