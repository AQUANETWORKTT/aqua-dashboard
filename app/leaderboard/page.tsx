"use client";

import { useEffect, useState } from "react";
import { submissionsSupabase } from "@/lib/submissions-supabase";

type CreatorMonthlyStat = {
  id: string;
  creator_id: string;
  username: string | null;
  diamonds: number | null;
  live_duration_hours: number | null;
  matches: number | null;
  month_key: string;
};

function cleanUsername(username: string | null | undefined) {
  return String(username || "").replace("@", "").trim();
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

const HIDDEN_LEADERBOARD_USERNAMES = new Set(["arabellama_y"]);

function currentMonthKey() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

async function fetchTikTokAvatar(username: string) {
  if (!username) return "";

  try {
    const res = await fetch("/api/tiktok-avatar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
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

    async function loadAvatar() {
      const localImg = new window.Image();
      localImg.src = localSrc;

      localImg.onload = () => {
        if (!cancelled) setSrc(localSrc);
      };

      localImg.onerror = async () => {
        const scrapedAvatar = await fetchTikTokAvatar(username);

        if (!cancelled) {
          setSrc(scrapedAvatar || fallbackSrc);
        }
      };
    }

    loadAvatar();

    return () => {
      cancelled = true;
    };
  }, [username, localSrc]);

  return <img src={src} alt={username} className="avatar" />;
}

function CreatorBadges({ usernameKey }: { usernameKey: string }) {
  return (
    <div className="badgeWrap">
      {usernameKey === "alfie.harnett" && <span className="badge yellow animatedBadge">Aqua Ascension Winner</span>}
      {usernameKey === "dylanjinks" && <span className="badge blue animatedBadge">2x Box Battle Winner</span>}
      {usernameKey === "mavismim" && <span className="badge purple animatedBadge">February Finale Winner</span>}
      {usernameKey === "xomarky" && (
        <>
          <span className="badge cyan animatedBadge">Deep Dive Winner</span>
          <span className="badge green animatedBadge">Aqua Trials Winner</span>
          <span className="badge pink animatedBadge">Box Battle Winner</span>
        </>
      )}
      {usernameKey === "lucylou449" && (
        <>
          <span className="badge pink animatedBadge">Box Battle Winner</span>
          <span className="badge roseGold animatedBadge">Affluent April Tournament Winner</span>
        </>
      )}
      {usernameKey === "elliex035" && (
        <>
          <span className="badge pink animatedBadge">Beat The Boss Champion</span>
          <span className="badge blue animatedBadge">World Cup Campaign Winner - Team England</span>
        </>
      )}
      {usernameKey === "libbyamberxoxo" && <span className="badge blue animatedBadge">World Cup Campaign Winner - Team England</span>}
      {usernameKey === "adam_gym234" && <span className="badge blue animatedBadge">World Cup Campaign Winner - Team England</span>}
      {usernameKey === "j.wliveacc" && <span className="badge blue animatedBadge">World Cup Campaign Winner - Team England</span>}
      {usernameKey === "callum.072" && <span className="badge cyan animatedBadge">May Aqua Hours Winner</span>}
      {usernameKey === "corie.watkins" && <span className="badge sunset animatedBadge">Sunset Showdown Champion</span>}
    </div>
  );
}

function MetricSet({ creator, podium = false }: { creator: CreatorMonthlyStat; podium?: boolean }) {
  return (
    <div className={podium ? "podiumMetrics" : "metrics"}>
      <div className={podium ? "" : "metricBox primaryMetric"}>
        <strong className="metricValue">{Number(creator.diamonds || 0).toLocaleString()}</strong>
        <span className="metricLabel">Monthly</span>
      </div>
      <div className={podium ? "" : "metricBox"}>
        <strong className="metricValue small">{Number(creator.live_duration_hours || 0).toFixed(1)}h</strong>
        <span className="metricLabel">Hours</span>
      </div>
      <div className={podium ? "" : "metricBox"}>
        <strong className="metricValue small">{Number(creator.matches || 0).toLocaleString()}</strong>
        <span className="metricLabel">Matches</span>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const [creators, setCreators] = useState<CreatorMonthlyStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCreators() {
      setLoading(true);

      const { data: latestUpload } = await submissionsSupabase
        .from("creator_monthly_stats")
        .select("stats_date")
        .not("stats_date", "is", null)
        .order("stats_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      const query = submissionsSupabase
        .from("creator_monthly_stats")
        .select("*")
        .order("diamonds", { ascending: false });

      const { data } = latestUpload?.stats_date
        ? await query.eq("stats_date", latestUpload.stats_date)
        : await query.eq("month_key", currentMonthKey());

      setCreators(
        ((data || []) as CreatorMonthlyStat[]).filter((creator) => {
          const username = normalizeUsername(cleanUsername(creator.username));
          return !HIDDEN_LEADERBOARD_USERNAMES.has(username);
        })
      );
      setLoading(false);
    }

    loadCreators();
  }, []);

  const podiumCreators = [creators[1], creators[0], creators[2]].filter(Boolean) as CreatorMonthlyStat[];
  const remainingCreators = creators.slice(3);

  return (
    <main className="page">
      <section className="hero">
        <div className="kicker">AQUA CREATOR NETWORK</div>
        <h1 className="title">CREATOR LEADERBOARD</h1>
      </section>

      {loading ? (
        <div className="loading">Loading leaderboard...</div>
      ) : (
        <>
          <section className="podium" aria-label="Top three creators">
            {podiumCreators.map((creator) => {
              const realIndex = creators.findIndex((item) => item.creator_id === creator.creator_id);
              const rank = realIndex + 1;
              const username = cleanUsername(creator.username);
              const usernameKey = normalizeUsername(username);
              const tone = rank === 1 ? "gold" : rank === 2 ? "silver" : "bronze";

              return (
                <article key={creator.creator_id} className={`podiumCard ${tone}Podium rank${rank}`} data-rank={rank}>
                  <div className="podiumRank" aria-label={`Rank ${rank}`}>{rank}</div>
                  <div className="podiumAvatar">
                    <CreatorAvatar username={username} />
                  </div>
                  <div className="podiumName">{username}</div>
                  <CreatorBadges usernameKey={usernameKey} />
                  <MetricSet creator={creator} podium />
                </article>
              );
            })}
          </section>

          <section className="list">
            {remainingCreators.map((creator, index) => {
              const rank = index + 4;
              const username = cleanUsername(creator.username);
              const usernameKey = normalizeUsername(username);

              return (
                <article key={creator.creator_id} className="row">
                  <div className="avatarFade">
                    <CreatorAvatar username={username} />
                  </div>
                  <div className="rankPlate" aria-label={`Rank ${rank}`}>
                    <span>{rank}</span>
                  </div>
                  <div className="info">
                    <div className="username">{username}</div>
                    <CreatorBadges usernameKey={usernameKey} />
                  </div>
                  <MetricSet creator={creator} />
                </article>
              );
            })}
          </section>
        </>
      )}

      <style jsx>{`
        .page {
          position: relative;
          isolation: isolate;
          min-height: 100vh;
          padding: 24px 12px 72px;
          background: #01040a;
          color: white;
          font-family: Arial, sans-serif;
          overflow: hidden;
        }

        .page::before {
          content: "";
          position: fixed;
          inset: -18px;
          z-index: -2;
          background: url("/race-to-atlantis/background.png") center top / cover no-repeat;
          filter: blur(3px) saturate(1.08) brightness(0.76);
          transform: scale(1.015);
        }

        .page::after {
          content: "";
          position: fixed;
          inset: 0;
          z-index: -1;
          background:
            radial-gradient(circle at 50% 0%, rgba(56, 243, 255, 0.24), transparent 32%),
            linear-gradient(180deg, rgba(1, 10, 22, 0.36) 0%, rgba(1, 4, 10, 0.78) 48%, rgba(1, 4, 10, 0.92) 100%);
          pointer-events: none;
        }

        .hero {
          text-align: center;
          margin-bottom: 20px;
        }

        .kicker {
          font-size: 11px;
          color: #2de0ff;
          font-weight: 800;
          letter-spacing: 0.2em;
          margin-bottom: 10px;
        }

        .title {
          margin: 0;
          font-size: clamp(28px, 8vw, 64px);
          line-height: 1;
          font-weight: 900;
          text-shadow: 0 0 18px rgba(45, 224, 255, 0.55);
        }

        .subtitle,
        .loading {
          margin-top: 12px;
          text-align: center;
          color: rgba(255, 255, 255, 0.68);
          font-size: 14px;
        }

        .podium {
          display: grid;
          grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.12fr) minmax(0, 0.92fr);
          align-items: end;
          gap: 14px;
          max-width: 1120px;
          margin: 0 auto 18px;
        }

        .podiumCard {
          position: relative;
          min-height: 310px;
          display: grid;
          justify-items: center;
          align-content: start;
          gap: 10px;
          padding: 18px 14px 16px;
          border: 1px solid rgba(124, 246, 255, 0.22);
          border-radius: 26px;
          background:
            var(--metal),
            linear-gradient(145deg, rgba(255, 255, 255, 0.07), transparent 38%),
            linear-gradient(180deg, rgba(9, 24, 46, 0.86), rgba(2, 8, 18, 0.9)),
            rgba(8, 18, 35, 0.78);
          overflow: hidden;
          box-shadow:
            inset 0 0 32px rgba(255, 255, 255, 0.045),
            0 18px 34px rgba(0, 0, 0, 0.34);
        }

        .podiumCard::before {
          content: "";
          position: absolute;
          inset: 0;
          opacity: 0.28;
          background: radial-gradient(circle at 50% 0%, var(--podium), transparent 42%);
          pointer-events: none;
        }

        .podiumCard::after {
          content: attr(data-rank);
          position: absolute;
          right: -16px;
          bottom: -42px;
          z-index: 0;
          color: var(--podium);
          font-family: Impact, Haettenschweiler, "Arial Black", sans-serif;
          font-size: clamp(190px, 22vw, 330px);
          font-weight: 950;
          line-height: 0.8;
          opacity: 0.14;
          transform: skewX(-12deg);
          text-shadow: 0 0 26px color-mix(in srgb, var(--podium) 48%, transparent);
          pointer-events: none;
        }

        .rank1 {
          min-height: 362px;
          --podium: rgba(255, 216, 77, 0.72);
          --metal: linear-gradient(145deg, rgba(255, 245, 164, 0.24), rgba(255, 197, 36, 0.14) 38%, rgba(76, 36, 0, 0.2));
        }

        .rank2 {
          min-height: 320px;
          --podium: rgba(226, 232, 240, 0.62);
          --metal: linear-gradient(145deg, rgba(255, 255, 255, 0.24), rgba(199, 213, 228, 0.15) 42%, rgba(31, 41, 55, 0.2));
        }

        .rank3 {
          min-height: 300px;
          --podium: rgba(196, 122, 60, 0.62);
          --metal: linear-gradient(145deg, rgba(255, 186, 105, 0.22), rgba(176, 91, 34, 0.16) 42%, rgba(50, 20, 3, 0.2));
        }

        .goldPodium {
          border-color: rgba(255, 216, 77, 0.68);
          box-shadow:
            inset 0 0 32px rgba(255, 255, 255, 0.045),
            0 0 0 1px rgba(255, 216, 77, 0.12),
            0 18px 38px rgba(0, 0, 0, 0.38);
        }

        .silverPodium {
          border-color: rgba(226, 232, 240, 0.58);
          box-shadow:
            inset 0 0 32px rgba(255, 255, 255, 0.05),
            0 0 0 1px rgba(226, 232, 240, 0.12),
            0 18px 34px rgba(0, 0, 0, 0.34);
        }

        .bronzePodium {
          border-color: rgba(196, 122, 60, 0.58);
          box-shadow:
            inset 0 0 32px rgba(255, 255, 255, 0.045),
            0 0 0 1px rgba(196, 122, 60, 0.13),
            0 18px 34px rgba(0, 0, 0, 0.34);
        }

        .podiumRank {
          position: relative;
          z-index: 1;
          justify-self: start;
          margin-left: 4px;
          color: transparent;
          font-size: clamp(42px, 5vw, 74px);
          font-weight: 950;
          line-height: 0.86;
          font-family: Impact, Haettenschweiler, "Arial Black", sans-serif;
          background: linear-gradient(135deg, #ffffff 0%, color-mix(in srgb, var(--podium) 78%, #ffffff 12%) 28%, color-mix(in srgb, var(--podium) 72%, #4b2500 18%) 58%, #fff0a8 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          -webkit-text-stroke: 1px rgba(0, 0, 0, 0.34);
          transform: skewX(-12deg) rotate(-2deg);
          filter: drop-shadow(0 5px 0 rgba(0, 0, 0, 0.44)) drop-shadow(0 0 12px color-mix(in srgb, var(--podium) 48%, transparent));
        }

        .podiumAvatar {
          position: relative;
          z-index: 1;
        }

        .podiumAvatar :global(.avatar) {
          width: 112px;
          height: 112px;
          border-radius: 28px;
          border: 3px solid color-mix(in srgb, var(--podium) 70%, white 10%);
          box-shadow: 0 14px 30px rgba(0, 0, 0, 0.38);
        }

        .rank1 .podiumAvatar :global(.avatar) {
          width: 134px;
          height: 134px;
        }

        .podiumName,
        .username {
          position: relative;
          z-index: 1;
          color: #ffffff;
          font-weight: 950;
          text-transform: uppercase;
          overflow-wrap: anywhere;
          text-shadow:
            0 2px 0 rgba(0, 0, 0, 0.5),
            0 0 18px rgba(45, 224, 255, 0.38);
        }

        .podiumName {
          font-size: clamp(18px, 2.6vw, 30px);
          text-align: center;
          line-height: 1.02;
        }

        :global(.podiumMetrics) {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          width: 100%;
          margin-top: auto;
        }

        :global(.podiumMetrics div),
        :global(.metricBox) {
          position: relative;
          min-width: 0;
          padding: 10px 11px;
          background: rgba(0, 0, 0, 0.28);
          border: 1px solid rgba(255, 255, 255, 0.08);
          overflow: hidden;
        }

        :global(.podiumMetrics div) {
          border-radius: 14px;
          text-align: center;
        }

        .list {
          display: grid;
          gap: 12px;
          max-width: 1120px;
          margin: 0 auto;
        }

        .row {
          position: relative;
          min-height: 112px;
          display: grid;
          grid-template-columns: 82px minmax(0, 1fr) minmax(330px, auto);
          gap: 14px;
          align-items: center;
          padding: 12px 12px 12px 114px;
          border: 1px solid rgba(45, 224, 255, 0.18);
          border-radius: 22px;
          background:
            linear-gradient(145deg, rgba(255, 255, 255, 0.045), transparent 28%),
            linear-gradient(100deg, rgba(45, 224, 255, 0.12), transparent 42%),
            rgba(8, 18, 35, 0.84);
          overflow: hidden;
          box-shadow:
            inset 0 0 20px rgba(255, 255, 255, 0.026),
            0 12px 26px rgba(0, 0, 0, 0.22);
        }

        .avatarFade {
          position: absolute;
          inset: 0 auto 0 0;
          width: 138px;
          opacity: 0.92;
          mask-image: linear-gradient(90deg, #000 0%, #000 46%, transparent 100%);
          -webkit-mask-image: linear-gradient(90deg, #000 0%, #000 46%, transparent 100%);
        }

        .avatarFade :global(.avatar) {
          width: 138px;
          height: 100%;
          border-radius: 22px 0 0 22px;
          object-fit: cover;
          border: 0;
        }

        .rankPlate {
          position: relative;
          z-index: 1;
          width: 62px;
          height: 62px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          color: #7cf6ff;
          font-size: 18px;
          font-weight: 950;
          background:
            radial-gradient(circle at 34% 28%, rgba(255, 255, 255, 0.34), transparent 18%),
            linear-gradient(145deg, rgba(124, 246, 255, 0.24), rgba(2, 8, 18, 0.84));
          border: 2px solid rgba(124, 246, 255, 0.44);
          box-shadow:
            inset 0 -7px 14px rgba(0, 0, 0, 0.32),
            0 0 18px rgba(124, 246, 255, 0.2);
        }

        .info {
          position: relative;
          z-index: 1;
          min-width: 0;
        }

        .username {
          font-size: clamp(18px, 2.4vw, 26px);
          line-height: 1;
        }

        :global(.badgeWrap) {
          position: relative;
          z-index: 1;
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          justify-content: center;
          margin-top: 8px;
        }

        .row :global(.badgeWrap) {
          justify-content: flex-start;
        }

        :global(.badge) {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 6px 9px;
          border-radius: 9px;
          font-size: 10px;
          font-weight: 900;
          line-height: 1.15;
          border: 1px solid rgba(255, 255, 255, 0.1);
          overflow: hidden;
          transform: skewX(-8deg);
          text-shadow: none;
          white-space: nowrap;
        }

        :global(.animatedBadge) {
          animation: badgeLift 4.6s ease-in-out infinite;
        }

        :global(.animatedBadge)::after {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-120%) skewX(-18deg);
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.34), transparent);
          animation: badgeSweep 5.4s ease-in-out infinite;
        }

        :global(.yellow) {
          color: #ffd76a;
          background: rgba(255, 215, 106, 0.1);
          border-color: rgba(255, 215, 106, 0.38);
        }

        :global(.blue) {
          color: #60a5fa;
          background: rgba(96, 165, 250, 0.1);
          border-color: rgba(96, 165, 250, 0.38);
        }

        :global(.purple) {
          color: #c084fc;
          background: rgba(192, 132, 252, 0.1);
          border-color: rgba(192, 132, 252, 0.38);
        }

        :global(.cyan) {
          color: #7cf6ff;
          background: rgba(124, 246, 255, 0.1);
          border-color: rgba(124, 246, 255, 0.38);
        }

        :global(.green) {
          color: #4ade80;
          background: rgba(74, 222, 128, 0.1);
          border-color: rgba(74, 222, 128, 0.38);
        }

        :global(.pink) {
          color: #fff;
          background: rgba(255, 47, 168, 0.2);
          border-color: rgba(255, 47, 168, 0.48);
        }

        :global(.roseGold) {
          color: #ffd1ea;
          background: rgba(255, 134, 196, 0.14);
          border-color: rgba(255, 134, 196, 0.38);
        }

        :global(.sunset) {
          color: #fff7ed;
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.28), rgba(249, 115, 22, 0.24));
          border-color: rgba(251, 146, 60, 0.62);
        }

        :global(.metrics) {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 1.2fr 0.9fr 0.9fr;
          gap: 0;
          justify-self: end;
          min-width: 330px;
          border-radius: 18px;
          overflow: hidden;
          transform: skewX(-10deg);
          border: 1px solid rgba(124, 246, 255, 0.18);
        }

        :global(.metricBox) {
          border-radius: 0;
          border: 0;
          border-left: 1px solid rgba(255, 255, 255, 0.08);
          text-align: right;
          background: rgba(0, 0, 0, 0.32);
        }

        :global(.metricBox):first-child {
          border-left: 0;
        }

        :global(.metricBox > *),
        :global(.podiumMetrics div > *) {
          display: block;
        }

        :global(.metricBox > *) {
          transform: skewX(10deg);
        }

        :global(.primaryMetric) {
          background: rgba(45, 224, 255, 0.12);
        }

        :global(.metricValue) {
          color: #ffffff;
          font-size: 18px;
          font-weight: 950;
          line-height: 1;
        }

        :global(.metricValue.small) {
          color: #7cf6ff;
          font-size: 16px;
        }

        :global(.metricLabel) {
          margin-top: 5px;
          color: rgba(255, 255, 255, 0.56);
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
        }

        :global(.avatar) {
          display: block;
          width: 58px;
          height: 58px;
          border-radius: 16px;
          object-fit: cover;
          flex-shrink: 0;
          border: 1px solid rgba(45, 224, 255, 0.3);
          background: rgba(255, 255, 255, 0.05);
        }

        @keyframes badgeLift {
          0%,
          100% {
            transform: translateY(0) skewX(-8deg);
            filter: brightness(1);
          }
          50% {
            transform: translateY(-2px) skewX(-8deg);
            filter: brightness(1.18);
          }
        }

        @keyframes badgeSweep {
          0%,
          48% {
            transform: translateX(-120%) skewX(-18deg);
          }
          70%,
          100% {
            transform: translateX(120%) skewX(-18deg);
          }
        }

        @media (max-width: 880px) {
          .podium {
            grid-template-columns: 1fr;
          }

          .rank1 {
            order: 1;
          }

          .rank2 {
            order: 2;
          }

          .rank3 {
            order: 3;
          }

          .podiumCard,
          .rank1,
          .rank2,
          .rank3 {
            min-height: 0;
          }

          .row {
            grid-template-columns: 58px minmax(0, 1fr);
            padding: 12px 12px 12px 92px;
          }

          .metrics {
            grid-column: 1 / -1;
            width: 100%;
            min-width: 0;
          }
        }

        @media (max-width: 560px) {
          .page {
            padding-inline: 10px;
          }

          .row {
            grid-template-columns: 1fr;
            padding: 96px 12px 12px;
          }

          .avatarFade {
            width: 100%;
            height: 118px;
            mask-image: linear-gradient(180deg, #000 0%, #000 48%, transparent 100%);
            -webkit-mask-image: linear-gradient(180deg, #000 0%, #000 48%, transparent 100%);
          }

          .avatarFade :global(.avatar) {
            width: 100%;
            height: 118px;
            border-radius: 22px 22px 0 0;
          }

          .rankPlate {
            width: fit-content;
            height: auto;
            padding: 8px 12px;
          }

          :global(.metrics),
          :global(.podiumMetrics) {
            grid-template-columns: 1fr;
            transform: none;
          }

          :global(.metricBox > *) {
            transform: none;
          }

          :global(.metricBox) {
            text-align: left;
          }
        }
      `}</style>
    </main>
  );
}
