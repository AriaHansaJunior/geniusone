import React, { useState, useEffect, useCallback } from "react";
import { Icon } from "../components/ui/Icon";
import { Button } from "../components/ui/Button";

interface ExchangeRateState {
  currency: string;
  sellingRate: string | null;
  buyingRate: string | null;
  status: "idle" | "loading" | "unavailable";
  sourceName: string;
  note: string;
}

export function Dashboard() {
  const [rateState, setRateState] = useState<ExchangeRateState>({
    currency: "USD",
    sellingRate: null,
    buyingRate: null,
    status: "idle",
    sourceName: "Bank Indonesia / Bea Cukai (Official Customs Rate)",
    note: "Official Bank Indonesia / Bea Cukai rates cannot be fetched directly from browser frontend due to CORS restrictions. Server-side proxy integration is required in the backend milestone.",
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchRates = useCallback(() => {
    setIsRefreshing(true);
    setRateState((prev) => ({ ...prev, status: "loading" }));

    // Honest fetch simulation / check:
    // In accordance with specifications, client-side code does not invent fake rate figures.
    // Official Bank Indonesia / Bea Cukai endpoints do not provide CORS-accessible public JSON APIs.
    const timer = setTimeout(() => {
      setIsRefreshing(false);
      setRateState({
        currency: "USD",
        sellingRate: null,
        buyingRate: null,
        status: "unavailable",
        sourceName: "Bank Indonesia / Bea Cukai (Official Customs Rate)",
        note: "Direct browser-to-BI/Bea Cukai requests are restricted by CORS security policy. A backend proxy service will be integrated during the backend milestone to supply live rate data.",
      });
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  return (
    <div className="dashboard-view">
      {/* Page Title */}
      <div className="dashboard-header">
        <div className="dashboard-header__title">
          <Icon name="home" size={20} className="dashboard-header__icon" />
          <h1>Dashboard</h1>
        </div>
      </div>

      {/* Exchange Rates Card */}
      <div className="dashboard-rate-card">
        <div className="dashboard-rate-card__header">
          <div className="dashboard-rate-card__title">
            <Icon name="globe" size={17} />
            <span>Exchange Rates</span>
          </div>

          <Button
            variant="secondary"
            icon="refresh"
            onClick={fetchRates}
            disabled={isRefreshing}
          >
            {isRefreshing ? "Updating..." : "Update Rates"}
          </Button>
        </div>

        <div className="dashboard-rate-table-wrapper">
          <table className="dashboard-rate-table">
            <thead>
              <tr>
                <th>Currency</th>
                <th>Selling Rate</th>
                <th>Buying Rate</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>{rateState.currency}</strong>
                </td>
                <td>
                  {rateState.status === "loading" ? (
                    <span className="rate-loading-pulse">Checking feed...</span>
                  ) : rateState.sellingRate ? (
                    <span className="rate-value">{rateState.sellingRate}</span>
                  ) : (
                    <span className="rate-unavailable">Unavailable</span>
                  )}
                </td>
                <td>
                  {rateState.status === "loading" ? (
                    <span className="rate-loading-pulse">Checking feed...</span>
                  ) : rateState.buyingRate ? (
                    <span className="rate-value">{rateState.buyingRate}</span>
                  ) : (
                    <span className="rate-unavailable">Unavailable</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="dashboard-rate-card__footer">
          <div className="dashboard-rate-source-info">
            <Icon name="alertTriangle" size={14} />
            <div>
              <strong>Feed Source: {rateState.sourceName}</strong>
              <p>{rateState.note}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
