"use client";

import { creators } from "@/data/creators";

export default function LeaderboardPage() {
  // Sort creators by lifetime diamonds (highest → lowest)
  const sorted = [...creators].sort((a, b) => b.lifetime - a.lifetime);

  return (
    <main className="leaderboard-wrapper">

      {/* Banner Image Replacing Title */}
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

            {/* Rank */}
            <div className="rank-number">{index + 1}</div>

            {/* Avatar */}
            <img
              src={`/creators/${creator.username}.jpg`}
              className="leaderboard-avatar"
              alt={`${creator.username} avatar`}
            />

            {/* Creator Info */}
            <div className="creator-info">
              <div className="creator-username glow-text">
                {creator.username}
              </div>

              <div className="creator-daily">
                Yesterday:{" "}
                <span>{creator.daily.toLocaleString()}</span>
              </div>
            </div>

            {/* Diamonds (Lifetime & Yesterday) */}
            <div className="creator-diamonds">
              
              <div className="lifetime-number">
                {creator.lifetime.toLocaleString()}
              </div>
              <span className="lifetime-label">lifetime</span>

              <div className="yesterday-number">
                {creator.daily.toLocaleString()}
              </div>
              <span className="yesterday-label">yesterday</span>

            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
