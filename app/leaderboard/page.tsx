"use client";

import { creators } from "@/data/creators";

export default function LeaderboardPage() {
  // Sort creators by lifetime diamonds (highest → lowest)
  const sorted = [...creators].sort((a, b) => b.lifetime - a.lifetime);

  return (
    <main className="leaderboard-wrapper">

      {/* Banner Image */}
      <div className="leaderboard-title-image">
        <img
          src="/branding/points-leaderboard.png"
          alt="Points Leaderboard"
          className="leaderboard-title-img"
        />
      </div>

      {/* Leaderboard List */}
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
            </div>

            {/* RIGHT SIDE — Diamonds */}
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
