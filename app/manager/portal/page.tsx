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

const managerSearchMap: Record<string, string[]> = {
  james: ["james"],
  alfie: ["alfie"],
  dylan: ["dylan"],
  jay: ["jay"],
  ellie: ["ellie"],
  lewis: ["lewis"],
  vitali: ["vitali", "vitaly"],
  callum: ["callum"],
  harry: ["harry"],
  chloe: ["chloe"],
  joe: ["joe", "chloe"],

  millie: ["millie"],
  jade: ["jade", "jade1"],
  teddie1: ["teddie", "teddie1"],
  ellie1: ["ellie1", "ellie b", "leb"],
  chris: ["matt"],
};

const managerDisplayMap: Record<string, string> = {
  teddie1: "Teddie",
  ellie1: "Ellie B",
  chris: "Chris",
};

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function getManagerDisplayName(value: string) {
  return managerDisplayMap[value] || titleCase(value);
}

function cleanUsername(value: string | null | undefined) {
  return String(value || "").replace("@", "").trim();
}

function formatNumber(value: number | null | undefined) {
  return Math.round(Number(value || 0)).toLocaleString();
}

function formatHours(value: number | null | undefined) {
  return `${Number(value || 0).toFixed(1)}h`;
}

function isManagerMatch(managerField: string | null, managerUsername: string) {
  const field = String(managerField || "").toLowerCase();
  const cleanManagerUsername = String(managerUsername || "").toLowerCase().trim();
  const keys = managerSearchMap[cleanManagerUsername] || [cleanManagerUsername];

  return keys.some((key) => field.includes(key.toLowerCase()));
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
    const tierA = normaliseTierStatus(a.tier_status);
    const tierB = normaliseTierStatus(b.tier_status);

    if (tierA === "Ranked Up" && tierB !== "Ranked Up") return -1;
    if (tierB === "Ranked Up" && tierA !== "Ranked Up") return 1;

    if (tierA === "Maintained" && tierB !== "Maintained") return -1;
    if (tierB === "Maintained" && tierA !== "Maintained") return 1;

    const focusA = getFocusStatus(a);
    const focusB = getFocusStatus(b);

    if (focusA === "High Potential" && focusB !== "High Potential") return -1;
    if (focusB === "High Potential" && focusA !== "High Potential") return 1;

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
      <div className="portal-avatar-fallback">
        {clean ? clean.charAt(0).toUpperCase() : "?"}
      </div>
    );
  }

  return (
    <img
      src={possibleSrcs[srcIndex]}
      alt={clean}
      className="portal-avatar"
      onError={() => setSrcIndex((prev) => prev + 1)}
    />
  );
}

export default function ManagerPortalPage() {
  const router = useRouter();

  const [managerUsername, setManagerUsername] = useState("");
  const [creators, setCreators] = useState<CreatorStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const loggedIn = localStorage.getItem("manager_logged_in");
    const user = localStorage.getItem("manager_username");

    if (loggedIn !== "true" || !user) {
      router.push("/manager");
      return;
    }

    setManagerUsername(user.toLowerCase().trim());
  }, [router]);

  useEffect(() => {
    async function loadCreators() {
      if (!managerUsername) return;

      const { data } = await submissionsSupabase
        .from("creator_monthly_stats")
        .select("*")
        .order("diamonds", { ascending: false });

      const filtered = (data || []).filter((creator) =>
        isManagerMatch(creator.manager, managerUsername)
      ) as CreatorStat[];

      setCreators(sortCreators(filtered));
      setLoading(false);
    }

    loadCreators();
  }, [managerUsername]);

  const filteredCreators = useMemo(() => {
    return creators.filter((creator) => {
      const focus = getFocusStatus(creator);
      const tier = normaliseTierStatus(creator.tier_status);

      if (filter === "all") return true;
      if (filter === "ranked-up") return tier === "Ranked Up";
      if (filter === "maintained") return tier === "Maintained";
      if (filter === "high-potential") return focus === "High Potential";
      if (filter === "needs-focus") return focus === "Needs Focus";
      if (filter === "needs-first-live") return focus === "Needs First Live";

      return true;
    });
  }, [creators, filter]);

  return (
    <section className="portal-page">
      <style>{`
        html,
        body {
          background: #000 !important;
        }

        .portal-page {
          min-height: 100vh;
          background: #000;
          color: #fff;
          padding: 28px;
        }

        .portal-title {
          font-size: clamp(2rem, 5vw, 4rem);
          font-weight: 950;
          margin: 10px 0;
        }

        .manager-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 999px;
          padding: 8px 13px;
          font-weight: 900;
          color: rgba(255,255,255,0.8);
        }

        .portal-toolbar {
          display: flex;
          justify-content: space-between;
          margin: 24px 0;
          gap: 12px;
          flex-wrap: wrap;
        }

        .portal-filter {
          background: #111;
          color: white;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 14px;
          padding: 12px 14px;
          font-weight: 800;
        }

        .portal-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .portal-row {
          display: grid;
          grid-template-columns: minmax(260px, 1.2fr) minmax(560px, 2fr) 160px;
          gap: 18px;
          align-items: center;
          background: linear-gradient(135deg, #190000, #4d0606 50%, #a81616);
          border-radius: 24px;
          padding: 14px;
          border: 1px solid rgba(255,255,255,0.08);
        }

        .portal-left {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }

        .portal-avatar,
        .portal-avatar-fallback {
          width: 62px;
          height: 62px;
          min-width: 62px;
          border-radius: 18px;
          object-fit: cover;
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.12);
        }

        .portal-avatar-fallback {
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 1.4rem;
        }

        .portal-name {
          font-weight: 900;
          font-size: 1.05rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .portal-small {
          font-size: 0.78rem;
          color: rgba(255,255,255,0.6);
        }

        .portal-stats {
          display: grid;
          grid-template-columns: repeat(5, minmax(96px, 1fr));
          gap: 8px;
          width: 100%;
        }

        .portal-stat {
          background: rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: 10px;
          min-height: 64px;
        }

        .portal-stat-value {
          font-weight: 900;
          margin-top: 4px;
        }

        .portal-right {
          width: 160px;
          min-width: 160px;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
        }

        .portal-badge {
          padding: 7px 11px;
          border-radius: 999px;
          font-size: 0.76rem;
          font-weight: 900;
          width: fit-content;
          white-space: nowrap;
        }

        .ranked {
          background: rgba(45,255,130,0.16);
          color: #63ff9f;
          border: 1px solid rgba(45,255,130,0.45);
        }

        .maintained {
          background: rgba(50,150,255,0.16);
          color: #8dc7ff;
          border: 1px solid rgba(50,150,255,0.45);
        }

        .focus {
          background: rgba(255,170,0,0.16);
          color: #ffd27d;
          border: 1px solid rgba(255,170,0,0.4);
        }

        .tier {
          color: white;
        }

        @media (max-width: 1050px) {
          .portal-row {
            grid-template-columns: 1fr;
          }

          .portal-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .portal-right {
            width: 100%;
            min-width: 0;
            align-items: flex-start;
            flex-direction: row;
            flex-wrap: wrap;
          }
        }
      `}</style>

      <div className="manager-pill">Manager Portal</div>

      <h1 className="portal-title">
        {getManagerDisplayName(managerUsername)}'s Creators
      </h1>

      <div className="portal-toolbar">
        <div className="portal-small">
          Showing {filteredCreators.length} creators
        </div>

        <select
          className="portal-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All Creators</option>
          <option value="ranked-up">Ranked Up</option>
          <option value="maintained">Maintained</option>
          <option value="high-potential">High Potential</option>
          <option value="needs-focus">Needs Focus</option>
          <option value="needs-first-live">Needs First Live</option>
        </select>
      </div>

      {loading ? (
        <div className="portal-small">Loading creators...</div>
      ) : (
        <div className="portal-list">
          {filteredCreators.map((creator) => {
            const focusStatus = getFocusStatus(creator);
            const tierStatus = normaliseTierStatus(creator.tier_status);
            const tier = getTierLevel(Number(creator.diamonds || 0));

            return (
              <div className="portal-row" key={creator.creator_id}>
                <div className="portal-left">
                  <ProfileImage username={creator.username} />

                  <div>
                    <div className="portal-name">{creator.username}</div>

                    <div className="portal-small">
                      Joined {creator.days_since_joining || 0} days ago
                    </div>
                  </div>
                </div>

                <div className="portal-stats">
                  <div className="portal-stat">
                    <div className="portal-small">Diamonds</div>
                    <div className="portal-stat-value">
                      {formatNumber(creator.diamonds)}
                    </div>
                  </div>

                  <div className="portal-stat">
                    <div className="portal-small">Hours</div>
                    <div className="portal-stat-value">
                      {formatHours(creator.live_duration_hours)}
                    </div>
                  </div>

                  <div className="portal-stat">
                    <div className="portal-small">Valid Days</div>
                    <div className="portal-stat-value">
                      {formatNumber(creator.valid_go_live_days)}
                    </div>
                  </div>

                  <div className="portal-stat">
                    <div className="portal-small">Followers</div>
                    <div className="portal-stat-value">
                      +{formatNumber(creator.new_followers)}
                    </div>
                  </div>

                  <div className="portal-stat">
                    <div className="portal-small">Streams</div>
                    <div className="portal-stat-value">
                      {formatNumber(creator.live_streams)}
                    </div>
                  </div>
                </div>

                <div className="portal-right">
                  <span
                    className="portal-badge tier"
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
                      className={`portal-badge ${
                        tierStatus === "Ranked Up" ? "ranked" : "maintained"
                      }`}
                    >
                      {tierStatus}
                    </span>
                  ) : null}

                  {focusStatus !== "Active" ? (
                    <span className="portal-badge focus">{focusStatus}</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}