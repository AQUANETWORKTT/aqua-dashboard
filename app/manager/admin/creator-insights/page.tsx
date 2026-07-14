"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { submissionsSupabase } from "@/lib/submissions-supabase";

type CreatorStat = {
  id: string;
  creator_id: string;
  username: string | null;
  manager: string | null;
  days_since_joining: number | null;
  diamonds: number | null;
  live_duration_hours: number | null;
  valid_go_live_days: number | null;
  new_followers: number | null;
  live_streams: number | null;
  tier_status: string | null;
};

function formatNumber(value: number | null | undefined) {
  return Math.round(Number(value || 0)).toLocaleString();
}

function formatHours(value: number | null | undefined) {
  return `${Number(value || 0).toFixed(1)}h`;
}

function cleanUsername(value: string | null | undefined) {
  return String(value || "").replace("@", "").trim();
}

function getFocusStatus(creator: CreatorStat) {
  const days = Number(creator.days_since_joining || 0);
  const diamonds = Number(creator.diamonds || 0);
  const hours = Number(creator.live_duration_hours || 0);
  const validDays = Number(creator.valid_go_live_days || 0);

  if (days <= 14 && diamonds >= 10000 && hours >= 5) return "High Potential";
  if (days <= 14 && hours < 1) return "Needs First Live";
  if (hours < 5 || validDays < 3) return "Needs Focus";

  return "Active";
}

function normaliseTierStatus(value: string | null | undefined) {
  const clean = String(value || "").toLowerCase().trim();

  if (clean.includes("rank")) return "Ranked Up";

  if (
    clean.includes("not maintain") ||
    clean.includes("not maintained") ||
    clean.includes("unmaintained") ||
    clean.includes("failed")
  ) {
    return "";
  }

  if (clean === "maintained" || clean === "maintain") return "Maintained";

  return "";
}

function getTierLevel(diamonds: number) {
  if (diamonds >= 5000000) return { label: "Tier 10", color: "#ffb703" };
  if (diamonds >= 2500000) return { label: "Tier 9", color: "#fb8500" };
  if (diamonds >= 1600000) return { label: "Tier 8", color: "#ff006e" };
  if (diamonds >= 1000000) return { label: "Tier 7", color: "#8338ec" };
  if (diamonds >= 700000) return { label: "Tier 6", color: "#3a86ff" };
  if (diamonds >= 500000) return { label: "Tier 5", color: "#00b4d8" };
  if (diamonds >= 300000) return { label: "Tier 4", color: "#2ec4b6" };
  if (diamonds >= 200000) return { label: "Tier 3", color: "#52b788" };
  if (diamonds >= 100000) return { label: "Tier 2", color: "#90be6d" };

  return { label: "Tier 1", color: "#999999" };
}

function sortCreators(creators: CreatorStat[]) {
  return [...creators].sort((a, b) => {
    const statusA = getFocusStatus(a);
    const statusB = getFocusStatus(b);
    const tierA = normaliseTierStatus(a.tier_status);
    const tierB = normaliseTierStatus(b.tier_status);

    if (statusA === "High Potential" && statusB !== "High Potential") return -1;
    if (statusB === "High Potential" && statusA !== "High Potential") return 1;

    if (tierA === "Ranked Up" && tierB !== "Ranked Up") return -1;
    if (tierB === "Ranked Up" && tierA !== "Ranked Up") return 1;

    if (tierA === "Maintained" && tierB !== "Maintained") return -1;
    if (tierB === "Maintained" && tierA !== "Maintained") return 1;

    return Number(b.diamonds || 0) - Number(a.diamonds || 0);
  });
}

function ProfileImage({ username }: { username: string | null }) {
  const clean = cleanUsername(username);
  const [srcIndex, setSrcIndex] = useState(0);

  const possibleSrcs = [
    `/creators/${clean}.jpg`,
    `/creators/${clean}.png`,
    `/creators/${clean}.webp`,
    `/creators/${clean}.jpeg`,
  ];

  if (!clean || srcIndex >= possibleSrcs.length) {
    return (
      <div className="insights-avatar-fallback">
        {clean ? clean.charAt(0).toUpperCase() : "?"}
      </div>
    );
  }

  return (
    <img
      src={possibleSrcs[srcIndex]}
      alt={clean}
      className="insights-avatar"
      onError={() => setSrcIndex((prev) => prev + 1)}
    />
  );
}

export default function CreatorInsightsPage() {
  const router = useRouter();

  const [checkedAccess] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("manager_admin_access") === "true";
  });
  const [creators, setCreators] = useState<CreatorStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("high-potential");

  useEffect(() => {
    if (!checkedAccess) {
      router.push("/manager/admin");
    }
  }, [checkedAccess, router]);

  useEffect(() => {
    async function loadCreators() {
      const { data } = await submissionsSupabase
        .from("creator_monthly_stats")
        .select("*")
        .order("diamonds", { ascending: false });

      setCreators(sortCreators((data || []) as CreatorStat[]));
      setLoading(false);
    }

    loadCreators();
  }, []);

  const filteredCreators = useMemo(() => {
    return creators.filter((creator) => {
      const focus = getFocusStatus(creator);
      const tierStatus = normaliseTierStatus(creator.tier_status);
      const tier = getTierLevel(Number(creator.diamonds || 0)).label;

      if (filter === "all") return true;
      if (filter === "high-potential") return focus === "High Potential";
      if (filter === "ranked-up") return tierStatus === "Ranked Up";
      if (filter === "maintained") return tierStatus === "Maintained";
      if (filter === "needs-focus") return focus === "Needs Focus";
      if (filter === "needs-first-live") return focus === "Needs First Live";
      if (filter.startsWith("tier-")) return tier.toLowerCase().replace(" ", "-") === filter;

      return true;
    });
  }, [creators, filter]);

  if (!checkedAccess) return null;

  return (
    <section className="insights-page">
      <style>{`
        html,
        body {
          background: #000 !important;
        }

        .insights-page {
          min-height: 100vh;
          background: #000;
          color: #fff;
          padding: 28px;
        }

        .insights-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .insights-title {
          font-size: clamp(2rem, 5vw, 4rem);
          font-weight: 950;
          margin: 10px 0;
          letter-spacing: -0.04em;
        }

        .insights-subtitle {
          color: rgba(255,255,255,0.62);
          max-width: 720px;
          line-height: 1.5;
        }

        .insights-actions {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }

        .insights-select,
        .insights-button {
          background: #111;
          color: white;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 14px;
          padding: 12px 14px;
          font-weight: 800;
        }

        .insights-button {
          cursor: pointer;
        }

        .insights-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .insights-row {
          display: grid;
          grid-template-columns: minmax(260px, 1.2fr) minmax(560px, 2fr) 180px;
          gap: 18px;
          align-items: center;
          background: linear-gradient(135deg, #190000, #4d0606 50%, #a81616);
          border-radius: 24px;
          padding: 14px;
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 18px 44px rgba(120,0,0,0.18);
        }

        .insights-left {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }

        .insights-avatar,
        .insights-avatar-fallback {
          width: 62px;
          height: 62px;
          min-width: 62px;
          border-radius: 18px;
          object-fit: cover;
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.12);
        }

        .insights-avatar-fallback {
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 1.4rem;
        }

        .insights-name {
          font-weight: 900;
          font-size: 1.05rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .insights-small {
          font-size: 0.78rem;
          color: rgba(255,255,255,0.6);
        }

        .insights-stats {
          display: grid;
          grid-template-columns: repeat(5, minmax(96px, 1fr));
          gap: 8px;
          width: 100%;
        }

        .insights-stat {
          background: rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: 10px;
          min-height: 64px;
        }

        .insights-stat-value {
          font-weight: 900;
          margin-top: 4px;
        }

        .insights-right {
          width: 180px;
          min-width: 180px;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
        }

        .insights-badge {
          padding: 7px 11px;
          border-radius: 999px;
          font-size: 0.76rem;
          font-weight: 900;
          width: fit-content;
          white-space: nowrap;
        }

        .insights-ranked {
          background: rgba(45,255,130,0.16);
          color: #63ff9f;
          border: 1px solid rgba(45,255,130,0.45);
        }

        .insights-maintained {
          background: rgba(50,150,255,0.16);
          color: #8dc7ff;
          border: 1px solid rgba(50,150,255,0.45);
        }

        .insights-focus {
          background: rgba(255,170,0,0.16);
          color: #ffd27d;
          border: 1px solid rgba(255,170,0,0.4);
        }

        @media (max-width: 1050px) {
          .insights-row {
            grid-template-columns: 1fr;
          }

          .insights-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .insights-right {
            width: 100%;
            min-width: 0;
            align-items: flex-start;
            flex-direction: row;
            flex-wrap: wrap;
          }
        }
      `}</style>

      <div className="insights-top">
        <div>
          <div className="manager-pill">Admin View</div>

          <h1 className="insights-title">Creator Insights</h1>

          <p className="insights-subtitle">
            View high-potential creators and filter across all managers.
          </p>
        </div>

        <div className="insights-actions">
          <select
            className="insights-select"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="high-potential">High Potential</option>
            <option value="all">All Creators</option>
            <option value="ranked-up">Ranked Up</option>
            <option value="maintained">Maintained</option>
            <option value="needs-focus">Needs Focus</option>
            <option value="needs-first-live">Needs First Live</option>
            <option value="tier-1">Tier 1</option>
            <option value="tier-2">Tier 2</option>
            <option value="tier-3">Tier 3</option>
            <option value="tier-4">Tier 4</option>
            <option value="tier-5">Tier 5</option>
            <option value="tier-6">Tier 6</option>
            <option value="tier-7">Tier 7</option>
            <option value="tier-8">Tier 8</option>
            <option value="tier-9">Tier 9</option>
            <option value="tier-10">Tier 10</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="insights-small">Loading creator insights...</div>
      ) : (
        <>
          <div className="insights-small" style={{ marginBottom: 14 }}>
            Showing {filteredCreators.length} creators
          </div>

          <div className="insights-list">
            {filteredCreators.map((creator) => {
              const focusStatus = getFocusStatus(creator);
              const tierStatus = normaliseTierStatus(creator.tier_status);
              const tier = getTierLevel(Number(creator.diamonds || 0));

              return (
                <div className="insights-row" key={creator.creator_id}>
                  <div className="insights-left">
                    <ProfileImage username={creator.username} />

                    <div>
                      <div className="insights-name">{creator.username}</div>

                      <div className="insights-small">
                        {creator.manager || "No manager"}
                      </div>

                      <div className="insights-small">
                        Joined {creator.days_since_joining || 0} days ago
                      </div>
                    </div>
                  </div>

                  <div className="insights-stats">
                    <div className="insights-stat">
                      <div className="insights-small">Diamonds</div>
                      <div className="insights-stat-value">
                        {formatNumber(creator.diamonds)}
                      </div>
                    </div>

                    <div className="insights-stat">
                      <div className="insights-small">Hours</div>
                      <div className="insights-stat-value">
                        {formatHours(creator.live_duration_hours)}
                      </div>
                    </div>

                    <div className="insights-stat">
                      <div className="insights-small">Valid Days</div>
                      <div className="insights-stat-value">
                        {formatNumber(creator.valid_go_live_days)}
                      </div>
                    </div>

                    <div className="insights-stat">
                      <div className="insights-small">Followers</div>
                      <div className="insights-stat-value">
                        +{formatNumber(creator.new_followers)}
                      </div>
                    </div>

                    <div className="insights-stat">
                      <div className="insights-small">Streams</div>
                      <div className="insights-stat-value">
                        {formatNumber(creator.live_streams)}
                      </div>
                    </div>
                  </div>

                  <div className="insights-right">
                    <span
                      className="insights-badge"
                      style={{
                        background: `${tier.color}22`,
                        border: `1px solid ${tier.color}`,
                        color: tier.color,
                      }}
                    >
                      {tier.label}
                    </span>

                    {tierStatus ? (
                      <span
                        className={`insights-badge ${
                          tierStatus === "Ranked Up"
                            ? "insights-ranked"
                            : "insights-maintained"
                        }`}
                      >
                        {tierStatus}
                      </span>
                    ) : null}

                    {focusStatus !== "Active" ? (
                      <span className="insights-badge insights-focus">
                        {focusStatus}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
