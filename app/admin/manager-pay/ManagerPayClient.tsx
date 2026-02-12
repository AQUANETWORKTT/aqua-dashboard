"use client";

import { useMemo, useState } from "react";

export type ManagerPayCreatorRow = {
  username: string;
  avatarSrc: string;
  diamonds: number;
  hours: number;
  validDays: number;
  revenueUSD: number;
  managerPayUSD: number;
};

export type ManagerPayRow = {
  manager: string;
  payPct: number;
  creatorCount: number;

  teamDiamonds: number;
  teamRevenueUSD: number;

  revenueBasedPayUSD: number;
  graduationBonusUSD: number;
  totalPayUSD: number;

  graduationTotal: number;
  graduationByType: Record<string, number>;

  activenessCount: number;
  activenessPoints: number;

  creators: ManagerPayCreatorRow[];
};

function fmtUSD(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function ManagerPayClient({
  monthKey,
  rows,
  managers,
}: {
  monthKey: string;
  rows: ManagerPayRow[];
  managers: readonly string[];
}) {
  const baseRows = Array.isArray(rows) ? rows : [];
  const managerOptions = Array.isArray(managers) ? managers : ["All"];

  const [selectedManager, setSelectedManager] = useState<string>("All");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const safeSelectedManager = useMemo(() => {
    return managerOptions.includes(selectedManager) ? selectedManager : "All";
  }, [managerOptions, selectedManager]);

  const filtered = useMemo(() => {
    if (safeSelectedManager === "All") return baseRows;
    return baseRows.filter((r) => r.manager === safeSelectedManager);
  }, [baseRows, safeSelectedManager]);

  const totals = useMemo(() => {
    const teamDiamonds = filtered.reduce((a, r) => a + r.teamDiamonds, 0);
    const revenue = filtered.reduce((a, r) => a + r.teamRevenueUSD, 0);
    const revPay = filtered.reduce((a, r) => a + r.revenueBasedPayUSD, 0);
    const gradBonus = filtered.reduce((a, r) => a + r.graduationBonusUSD, 0);
    const totalPay = filtered.reduce((a, r) => a + r.totalPayUSD, 0);
    const grads = filtered.reduce((a, r) => a + r.graduationTotal, 0);
    const acts = filtered.reduce((a, r) => a + r.activenessCount, 0);
    const actPts = filtered.reduce((a, r) => a + r.activenessPoints, 0);
    return { teamDiamonds, revenue, revPay, gradBonus, totalPay, grads, acts, actPts };
  }, [filtered]);

  /* ===================== STYLES ===================== */

  const card: React.CSSProperties = {
    borderRadius: 18,
    padding: 14,
    background: "rgba(6, 27, 43, 0.75)",
    border: "1px solid rgba(45,224,255,0.20)",
    boxShadow: "0 0 28px rgba(45,224,255,0.10)",
    backdropFilter: "blur(6px)",
  };

  const pillRow: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  };

  const pill: React.CSSProperties = {
    padding: "7px 12px",
    borderRadius: 999,
    border: "1px solid rgba(124,246,255,0.22)",
    background: "rgba(45,224,255,0.08)",
    color: "rgba(124,246,255,0.95)",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  };

  const tableOuter: React.CSSProperties = {
    borderRadius: 18,
    overflow: "hidden",
    border: "1px solid rgba(45,224,255,0.18)",
    background: "rgba(4, 21, 33, 0.82)",
    boxShadow: "0 0 32px rgba(45,224,255,0.08)",
  };

  const head: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "2.2fr 0.9fr 1.3fr 1.3fr 1.1fr 1.1fr 1.1fr 1.1fr",
    gap: 10,
    padding: "12px 14px",
    background: "rgba(45,224,255,0.08)",
    borderBottom: "1px solid rgba(45,224,255,0.18)",
    color: "rgba(124,246,255,0.95)",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
  };

  const rowStyle = (idx: number): React.CSSProperties => ({
    display: "grid",
    gridTemplateColumns: "2.2fr 0.9fr 1.3fr 1.3fr 1.1fr 1.1fr 1.1fr 1.1fr",
    gap: 10,
    padding: "12px 14px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    background: idx % 2 === 0 ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.00)",
    alignItems: "center",
  });

  const managerName: React.CSSProperties = {
    fontWeight: 900,
    color: "#7cf6ff",
    textShadow: "0 0 8px rgba(45,224,255,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    minWidth: 0,
  };

  const btn: React.CSSProperties = {
    padding: "7px 10px",
    borderRadius: 12,
    border: "1px solid rgba(45,224,255,0.25)",
    background: "rgba(45,224,255,0.08)",
    color: "rgba(124,246,255,0.95)",
    fontWeight: 900,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  const subTable: React.CSSProperties = {
    padding: 14,
    borderTop: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(255,255,255,0.02)",
  };

  const creatorRow: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "2.2fr 1.2fr 1.2fr 1.2fr 1.2fr",
    gap: 10,
    padding: "10px 10px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.02)",
    alignItems: "center",
  };

  const avatar: React.CSSProperties = {
    width: 30,
    height: 30,
    borderRadius: 999,
    border: "1px solid rgba(124,246,255,0.35)",
    objectFit: "cover",
    flex: "0 0 auto",
  };

  const small: React.CSSProperties = {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    fontWeight: 800,
  };

  const gradLine = (byType: Record<string, number>) => {
    const entries = Object.entries(byType).filter(([, v]) => Number(v) > 0);
    if (entries.length === 0) return "—";
    entries.sort((a, b) => (Number(b[1]) || 0) - (Number(a[1]) || 0));
    return entries.map(([k, v]) => `${k}: ${v}`).join(" • ");
  };

  return (
    <>
      <section style={card}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(124,246,255,0.95)",
            }}
          >
            Manager
          </div>

          <select
            value={safeSelectedManager}
            onChange={(e) => setSelectedManager(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: 14,
              border: "1px solid rgba(45,224,255,0.25)",
              background: "rgba(4, 21, 33, 0.85)",
              color: "white",
              fontWeight: 900,
              outline: "none",
            }}
          >
            {managerOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <div style={{ marginLeft: "auto", fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: 800 }}>
            Month key: <span style={{ color: "#7cf6ff", fontWeight: 900 }}>{monthKey}</span>
          </div>
        </div>

        <div style={pillRow}>
          <span style={pill}>Team diamonds: {Math.round(totals.teamDiamonds).toLocaleString()}</span>
          <span style={pill}>Revenue: {fmtUSD(totals.revenue)}</span>
          <span style={pill}>Revenue pay: {fmtUSD(totals.revPay)}</span>
          <span style={pill}>Grad bonus: {fmtUSD(totals.gradBonus)}</span>
          <span style={pill}>Total pay: {fmtUSD(totals.totalPay)}</span>
          <span style={pill}>Graduations: {totals.grads}</span>
          <span style={pill}>Activeness: {totals.acts}</span>
          <span style={pill}>Act points: {totals.actPts.toLocaleString()}</span>
        </div>
      </section>

      <section style={tableOuter}>
        <div style={head}>
          <div>Manager</div>
          <div style={{ textAlign: "center" }}>Pay %</div>
          <div style={{ textAlign: "center" }}>Team Diamonds</div>
          <div style={{ textAlign: "center" }}>Revenue</div>
          <div style={{ textAlign: "center" }}>Rev Pay</div>
          <div style={{ textAlign: "center" }}>Grad Bonus</div>
          <div style={{ textAlign: "center" }}>Total Pay</div>
          <div style={{ textAlign: "center" }}>Activeness</div>
        </div>

        {filtered.map((r, idx) => {
          const isOpen = !!expanded[r.manager];
          const payPctLabel = `${Math.round(r.payPct * 100)}%`;

          return (
            <div key={r.manager}>
              <div style={rowStyle(idx)}>
                <div style={managerName}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.manager}{" "}
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: 900 }}>
                      ({r.creatorCount})
                    </span>
                  </span>
                  <button
                    style={btn}
                    onClick={() => setExpanded((p) => ({ ...p, [r.manager]: !p[r.manager] }))}
                  >
                    {isOpen ? "Hide" : "Breakdown"}
                  </button>
                </div>

                <div style={{ textAlign: "center", fontWeight: 900, color: "#7cf6ff" }}>{payPctLabel}</div>

                <div style={{ textAlign: "center", fontWeight: 900 }}>
                  {Math.round(r.teamDiamonds).toLocaleString()}
                </div>

                <div style={{ textAlign: "center", fontWeight: 900 }}>{fmtUSD(r.teamRevenueUSD)}</div>

                <div style={{ textAlign: "center", fontWeight: 900, color: "rgba(124,246,255,0.95)" }}>
                  {fmtUSD(r.revenueBasedPayUSD)}
                </div>

                <div style={{ textAlign: "center", fontWeight: 900 }}>
                  {fmtUSD(r.graduationBonusUSD)}
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>
                    {r.graduationTotal} • {gradLine(r.graduationByType)}
                  </div>
                </div>

                <div style={{ textAlign: "center", fontWeight: 900, color: "#4dffcf" }}>
                  {fmtUSD(r.totalPayUSD)}
                </div>

                <div style={{ textAlign: "center" }}>
                  <div style={{ fontWeight: 900 }}>{r.activenessCount}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>
                    pts: {r.activenessPoints.toLocaleString()}
                  </div>
                </div>
              </div>

              {isOpen && (
                <div style={subTable}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 900,
                      letterSpacing: "0.10em",
                      textTransform: "uppercase",
                      color: "rgba(124,246,255,0.9)",
                      marginBottom: 10,
                    }}
                  >
                    Creator breakdown (revenue share only)
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {r.creators.map((c) => {
                      const denom = clamp(r.revenueBasedPayUSD, 0.000001, 999999999);
                      const pctOfRevPay = (c.managerPayUSD / denom) * 100;

                      return (
                        <div key={c.username} style={creatorRow}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                            <img src={c.avatarSrc} alt={c.username} style={avatar} />
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontWeight: 900,
                                  color: "#7cf6ff",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {c.username}
                              </div>
                              <div style={small}>
                                ✅ {c.validDays} days • ⏱ {c.hours.toFixed(1)}h
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: "center", fontWeight: 900 }}>
                            💎 {Math.round(c.diamonds).toLocaleString()}
                          </div>

                          <div style={{ textAlign: "center", fontWeight: 900 }}>{fmtUSD(c.revenueUSD)}</div>

                          <div style={{ textAlign: "center", fontWeight: 900, color: "rgba(124,246,255,0.95)" }}>
                            share: {fmtUSD(c.managerPayUSD)}
                          </div>

                          <div style={{ textAlign: "center", fontSize: 12, fontWeight: 900, color: "rgba(255,255,255,0.8)" }}>
                            {pctOfRevPay.toFixed(1)}%
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
                    Note: breakdown is <b>revenue-share</b> only. Graduation bonuses are manager-level and shown in the main row.
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>
    </>
  );
}
