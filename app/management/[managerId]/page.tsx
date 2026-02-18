// app/management/[managerId]/page.tsx

import { getManagementData } from "@/lib/management-store";
import { attendancePercent, type ManagerId } from "@/lib/management-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const VALID_TARGET = 32;

function niceNumber(n: number | null) {
  if (n === null || n === undefined) return "—";
  return Number.isFinite(n) ? n.toLocaleString("en-GB") : "—";
}

function attendanceTone(percent: number, totalMeetings: number) {
  if (!totalMeetings) return "neutral" as const;
  if (percent < 70) return "red" as const;
  if (percent <= 95) return "yellow" as const;
  return "green" as const;
}

function validTone(rate: number | null) {
  if (rate === null || rate === undefined) return "neutral" as const;
  if (rate < VALID_TARGET * 0.5) return "red" as const; // <16
  if (rate < VALID_TARGET) return "yellow" as const; // 16-31.99
  return "green" as const; // >=32
}

function toneStyles(tone: "neutral" | "red" | "yellow" | "green") {
  if (tone === "red") {
    return {
      border: "1px solid rgba(255,77,77,0.45)",
      background: "rgba(255,77,77,0.12)",
    };
  }
  if (tone === "yellow") {
    return {
      border: "1px solid rgba(255,210,77,0.45)",
      background: "rgba(255,210,77,0.12)",
    };
  }
  if (tone === "green") {
    return {
      border: "1px solid rgba(77,255,160,0.40)",
      background: "rgba(77,255,160,0.10)",
    };
  }
  return {
    border: "1px solid rgba(45,224,255,0.16)",
    background: "rgba(6,24,38,0.75)",
  };
}

export default async function ManagerPortalPage({
  params,
}: {
  params: Promise<{ managerId: string }>;
}) {
  const { managerId } = await params;

  const data = await getManagementData();
  const id = (managerId || "").toLowerCase() as ManagerId;

  const manager = data.managers.find((m) => m.id === id);

  if (!manager) {
    return (
      <main style={{ padding: 22, color: "white" }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>Manager not found</div>
        <div style={{ opacity: 0.75, marginTop: 6 }}>
          This portal doesn’t exist.
        </div>
      </main>
    );
  }

  const att = attendancePercent(manager.id, data.meetings);
  const attTone = attendanceTone(att.percent, att.total);
  const vTone = validTone(manager.validGoLiveRate);

  return (
    <main style={{ padding: 18, color: "white" }}>
      <div
        style={{
          maxWidth: 980,
          margin: "0 auto",
          borderRadius: 18,
          background: "#03101a",
          border: "1px solid rgba(45,224,255,0.25)",
          boxShadow: "0 0 18px rgba(45,224,255,0.12)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "18px 18px",
            borderBottom: "1px solid rgba(45,224,255,0.18)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: 22, fontWeight: 950 }}>{manager.name}</div>
            <div style={{ opacity: 0.7, marginTop: 4, fontWeight: 700 }}>
              Management Portal (Read-Only)
            </div>
          </div>

          <div style={{ opacity: 0.65, fontSize: 13 }}>
            Updated: {new Date(data.updatedAtISO).toLocaleString("en-GB")}
          </div>
        </div>

        <div style={{ padding: 18 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <Card title="Attendance" tone={attTone}>
              <div style={{ fontSize: 28, fontWeight: 950 }}>
                {att.total ? `${att.percent}%` : "—"}
              </div>
              <div style={{ opacity: 0.7, fontWeight: 750 }}>
                {att.attended}/{att.total || 0} meetings attended
              </div>
            </Card>

            <Card title="Valid Go Live Rate" tone={vTone}>
              <div style={{ fontSize: 28, fontWeight: 950 }}>
                {manager.validGoLiveRate == null
                  ? "—"
                  : `${niceNumber(manager.validGoLiveRate)}%`}
              </div>
              <div style={{ opacity: 0.8, fontWeight: 850, marginTop: 6 }}>
                Valid go live rate target is {VALID_TARGET}%
              </div>
            </Card>

            <Card title="Current Pay %" tone="neutral">
              <div style={{ fontSize: 28, fontWeight: 950 }}>
                {manager.currentPayPercent == null
                  ? "—"
                  : `${niceNumber(manager.currentPayPercent)}%`}
              </div>
              <div style={{ opacity: 0.7, fontWeight: 750 }}>Set by admin</div>
            </Card>

            <Card title="Recruits" tone="neutral">
              <div style={{ fontSize: 18, fontWeight: 950 }}>
                This week:{" "}
                <span style={{ fontSize: 26 }}>
                  {niceNumber(manager.recruitsThisWeek)}
                </span>
              </div>
              <div style={{ opacity: 0.8, fontWeight: 850, marginTop: 6 }}>
                Month-to-date: {niceNumber(manager.recruitsMTD)}
              </div>
            </Card>

            <Card title="Avg Diamonds per Creator" tone="neutral">
              <div style={{ fontSize: 28, fontWeight: 950 }}>
                {niceNumber(manager.avgDiamondsPerCreator)}
              </div>
              <div style={{ opacity: 0.7, fontWeight: 750 }}>Manual input</div>
            </Card>

            <Card title="Matches per Creator" tone="neutral">
              <div style={{ fontSize: 28, fontWeight: 950 }}>
                {niceNumber(manager.matchesPerCreator)}
              </div>
              <div style={{ opacity: 0.7, fontWeight: 750 }}>Manual input</div>
            </Card>

            <Card title="Notes / Focus" tone="neutral">
              <div
                style={{
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.5,
                  fontWeight: 750,
                }}
              >
                {manager.notes?.trim() ? manager.notes : "—"}
              </div>
            </Card>
          </div>

          {data.meetings.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 950, marginBottom: 10 }}>
                Meetings this period
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {data.meetings
                  .slice()
                  .sort((a, b) => (a.dateISO < b.dateISO ? -1 : 1))
                  .map((m) => {
                    const attended = !!m.attendance?.[manager.id];
                    const chipTone = attended ? "green" : "red";
                    const chip = toneStyles(chipTone);
                    return (
                      <div
                        key={m.id}
                        style={{
                          padding: "12px 12px",
                          borderRadius: 14,
                          border: "1px solid rgba(45,224,255,0.16)",
                          background: "rgba(6,24,38,0.75)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 900 }}>{m.label}</div>
                          <div style={{ opacity: 0.7, fontSize: 13 }}>
                            {m.dateISO}
                          </div>
                        </div>
                        <div
                          style={{
                            padding: "8px 10px",
                            borderRadius: 999,
                            ...chip,
                            fontWeight: 950,
                          }}
                        >
                          {attended ? "Attended ✅" : "Missed ❌"}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function Card({
  title,
  children,
  tone,
}: {
  title: string;
  children: React.ReactNode;
  tone: "neutral" | "red" | "yellow" | "green";
}) {
  const s = toneStyles(tone);
  return (
    <div
      style={{
        borderRadius: 16,
        border: s.border,
        background: s.background,
        padding: 14,
        minHeight: 110,
      }}
    >
      <div style={{ opacity: 0.75, fontWeight: 900, marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </div>
  );
}
