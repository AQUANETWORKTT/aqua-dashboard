"use client";

import { useEffect, useMemo, useState } from "react";
import { submissionsSupabase } from "@/lib/submissions-supabase";

type TrackId = "bronze" | "silver" | "gold" | "pro";

type CreatorStat = {
  [key: string]: unknown;
  stats_date?: string | null;
  month_key?: string | null;
  creator_username?: string | null;
  "Creator's username"?: string | null;
  username?: string | null;
  creator_id?: string | null;
  diamonds?: number | null;
  live_hours?: number | null;
  live_duration_hours?: number | null;
  live_duration?: string | null;
  valid_days?: number | null;
  valid_live_days?: number | null;
  valid_go_live_days?: number | null;
  matches?: number | null;
  new_followers?: number | null;
  followers?: number | null;
  new_fans?: number | null;
};

type TrackRequirement = {
  key: "diamonds" | "liveHours" | "validDays" | "matches" | "followers" | "newFans";
  label: string;
  target: number;
  format?: "hours";
};

type TrackConfig = {
  id: TrackId;
  name: string;
  shortName: string;
  prize: string;
  tone: string;
  glow: string;
  creators: string[];
  requirements: TrackRequirement[];
};

type CreatorProgress = {
  username: string;
  track: TrackConfig;
  stats: Record<TrackRequirement["key"], number>;
  progress: number;
  completed: number;
};

const RACE_MONTH_KEY = "2026-07";

const GOLD_CREATORS = [
  "dylanjinks",
  "harryjonesey",
  "z.diness",
  "xomarky",
  "lucylou449",
  "corie.watkins",
  "lukealbert4",
  "elliex035",
  "j.wliveacc",
];

const SILVER_CREATORS = [
  "motherfluttermavismim",
  "libbyamberxoxo",
  "_zeedz",
  "adam_gym234",
  "georgiabrookss20",
  "jake_pearson_1",
  "mollsjadex",
  "lukersuv",
  "avangalinefarr_x0",
  "y0ur_l0cal_j",
  "candicel05",
  "damo_bafc",
  "whossoleice",
  "jack_backup007",
  "kaidensc07",
  "callum.072",
];

const BRONZE_CREATORS = [
  "mikeybrenmusic",
  "x_ruby_x3",
  "ashtonpye",
  "amzymooxox1",
  "austeja_123k2004",
  "nelly.parsnipsx40",
  "meganxrowe",
  "harleyj23x",
  "alfiedavies048",
  "gemma.editz",
  "essexdollabi",
  "georgiaa.dale",
  "j.clarke098",
  "miyarose178",
  "tkaysx",
  "shaysullivan316",
  "anna__quinnell",
  "honeybeee622",
  "clashelniko",
  "sasha.aqua.agency",
  "_alchemizedmusic_",
  "rubes.wh1tw0rth",
  "shan.non20256",
  "ghostboy2034",
  "itzzzrob3",
  "lucy.o707",
  "christina_eva.xo",
  ".tgadz",
  ".jackhill3",
  "ayo_itz_phoebe",
  "daktit_04",
  "titchtok03",
  "lacey.xo.1",
  "dives189",
  "conniie_x",
  "barbie.kovacs",
  "matt.in.motion_",
  "xx.skye.08",
  "quin_oflynn",
  "sum.cxx",
  "keeton663",
  "bethanykate1234",
  "doltonl",
  "livesdailyx0",
  "maizy.grace90",
  "jordan.sears_",
  "zackchauhanmusic",
  "natalie_amber_24",
  "elowenmagik",
  "ashhaslamm",
  "emzylouise1999",
  "lbssett",
  "tf.itzjess",
  "willem_yates",
  "courtslocky",
  "tiffanyhuchinson",
  "meekasprivx",
  "r0tt1ng.st4r",
  "doseofmday",
  "e.xm07",
  "celynjb22",
  "itz_caseyxx",
  "kilbridex",
  "livburns5",
  "dee_dog13",
  "rubesamari4",
  "mollie_b05",
  "boteddie1",
  "lorenademiguelxo",
  "jaydens25..0",
  "hirdy7.8.9",
  "maiawilliams_",
  "aaron.fenton15",
  "csphantom2",
  "bruzy19",
  "caitlynbarden",
  "kylecald11",
  "eviescfc",
  "liamj99_",
  "just_yourgirl_emzy",
  "xojayyy",
];

const BRAGGING_RIGHTS_CREATORS = Array.from(new Set([...GOLD_CREATORS, ...SILVER_CREATORS, ...BRONZE_CREATORS]));
const PRIZE_TRACK_CREATOR_KEYS = new Set([...GOLD_CREATORS, ...SILVER_CREATORS, ...BRONZE_CREATORS].map(usernameKey));

const TRACKS: TrackConfig[] = [
  {
    id: "bronze",
    name: "Bronze Track",
    shortName: "Bronze",
    prize: "3,000",
    tone: "#c47a3c",
    glow: "rgba(196, 122, 60, 0.34)",
    creators: BRONZE_CREATORS,
    requirements: [
      { key: "diamonds", label: "Diamonds", target: 50000 },
      { key: "liveHours", label: "Live duration", target: 30, format: "hours" },
      { key: "validDays", label: "Valid live days", target: 11 },
      { key: "matches", label: "Matches", target: 150 },
      { key: "followers", label: "Followers", target: 30 },
      { key: "newFans", label: "New fans", target: 10 },
    ],
  },
  {
    id: "silver",
    name: "Silver Track",
    shortName: "Silver",
    prize: "6,000",
    tone: "#cbd5e1",
    glow: "rgba(203, 213, 225, 0.3)",
    creators: SILVER_CREATORS,
    requirements: [
      { key: "diamonds", label: "Diamonds", target: 150000 },
      { key: "liveHours", label: "Live duration", target: 60, format: "hours" },
      { key: "validDays", label: "Valid live days", target: 18 },
      { key: "matches", label: "Matches", target: 125 },
      { key: "followers", label: "Followers", target: 75 },
      { key: "newFans", label: "New fans", target: 20 },
    ],
  },
  {
    id: "gold",
    name: "Gold Track",
    shortName: "Gold",
    prize: "10,000",
    tone: "#facc15",
    glow: "rgba(250, 204, 21, 0.32)",
    creators: GOLD_CREATORS,
    requirements: [
      { key: "diamonds", label: "Diamonds", target: 350000 },
      { key: "liveHours", label: "Live duration", target: 80, format: "hours" },
      { key: "validDays", label: "Valid live days", target: 22 },
      { key: "matches", label: "Matches", target: 450 },
      { key: "followers", label: "Followers", target: 150 },
      { key: "newFans", label: "New fans", target: 30 },
    ],
  },
  {
    id: "pro",
    name: "Bragging Rights Track",
    shortName: "Bragging Rights",
    prize: "",
    tone: "#38f3ff",
    glow: "rgba(56, 243, 255, 0.34)",
    creators: BRAGGING_RIGHTS_CREATORS,
    requirements: [
      { key: "diamonds", label: "Diamonds", target: 15000 },
      { key: "liveHours", label: "Live duration", target: 100, format: "hours" },
      { key: "validDays", label: "Valid live days", target: 15 },
      { key: "matches", label: "Matches", target: 650 },
      { key: "followers", label: "Followers", target: 75 },
    ],
  },
];

function getAssignedTrack(username: string) {
  const key = usernameKey(username);
  return TRACKS.find((track) => track.id !== "pro" && track.creators.some((creator) => usernameKey(creator) === key)) || TRACKS[0];
}

function cleanText(value: unknown, fallback = "") {
  return String(value ?? fallback).trim();
}

function safeNumber(value: unknown) {
  const cleaned = String(value ?? "")
    .replace(/,/g, "")
    .replace(/%/g, "")
    .replace(/[^\d.-]/g, "")
    .trim();
  const numberValue = Number(cleaned || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function durationToHours(value: unknown) {
  if (typeof value === "number") return value;
  const text = cleanText(value);
  if (!text) return 0;
  if (!text.includes(":")) return safeNumber(text);

  const parts = text.split(":").map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) return 0;
  if (parts.length === 3) return parts[0] + parts[1] / 60 + parts[2] / 3600;
  if (parts.length === 2) return parts[0] + parts[1] / 60;
  return safeNumber(text);
}

function getText(row: CreatorStat, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && cleanText(value) !== "") return cleanText(value);
  }

  return fallback;
}

function getNumber(row: CreatorStat, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && cleanText(value) !== "") return safeNumber(value);
  }

  return 0;
}

function getDurationHours(row: CreatorStat, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && cleanText(value) !== "") return durationToHours(value);
  }

  return 0;
}

function getUsername(row: CreatorStat) {
  return getText(row, ["username", "creator_username", "Creator's username", "creator_id"], "Unknown").replace(/^@+/, "");
}

function usernameKey(username: string) {
  return username.trim().replace(/^@+/, "").toLowerCase();
}

function uniqueCreatorList(creators: string[]) {
  const seen = new Set<string>();
  return creators.filter((creator) => {
    const key = usernameKey(creator);
    if (!key || key === "unknown" || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatNumber(value: number) {
  return Math.round(value).toLocaleString();
}

function formatRequirementValue(value: number, requirement: TrackRequirement) {
  if (requirement.format === "hours") return `${value.toFixed(1)}h`;
  return formatNumber(value);
}

function getCookieValue(name: string) {
  if (typeof document === "undefined") return "";
  return (
    document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`))
      ?.split("=")[1] || ""
  );
}

async function fetchTikTokAvatar(username: string) {
  if (!username) return "";

  try {
    const res = await fetch("/api/tiktok-avatar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    const json = await res.json();
    return json.avatar || "";
  } catch {
    return "";
  }
}

function CreatorAvatar({ username }: { username: string }) {
  const fallbackSrc = "/creators/default.jpg";
  const localSrc = `/creators/${encodeURIComponent(username)}.jpg`;
  const [src, setSrc] = useState(fallbackSrc);

  useEffect(() => {
    let cancelled = false;
    const localImg = new window.Image();
    localImg.src = localSrc;

    localImg.onload = () => {
      if (!cancelled) setSrc(localSrc);
    };

    localImg.onerror = async () => {
      const scrapedAvatar = await fetchTikTokAvatar(username);
      if (!cancelled) setSrc(scrapedAvatar || fallbackSrc);
    };

    return () => {
      cancelled = true;
    };
  }, [localSrc, username]);

  return (
    <img
      src={src}
      alt={username}
      className={`race-avatar ${src === fallbackSrc ? "fallback-logo-avatar" : ""}`}
      onError={() => setSrc(fallbackSrc)}
    />
  );
}

function buildCreatorProgress(rows: CreatorStat[], track: TrackConfig, username: string): CreatorProgress {
  const key = usernameKey(username);
  const creatorRows = rows.filter((row) => usernameKey(getUsername(row)) === key);
  const emptyStats: Record<TrackRequirement["key"], number> = {
    diamonds: 0,
    liveHours: 0,
    validDays: 0,
    matches: 0,
    followers: 0,
    newFans: 0,
  };
  const statValues = creatorRows.reduce<Record<TrackRequirement["key"], number>>(
    (stats, row) => {
      const liveHours = getDurationHours(row, ["live_duration_hours", "live_hours", "LIVE duration", "live_duration"]);
      stats.diamonds += getNumber(row, ["diamonds", "Diamonds"]);
      stats.liveHours += liveHours;
      stats.validDays += getNumber(row, ["valid_go_live_days", "valid_days", "valid_live_days", "Valid go LIVE days"]) || (liveHours >= 1 ? 1 : 0);
      stats.matches += getNumber(row, ["matches", "Matches"]);
      stats.followers += getNumber(row, ["new_followers", "New followers", "followers"]);
      stats.newFans += getNumber(row, ["new_fans", "New fans", "fans"]);
      return stats;
    },
    emptyStats
  );

  const completed = track.requirements.filter((requirement) => statValues[requirement.key] >= requirement.target).length;
  const progress =
    track.requirements.reduce((sum, requirement) => {
      const target = Math.max(requirement.target, 1);
      return sum + Math.min(statValues[requirement.key] / target, 1);
    }, 0) / track.requirements.length;

  return {
    username,
    track,
    stats: statValues,
    completed,
    progress,
  };
}

export default function RaceToAtlantisPage() {
  const [activeTrackId, setActiveTrackId] = useState<TrackId>("bronze");
  const [rows, setRows] = useState<CreatorStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedInUsername, setLoggedInUsername] = useState("");

  useEffect(() => {
    async function loadRows() {
      setLoading(true);
      const allRows: CreatorStat[] = [];
      const pageSize = 1000;
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await submissionsSupabase
          .from("creator_monthly_stats")
          .select("*")
          .eq("month_key", RACE_MONTH_KEY)
          .order("stats_date", { ascending: false })
          .range(from, from + pageSize - 1);

        if (error) {
          console.error(error);
          setRows([]);
          setLoading(false);
          return;
        }

        const batch = (data || []) as CreatorStat[];
        allRows.push(...batch);
        hasMore = batch.length === pageSize;
        from += pageSize;
      }

      setRows(allRows);
      setLoading(false);
    }

    loadRows();
  }, []);

  useEffect(() => {
    let cancelled = false;
    window.setTimeout(() => {
      if (!cancelled) setLoggedInUsername(usernameKey(decodeURIComponent(getCookieValue("aqua_user"))));
    }, 0);

    return () => {
      cancelled = true;
    };
  }, []);

  const activeTrack = TRACKS.find((track) => track.id === activeTrackId) || TRACKS[0];
  const newBronzeCreators = useMemo(() => {
    return uniqueCreatorList(rows.map(getUsername).filter((username) => !PRIZE_TRACK_CREATOR_KEYS.has(usernameKey(username))));
  }, [rows]);

  const trackLeaderboards = useMemo(() => {
    return TRACKS.map((track) => ({
      track,
      creators: uniqueCreatorList([
        ...track.creators,
        ...(track.id === "bronze" || track.id === "pro" ? newBronzeCreators : []),
      ])
        .map((username) => buildCreatorProgress(rows, track, username))
        .sort((a, b) => b.progress - a.progress),
    }));
  }, [newBronzeCreators, rows]);

  const leaderboard = useMemo(() => {
    return trackLeaderboards.find((trackData) => trackData.track.id === activeTrack.id)?.creators || [];
  }, [activeTrack.id, trackLeaderboards]);

  const leader = leaderboard[0];
  const winners = leaderboard.filter((creator) => creator.completed === activeTrack.requirements.length);
  const assignedEntry = loggedInUsername
    ? trackLeaderboards.reduce<{
        track: TrackConfig;
        creator: CreatorProgress;
        position: number;
      } | null>((match, trackData) => {
        if (match) return match;
        const creatorIndex = trackData.creators.findIndex((creator) => usernameKey(creator.username) === loggedInUsername);
        if (creatorIndex < 0) return null;
        return {
          track: trackData.track,
          creator: trackData.creators[creatorIndex],
          position: creatorIndex + 1,
        };
      }, null)
    : null;
  const personalTrack = assignedEntry?.track || activeTrack;
  const personalName = assignedEntry?.creator.username || loggedInUsername || "Aqua Creator";

  return (
    <main className="race-page">
      <section className="race-hero">
        <div className="race-logo-mark">Race to Atlantis</div>
        <p className="race-kicker">Aqua Agency July Challenge</p>
        <p className="race-copy">Race to the top. First to achieve all targets wins.</p>
      </section>

      <section className="personal-track-section">
        <div
          className={`personal-card ${assignedEntry ? "" : "not-competing"}`}
          style={{ "--track": personalTrack.tone, "--track-glow": personalTrack.glow } as React.CSSProperties}
        >
          <div className="personal-left">
            <CreatorAvatar username={personalName} />
            <div>
              <p className="race-kicker">Your Track</p>
              <h2>{personalName}</h2>
              <span>{assignedEntry ? assignedEntry.track.name : "Not competing"}</span>
            </div>
          </div>
          <div className="personal-stats">
            <div>
              <span>Track Position</span>
              <strong>{assignedEntry ? `#${assignedEntry.position}` : "N/A"}</strong>
            </div>
            <div>
              <span>Progress</span>
              <strong>{assignedEntry ? `${Math.round(assignedEntry.creator.progress * 100)}%` : "0%"}</strong>
            </div>
            <div>
              <span>Targets Hit</span>
              <strong>
                {assignedEntry ? `${assignedEntry.creator.completed}/${assignedEntry.track.requirements.length}` : "0/0"}
              </strong>
            </div>
          </div>
        </div>
      </section>

      <section className="track-tabs" aria-label="Race tracks">
        {TRACKS.map((track) => (
          <button
            key={track.id}
            type="button"
            onClick={() => setActiveTrackId(track.id)}
            className={`track-tab ${track.prize ? "" : "no-prize"} ${activeTrackId === track.id ? "active" : ""}`}
            style={{ "--track": track.tone, "--track-glow": track.glow } as React.CSSProperties}
          >
            <span>{track.shortName}</span>
            {track.prize ? (
              <>
                <strong className="coin-prize">
                  <i aria-hidden="true" />
                  {track.prize}
                </strong>
                <small>View track</small>
              </>
            ) : (
              <small>View track</small>
            )}
          </button>
        ))}
      </section>

      <section className="track-shell" style={{ "--track": activeTrack.tone, "--track-glow": activeTrack.glow } as React.CSSProperties}>
        <div className="track-header">
          <div>
            <p className="race-kicker">{activeTrack.name}</p>
            <h2 className="track-title">{activeTrack.shortName} Leaderboard</h2>
          </div>
          {activeTrack.prize ? (
            <div className="prize-pill">
              <span>Prize</span>
              <strong className="coin-prize">
                <i aria-hidden="true" />
                {activeTrack.prize}
              </strong>
            </div>
          ) : null}
        </div>

        <div className="requirement-strip">
          {activeTrack.requirements.map((requirement, index) => (
            <div
              key={requirement.key}
              className="requirement-chip"
              style={{ "--delay": `${index * 55}ms` } as React.CSSProperties}
            >
              <span>{requirement.label}</span>
              <strong>{formatRequirementValue(requirement.target, requirement)}</strong>
              <small>target</small>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="empty-state">Loading July race data...</div>
        ) : leaderboard.length ? (
          <>
            {winners.length ? (
              <div className="winner-callout">
                <div>
                  <span>Winner of this track</span>
                  <strong>{winners.map((winner) => winner.username).join(", ")}</strong>
                </div>
                <small>All targets achieved</small>
              </div>
            ) : null}

            <div className="race-list">
              {leaderboard.map((creator, index) => {
                const creatorTrack = activeTrack.id === "pro" ? getAssignedTrack(creator.username) : activeTrack;
                const isYourLeaderboardCard =
                  assignedEntry &&
                  activeTrack.id === assignedEntry.track.id &&
                  usernameKey(creator.username) === usernameKey(assignedEntry.creator.username);

                return (
                  <article
                    key={`${activeTrack.id}-${creator.username}`}
                    className={`race-row ${isYourLeaderboardCard ? "leaderboard-personal-card" : ""}`}
                    style={
                      {
                        "--creator-track": creatorTrack.tone,
                        "--creator-track-glow": creatorTrack.glow,
                      } as React.CSSProperties
                    }
                  >
                    <div className="rank-box">#{index + 1}</div>
                    <CreatorAvatar username={creator.username} />
                    <div className="creator-main">
                      <div className="creator-title-row">
                        <h3>{creator.username}</h3>
                        <div className="creator-title-meta">
                          {isYourLeaderboardCard ? <span className="your-track-badge">Your Track</span> : null}
                          <span>{Math.round(creator.progress * 100)}% complete</span>
                        </div>
                      </div>
                      <div className="progress-rail">
                        <div className="progress-fill" style={{ width: `${Math.round(creator.progress * 100)}%` }} />
                      </div>
                      <div className="mini-stats">
                        {activeTrack.requirements.map((requirement) => {
                          const done = creator.stats[requirement.key] >= requirement.target;
                          const statProgress = Math.min(creator.stats[requirement.key] / Math.max(requirement.target, 1), 1);
                          return (
                            <div
                              key={requirement.key}
                              className={done ? "mini-stat done" : "mini-stat"}
                              style={{ "--stat-progress": `${Math.round(statProgress * 100)}%` } as React.CSSProperties}
                            >
                              <span className="stat-ring">{Math.round(statProgress * 100)}%</span>
                              <span className="stat-copy">
                                <em>{requirement.label}</em>
                                <strong>{formatRequirementValue(creator.stats[requirement.key], requirement)}</strong>
                                <small>Target {formatRequirementValue(requirement.target, requirement)}</small>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="finish-box">
                      <strong>
                        {creator.completed}/{activeTrack.requirements.length}
                      </strong>
                      <span>targets</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        ) : (
          <div className="empty-state">No creators assigned to this track yet.</div>
        )}

        {leader ? (
          <div className="leader-callout">
            Current closest racer: <strong>{leader.username}</strong> at <strong>{Math.round(leader.progress * 100)}%</strong>.
          </div>
        ) : null}
      </section>

      <style jsx>{`
        .race-page {
          min-height: 100vh;
          padding: 34px 16px 120px;
          color: #effcff;
          background:
            radial-gradient(circle at 50% -10%, rgba(56, 243, 255, 0.24), transparent 34%),
            linear-gradient(180deg, #031424 0%, #06101d 42%, #01040a 100%);
          font-family: "Orbitron", "Rajdhani", system-ui, sans-serif;
        }

        .race-hero,
        .personal-track-section,
        .track-tabs,
        .track-shell {
          width: min(1120px, 100%);
          margin-inline: auto;
        }

        .race-hero {
          padding: 42px 0 24px;
          text-align: center;
        }

        .race-logo-mark {
          display: inline-flex;
          position: relative;
          align-items: center;
          justify-content: center;
          min-height: 112px;
          padding: 18px 26px;
          border: 2px solid rgba(84, 232, 255, 0.45);
          border-radius: 24px;
          color: #ffffff;
          font-size: clamp(30px, 8vw, 74px);
          font-weight: 950;
          line-height: 0.96;
          text-transform: uppercase;
          text-shadow: 0 0 18px rgba(84, 232, 255, 0.86), 0 0 46px rgba(84, 232, 255, 0.35);
          box-shadow: inset 0 0 38px rgba(84, 232, 255, 0.08), 0 0 38px rgba(84, 232, 255, 0.16);
          overflow: hidden;
          animation: brandFloat 4.8s ease-in-out infinite;
        }

        .race-logo-mark::after {
          content: "";
          position: absolute;
          inset: -40% auto -40% -40%;
          width: 34%;
          transform: rotate(18deg);
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.72), transparent);
          opacity: 0.7;
          animation: brandShine 4.2s ease-in-out infinite;
        }

        .race-kicker {
          margin: 18px 0 8px;
          color: #54e8ff;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        h1 {
          margin: 0;
          font-size: clamp(36px, 8vw, 88px);
          line-height: 0.95;
          text-transform: uppercase;
        }

        .race-copy {
          max-width: 690px;
          margin: 14px auto 0;
          color: rgba(239, 252, 255, 0.72);
          font-family: system-ui, sans-serif;
          font-size: 15px;
          line-height: 1.6;
        }

        .track-tabs {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 18px;
        }

        .personal-track-section {
          margin-bottom: 18px;
        }

        .track-tab {
          display: flex;
          position: relative;
          flex-direction: column;
          justify-content: center;
          min-height: 112px;
          padding: 14px 12px 28px;
          border: 2px solid color-mix(in srgb, var(--track) 74%, transparent);
          border-radius: 18px;
          background:
            linear-gradient(145deg, var(--track-glow), rgba(255, 255, 255, 0.035)),
            rgba(255, 255, 255, 0.045);
          color: #effcff;
          cursor: pointer;
          font: inherit;
          text-transform: uppercase;
          box-shadow:
            inset 0 0 20px rgba(255, 255, 255, 0.04),
            0 0 18px rgba(0, 0, 0, 0.24);
          transition:
            transform 160ms ease,
            border-color 160ms ease,
            box-shadow 160ms ease,
            background 160ms ease;
        }

        .track-tab:hover {
          transform: translateY(-3px);
          box-shadow:
            inset 0 0 22px rgba(255, 255, 255, 0.06),
            0 0 28px var(--track-glow);
        }

        .track-tab.active {
          background:
            linear-gradient(135deg, color-mix(in srgb, var(--track) 32%, transparent), rgba(255, 255, 255, 0.08)),
            rgba(255, 255, 255, 0.055);
          box-shadow:
            0 0 30px var(--track-glow),
            inset 0 0 24px rgba(255, 255, 255, 0.08);
          animation: activeTrackPulse 2.8s ease-in-out infinite;
        }

        .track-tab span,
        .track-tab strong,
        .track-tab small {
          display: block;
        }

        .track-tab span {
          color: var(--track);
          font-size: clamp(18px, 2.6vw, 30px);
          font-weight: 950;
          line-height: 1;
          text-shadow:
            0 0 10px var(--track-glow),
            0 0 22px var(--track-glow);
        }

        .track-tab strong {
          display: inline-flex;
          justify-content: center;
          align-items: center;
          gap: 7px;
          margin-top: 6px;
          color: #ffd84d;
          font-size: 24px;
          text-shadow:
            0 0 10px rgba(255, 216, 77, 0.42),
            0 0 22px rgba(255, 185, 48, 0.18);
        }

        .track-tab small {
          position: absolute;
          right: 0;
          bottom: 0;
          left: 0;
          width: 100%;
          min-height: 18%;
          display: grid;
          place-items: center;
          margin: 0;
          padding: 6px 8px;
          border-top: 1px solid color-mix(in srgb, var(--track) 62%, transparent);
          border-radius: 0 0 15px 15px;
          color: #ffffff;
          font-family: system-ui, sans-serif;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.08em;
          background: rgba(0, 0, 0, 0.34);
        }

        .track-tab.no-prize {
          justify-content: center;
          padding: 14px 12px 28px;
        }

        .track-tab.no-prize span {
          font-size: clamp(24px, 3.5vw, 42px);
          line-height: 1.05;
          text-align: center;
        }

        .track-shell {
          border: 1px solid color-mix(in srgb, var(--track) 54%, transparent);
          border-radius: 24px;
          padding: 20px;
          background:
            linear-gradient(135deg, var(--track-glow), transparent 32%),
            rgba(2, 8, 18, 0.78);
          box-shadow: 0 0 34px rgba(0, 0, 0, 0.34);
        }

        .track-shell .race-kicker {
          color: var(--track);
          text-shadow: 0 0 12px var(--track-glow);
        }

        .personal-card {
          position: relative;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 16px;
          align-items: center;
          margin-bottom: 18px;
          padding: 16px;
          border: 1px solid color-mix(in srgb, var(--track) 62%, transparent);
          border-radius: 20px;
          background:
            radial-gradient(circle at 0% 0%, var(--track-glow), transparent 32%),
            rgba(1, 6, 14, 0.76);
          box-shadow:
            inset 0 0 24px rgba(255, 255, 255, 0.04),
            0 0 24px var(--track-glow);
          overflow: hidden;
        }

        .personal-card.not-competing {
          border-color: rgba(84, 232, 255, 0.32);
          box-shadow:
            inset 0 0 24px rgba(255, 255, 255, 0.03),
            0 0 18px rgba(84, 232, 255, 0.12);
        }

        .personal-card::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(110deg, transparent 0%, rgba(255, 255, 255, 0.08) 42%, transparent 58%);
          transform: translateX(-100%);
          animation: panelSweep 5.5s ease-in-out infinite;
          pointer-events: none;
        }

        .personal-left {
          position: relative;
          z-index: 1;
          display: flex;
          min-width: 0;
          align-items: center;
          gap: 14px;
        }

        .personal-left :global(.race-avatar) {
          width: 78px;
          height: 78px;
        }

        .personal-left h2 {
          color: #ffffff;
          text-shadow: 0 0 14px var(--track-glow);
        }

        .personal-left span {
          display: inline-flex;
          margin-top: 7px;
          padding: 6px 10px;
          border: 1px solid color-mix(in srgb, var(--track) 64%, transparent);
          border-radius: 999px;
          color: var(--track);
          font-size: 12px;
          font-weight: 950;
          text-transform: uppercase;
          background: rgba(0, 0, 0, 0.24);
        }

        .personal-stats {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: repeat(3, minmax(96px, 1fr));
          gap: 10px;
        }

        .personal-stats div {
          min-height: 72px;
          padding: 11px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          text-align: center;
          background: rgba(0, 0, 0, 0.24);
        }

        .personal-stats span {
          display: block;
          color: rgba(239, 252, 255, 0.6);
          font-family: system-ui, sans-serif;
          font-size: 11px;
          font-weight: 800;
        }

        .personal-stats strong {
          display: block;
          margin-top: 6px;
          color: var(--track);
          font-size: 26px;
          font-weight: 950;
          text-shadow: 0 0 14px var(--track-glow);
        }

        .track-header {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: center;
        }

        h2 {
          margin: 0;
          font-size: clamp(24px, 5vw, 44px);
          text-transform: uppercase;
        }

        .track-title {
          color: var(--track);
          font-size: clamp(34px, 6vw, 64px);
          font-weight: 950;
          line-height: 0.96;
          text-shadow:
            0 0 12px var(--track-glow),
            0 0 30px var(--track-glow),
            0 0 54px color-mix(in srgb, var(--track) 34%, transparent);
        }

        .prize-pill {
          min-width: 118px;
          padding: 12px 16px;
          border: 1px solid color-mix(in srgb, var(--track) 60%, transparent);
          border-radius: 16px;
          text-align: center;
          background: rgba(0, 0, 0, 0.24);
        }

        .prize-pill span {
          display: block;
          color: rgba(239, 252, 255, 0.6);
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .prize-pill strong {
          display: inline-flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          color: #ffd84d;
          font-size: 30px;
          text-shadow:
            0 0 12px rgba(255, 216, 77, 0.48),
            0 0 26px rgba(255, 185, 48, 0.24);
        }

        .coin-prize i {
          display: inline-block;
          width: 18px;
          height: 18px;
          border: 2px solid #fff1a8;
          border-radius: 50%;
          background:
            radial-gradient(circle at 32% 28%, #fff7bd 0 18%, transparent 20%),
            linear-gradient(145deg, #ffe66d, #f8a91f 56%, #9f5d09);
          box-shadow:
            inset 0 0 0 2px rgba(121, 72, 7, 0.2),
            0 0 12px rgba(255, 216, 77, 0.54);
        }

        .requirement-strip {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 8px;
          margin: 18px 0;
        }

        .requirement-chip {
          position: relative;
          min-height: 94px;
          border: 1px solid color-mix(in srgb, var(--track) 56%, rgba(255, 255, 255, 0.08));
          border-radius: 16px;
          padding: 13px 11px;
          background:
            radial-gradient(circle at 10% 0%, var(--track-glow), transparent 54%),
            linear-gradient(145deg, rgba(255, 255, 255, 0.07), rgba(0, 0, 0, 0.22));
          box-shadow:
            inset 0 0 18px rgba(255, 255, 255, 0.045),
            0 0 18px rgba(0, 0, 0, 0.22);
          overflow: hidden;
          animation: statSlideIn 460ms ease both;
          animation-delay: var(--delay);
        }

        .requirement-chip::before {
          content: "";
          position: absolute;
          inset: auto 12px 9px 12px;
          height: 3px;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent, var(--track), transparent);
          box-shadow: 0 0 14px var(--track-glow);
        }

        .requirement-chip span,
        .stat-copy em,
        .finish-box span {
          display: block;
          color: rgba(239, 252, 255, 0.58);
          font-family: system-ui, sans-serif;
          font-size: 11px;
          font-weight: 800;
        }

        .requirement-chip span {
          position: relative;
          z-index: 1;
          text-transform: uppercase;
        }

        .requirement-chip strong {
          display: block;
          position: relative;
          z-index: 1;
          margin-top: 7px;
          color: var(--track);
          font-size: clamp(20px, 2.2vw, 28px);
          font-weight: 950;
          line-height: 1;
          text-shadow:
            0 0 12px var(--track-glow),
            0 0 26px var(--track-glow);
        }

        .requirement-chip small {
          display: block;
          position: relative;
          z-index: 1;
          margin-top: 6px;
          color: rgba(255, 255, 255, 0.78);
          font-family: system-ui, sans-serif;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .race-list {
          display: grid;
          gap: 10px;
        }

        .winner-callout {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: center;
          margin-bottom: 14px;
          padding: 16px;
          border: 1px solid rgba(255, 216, 77, 0.74);
          border-radius: 18px;
          background:
            radial-gradient(circle at 0% 0%, rgba(255, 216, 77, 0.28), transparent 38%),
            linear-gradient(135deg, rgba(250, 204, 21, 0.12), rgba(0, 0, 0, 0.3));
          box-shadow:
            inset 0 0 22px rgba(255, 255, 255, 0.04),
            0 0 26px rgba(255, 216, 77, 0.2);
        }

        .winner-callout span,
        .winner-callout small {
          display: block;
          color: rgba(255, 246, 198, 0.72);
          font-family: system-ui, sans-serif;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .winner-callout strong {
          display: block;
          margin-top: 5px;
          color: #ffd84d;
          font-size: clamp(22px, 4vw, 38px);
          font-weight: 950;
          line-height: 1.05;
          text-shadow:
            0 0 12px rgba(255, 216, 77, 0.44),
            0 0 28px rgba(255, 185, 48, 0.24);
        }

        .race-row {
          position: relative;
          display: grid;
          grid-template-columns: 54px 58px minmax(0, 1fr) 86px;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 18px;
          background: rgba(1, 6, 14, 0.72);
        }

        .race-row.leaderboard-personal-card {
          border-color: color-mix(in srgb, var(--creator-track, var(--track)) 68%, transparent);
          background:
            radial-gradient(circle at 0% 0%, var(--creator-track-glow, var(--track-glow)), transparent 34%),
            rgba(1, 6, 14, 0.82);
          box-shadow:
            inset 0 0 24px rgba(255, 255, 255, 0.04),
            0 0 24px var(--creator-track-glow, var(--track-glow));
        }

        .rank-box,
        .finish-box {
          text-align: center;
          font-weight: 950;
        }

        .rank-box {
          color: var(--creator-track, var(--track));
          font-size: 18px;
          text-shadow: 0 0 12px var(--creator-track-glow, var(--track-glow));
        }

        :global(.race-avatar) {
          width: 58px;
          height: 58px;
          box-sizing: border-box;
          border: 5px solid var(--creator-track, var(--track));
          border-radius: 999px;
          object-fit: cover;
          background: #06101d;
          box-shadow: none;
        }

        :global(.race-avatar.fallback-logo-avatar) {
          object-fit: contain;
          padding: 8px;
          background:
            radial-gradient(circle at 50% 48%, rgba(56, 243, 255, 0.18), transparent 56%),
            #06101d;
        }

        .creator-title-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
        }

        .creator-title-meta {
          display: inline-flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 7px;
          align-items: center;
        }

        h3 {
          margin: 0;
          color: #ffffff;
          font-size: clamp(19px, 2.4vw, 28px);
          font-weight: 950;
          line-height: 1.05;
          text-shadow:
            0 0 10px var(--creator-track-glow, var(--track-glow)),
            0 0 22px rgba(84, 232, 255, 0.18);
          overflow-wrap: anywhere;
        }

        .creator-title-row span {
          color: var(--creator-track, var(--track));
          font-size: 13px;
          font-weight: 950;
        }

        .your-track-badge {
          padding: 5px 9px;
          border: 1px solid color-mix(in srgb, var(--creator-track, var(--track)) 72%, transparent);
          border-radius: 999px;
          color: #ffffff !important;
          font-family: system-ui, sans-serif;
          font-size: 10px !important;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          background: color-mix(in srgb, var(--creator-track, var(--track)) 22%, rgba(0, 0, 0, 0.45));
          box-shadow: 0 0 13px var(--creator-track-glow, var(--track-glow));
        }

        .progress-rail {
          height: 9px;
          margin: 8px 0 10px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.1);
        }

        .progress-fill {
          position: relative;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, var(--track), #ffffff);
          overflow: hidden;
        }

        .progress-fill::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.78), transparent);
          transform: translateX(-110%);
          animation: progressShine 2.8s ease-in-out infinite;
        }

        .mini-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .mini-stat {
          display: flex;
          min-height: 72px;
          min-width: 0;
          align-items: center;
          gap: 9px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 9px;
          background:
            linear-gradient(145deg, rgba(255, 255, 255, 0.06), rgba(0, 0, 0, 0.22)),
            rgba(255, 255, 255, 0.035);
          box-shadow: inset 0 0 16px rgba(255, 255, 255, 0.03);
        }

        .mini-stat.done {
          border-color: color-mix(in srgb, var(--track) 70%, transparent);
          background:
            radial-gradient(circle at 0% 0%, var(--track-glow), transparent 58%),
            rgba(255, 255, 255, 0.05);
          box-shadow:
            inset 0 0 16px rgba(255, 255, 255, 0.04),
            0 0 16px var(--track-glow);
        }

        .stat-ring {
          display: grid;
          flex: 0 0 48px;
          width: 48px;
          height: 48px;
          place-items: center;
          border: 2px solid color-mix(in srgb, var(--track) 78%, transparent);
          border-radius: 50%;
          color: var(--track);
          font-size: 12px;
          font-weight: 950;
          background:
            radial-gradient(circle, rgba(0, 0, 0, 0.75) 50%, transparent 52%),
            conic-gradient(var(--track) var(--stat-progress), rgba(255, 255, 255, 0.12) 0);
          box-shadow:
            inset 0 0 12px rgba(0, 0, 0, 0.5),
            0 0 14px var(--track-glow);
          text-shadow: 0 0 10px var(--track-glow);
        }

        .stat-copy {
          min-width: 0;
        }

        .stat-copy em {
          overflow: hidden;
          font-style: normal;
          text-overflow: ellipsis;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .stat-copy strong {
          display: block;
          margin-top: 4px;
          color: #ffffff;
          overflow-wrap: anywhere;
          font-family: system-ui, sans-serif;
          font-size: 15px;
          font-weight: 950;
          line-height: 1.1;
        }

        .stat-copy small {
          display: block;
          margin-top: 4px;
          color: var(--track);
          font-family: system-ui, sans-serif;
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          text-shadow: 0 0 10px var(--track-glow);
        }

        .finish-box strong {
          display: block;
          color: var(--track);
          font-size: 24px;
        }

        .empty-state,
        .leader-callout {
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 18px;
          background: rgba(0, 0, 0, 0.22);
          color: rgba(239, 252, 255, 0.72);
          font-family: system-ui, sans-serif;
        }

        .leader-callout {
          margin-top: 14px;
        }

        .leader-callout strong {
          color: var(--track);
        }

        @keyframes brandFloat {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }

        @keyframes brandShine {
          0%,
          35% {
            transform: translateX(0) rotate(18deg);
          }
          70%,
          100% {
            transform: translateX(460%) rotate(18deg);
          }
        }

        @keyframes activeTrackPulse {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-2px);
          }
        }

        @keyframes panelSweep {
          0%,
          45% {
            transform: translateX(-100%);
          }
          75%,
          100% {
            transform: translateX(100%);
          }
        }

        @keyframes progressShine {
          0% {
            transform: translateX(-110%);
          }
          58%,
          100% {
            transform: translateX(110%);
          }
        }

        @keyframes statSlideIn {
          from {
            opacity: 0;
            transform: translateX(-18px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @media (max-width: 840px) {
          .track-tabs,
          .requirement-strip {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .personal-card {
            grid-template-columns: 1fr;
          }

          .personal-stats {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .race-row {
            grid-template-columns: 46px 52px minmax(0, 1fr);
          }

          .finish-box {
            grid-column: 1 / -1;
            display: flex;
            justify-content: center;
            gap: 6px;
            align-items: baseline;
          }

          .mini-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 560px) {
          .track-tabs,
          .requirement-strip,
          .mini-stats,
          .personal-stats {
            grid-template-columns: 1fr;
          }

          .track-header {
            align-items: stretch;
            flex-direction: column;
          }

          .prize-pill {
            width: 100%;
          }

          .winner-callout {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>
    </main>
  );
}
