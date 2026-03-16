"use client";

import { useEffect, useState } from "react";
import { creators } from "@/data/creators";

function CreatorAvatar({ username }: { username: string }) {
  const originalSrc = `/creators/${encodeURIComponent(username)}.jpg`;
  const fallbackSrc = "/creators/default.jpg";

  const [src, setSrc] = useState(fallbackSrc);

  useEffect(() => {
    const img = new window.Image();

    img.src = originalSrc;

    img.onload = () => setSrc(originalSrc);
    img.onerror = () => setSrc(fallbackSrc);
  }, [originalSrc]);

  return (
    <img
      src={src}
      alt={`${username} avatar`}
      className="leaderboard-avatar"
    />
  );
}

export default function LeaderboardPage() {
  const sorted = [...creators].sort((a, b) => b.lifetime - a.lifetime);

  return (
    <main className="leaderboard-wrapper">
      <div className="leaderboard-title-image">
        <img
          src="/branding/creator-leaderboard.png"
          alt="Creator Leaderboard"
          className="leaderboard-title-img"
        />
      </div>

      <div className="leaderboard-list">
        {sorted.map((creator, index) => (
          <div key={creator.username} className="leaderboard-row">
            <div className="leaderboard-left">
              <div className="rank-number">{index + 1}</div>

              <CreatorAvatar username={creator.username} />

              <div className="creator-info">
                <div className="creator-username glow-text">
                  {creator.username}
                </div>

                {creator.username === "alfie.harnett" && (
                  <div className="campaign-winner-text">
                    Aqua Ascension Campaign Winner
                  </div>
                )}

                {creator.username === "dylanjinks" && (
                  <div className="box-battle-winner-text">
                    BOX BATTLE WINNER
                  </div>
                )}

                {creator.username === "mavismim" && (
                  <div className="h2h-winner-text">
                    FEBRUARY FINALE H2D WINNER
                  </div>
                )}

		{creator.username === "browniefamboi" && (
  		  <div className="deep-dive-winner-text">
    		    THE DEEP DIVE CAMPAIGN WINNER
  		  </div>
		)}
              </div>
            </div>

            <div className="leaderboard-right">
              <div className="leaderboard-lifetime">
                {creator.lifetime.toLocaleString()}
              </div>
              <div className="leaderboard-lifetime-label">Monthly</div>

              <div className="leaderboard-yesterday">
                {creator.daily.toLocaleString()}
              </div>
              <div className="leaderboard-yesterday-label">Yesterday</div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}