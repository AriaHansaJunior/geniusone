import React, { useState } from "react";
import { Icon } from "../../components/ui/Icon";
import type { ExchangeRateRecord } from "./dashboard-rate-types";

interface DashboardRateChartProps {
  records: ExchangeRateRecord[];
}

export function DashboardRateChart({ records }: DashboardRateChartProps) {
  const [hoveredItem, setHoveredItem] = useState<ExchangeRateRecord | null>(null);

  // Filter only records that have actual numeric rate values (excluding base IDR)
  const availableItems = records.filter(
    (r) =>
      r.availability === "Available" &&
      typeof r.rate === "number" &&
      r.rate > 0 &&
      r.currencyCode !== "IDR"
  );

  if (availableItems.length === 0) {
    return (
      <div
        className="rate-chart-empty"
        style={{
          padding: "48px 24px",
          textAlign: "center",
          background: "#f8fafc",
          borderRadius: "var(--radius-sm)",
          border: "1px dashed var(--line)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            background: "#eff6ff",
            color: "var(--blue-600)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <Icon name="layers" size={22} />
        </div>
        <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--ink)" }}>
          No Available Rate Data for Selected Filters
        </h4>
        <p style={{ margin: 0, fontSize: "12px", color: "var(--muted)", maxWidth: "420px" }}>
          In accordance with data integrity guidelines, exchange rate charts reflect only verified
          available rates. Live feeds currently unavailable due to browser CORS policies are not
          synthesized.
        </p>
      </div>
    );
  }

  // Deduplicate by currency + rateType for comparative view, taking the latest date
  const uniqueItemsMap = new Map<string, ExchangeRateRecord>();
  availableItems.forEach((item) => {
    const key = `${item.currencyCode}-${item.rateType}`;
    if (!uniqueItemsMap.has(key)) {
      uniqueItemsMap.set(key, item);
    }
  });
  const chartData = Array.from(uniqueItemsMap.values());

  // Dimensions for SVG Bar Chart
  const svgWidth = 840;
  const svgHeight = 280;
  const paddingLeft = 70;
  const paddingRight = 30;
  const paddingTop = 30;
  const paddingBottom = 50;

  const chartInnerWidth = svgWidth - paddingLeft - paddingRight;
  const chartInnerHeight = svgHeight - paddingTop - paddingBottom;

  const maxVal = Math.max(...chartData.map((d) => d.rate || 0), 100);
  const yMax = Math.ceil(maxVal * 1.15);

  const barGroupWidth = chartInnerWidth / chartData.length;
  const barWidth = Math.min(36, barGroupWidth * 0.45);

  return (
    <div className="rate-chart-container" style={{ padding: "16px 20px" }}>
      {/* Chart Header & Legend */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <div>
          <h4 style={{ margin: "0 0 4px 0", fontSize: "13.5px", fontWeight: 800, color: "var(--ink)" }}>
            Available Benchmark Rates (IDR per Unit)
          </h4>
          <span style={{ fontSize: "11.5px", color: "var(--muted)" }}>
            Comparing {chartData.length} active currency rates based on published valuation data.
          </span>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: "16px", alignItems: "center", fontSize: "11.5px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "10px",
                height: "10px",
                background: "var(--blue-600, #2563eb)",
                borderRadius: "2px",
              }}
            />
            <span style={{ fontWeight: 600, color: "var(--ink)" }}>Middle Rate</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "10px",
                height: "10px",
                background: "#059669",
                borderRadius: "2px",
              }}
            />
            <span style={{ fontWeight: 600, color: "var(--ink)" }}>Buying Rate</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "10px",
                height: "10px",
                background: "#dc2626",
                borderRadius: "2px",
              }}
            />
            <span style={{ fontWeight: 600, color: "var(--ink)" }}>Selling Rate</span>
          </div>
        </div>
      </div>

      {/* Responsive SVG Chart */}
      <div
        style={{
          width: "100%",
          overflowX: "auto",
          background: "#ffffff",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-sm)",
          padding: "10px",
        }}
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ width: "100%", height: "auto", minWidth: "620px", display: "block" }}
        >
          {/* Grid lines & Y-axis scale */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const val = Math.round(yMax * pct);
            const y = paddingTop + chartInnerHeight * (1 - pct);
            return (
              <g key={pct}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--muted, #64748b)"
                  fontFamily="inherit"
                >
                  {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                </text>
              </g>
            );
          })}

          {/* Bars for each currency */}
          {chartData.map((item, idx) => {
            const groupX = paddingLeft + idx * barGroupWidth;
            const centerX = groupX + barGroupWidth / 2;
            const currentRate = item.rate || 0;
            const barHeight = (currentRate / yMax) * chartInnerHeight;
            const barY = paddingTop + chartInnerHeight - barHeight;

            const isHovered = hoveredItem?.id === item.id;

            return (
              <g
                key={item.id}
                onMouseEnter={() => setHoveredItem(item)}
                onMouseLeave={() => setHoveredItem(null)}
                style={{ cursor: "pointer" }}
              >
                {/* Background hover highlight */}
                {isHovered && (
                  <rect
                    x={groupX + 4}
                    y={paddingTop}
                    width={barGroupWidth - 8}
                    height={chartInnerHeight}
                    fill="#f1f5f9"
                    rx="4"
                    opacity="0.6"
                  />
                )}

                {/* Primary Rate Bar */}
                <rect
                  x={centerX - barWidth / 2}
                  y={barY}
                  width={barWidth}
                  height={Math.max(4, barHeight)}
                  fill={isHovered ? "var(--blue-700, #1d4ed8)" : "var(--blue-600, #2563eb)"}
                  rx="3"
                  style={{ transition: "fill 0.15s ease" }}
                />

                {/* Value label on top of bar */}
                <text
                  x={centerX}
                  y={barY - 6}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="700"
                  fill="var(--ink, #0f172a)"
                >
                  {currentRate.toLocaleString("en-US", { maximumFractionDigits: 1 })}
                </text>

                {/* X-axis Label */}
                <text
                  x={centerX}
                  y={svgHeight - paddingBottom + 16}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill="var(--ink, #0f172a)"
                >
                  {item.currencyCode}
                </text>
                <text
                  x={centerX}
                  y={svgHeight - paddingBottom + 30}
                  textAnchor="middle"
                  fontSize="9.5"
                  fill="var(--muted, #64748b)"
                >
                  {item.rateType.split(" ")[0]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Tooltip / Details banner for hovered bar */}
      {hoveredItem && (
        <div
          style={{
            marginTop: "12px",
            padding: "10px 16px",
            background: "#f8fafc",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-sm)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
            fontSize: "12px",
          }}
        >
          <div>
            <strong>
              {hoveredItem.currencyCode} — {hoveredItem.currencyName}
            </strong>
            <span style={{ color: "var(--muted)", marginLeft: "8px" }}>
              ({hoveredItem.rateType} · {hoveredItem.rateDate})
            </span>
          </div>

          <div style={{ display: "flex", gap: "16px" }}>
            <span>
              Buy:{" "}
              <strong>
                {hoveredItem.buyingRate ? hoveredItem.buyingRate.toLocaleString("en-US") : "—"}
              </strong>
            </span>
            <span>
              Sell:{" "}
              <strong>
                {hoveredItem.sellingRate ? hoveredItem.sellingRate.toLocaleString("en-US") : "—"}
              </strong>
            </span>
            <span style={{ color: "var(--blue-700)" }}>
              Rate:{" "}
              <strong>
                {hoveredItem.rate ? hoveredItem.rate.toLocaleString("en-US") : "—"}
              </strong>
            </span>
            <span className="code-pill" style={{ fontSize: "10.5px" }}>
              {hoveredItem.flag}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardRateChart;
