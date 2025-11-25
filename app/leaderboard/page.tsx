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
          src="/branding/creator-leaderboard.png"
          alt="Creator Leaderboard"
          className="leaderboard-title-img"
        />
      </div>

      {/* Leaderboard List */}
      <div className="leaderboard-list">
        {sorted.map((creator, index) => (
          <div key={creator.username} className="leaderboard-row">

            {/* LEFT SIDE */}
            <div className="leaderboard-left">

              {/* Rank */}
              <div className="rank-number">{index + 1}</div>

              {/* Avatar */}
              <img
                src={`/creators/${creator.username}.jpg`}
                className="leaderboard-avatar"
                alt={`${creator.username} avatar`}
              />

              {/* Username */}
              <div className="creator-info">
                <div className="creator-username glow-text">
                  {creator.username}
                </div>
              </div>

            </div>

            {/* RIGHT SIDE */}
            <div className="leaderboard-right">

              <div className="leaderboard-lifetime">
                {creator.lifetime.toLocaleString()}
              </div>
              <div className="leaderboard-lifetime-label">lifetime</div>

              <div className="leaderboard-yesterday">
                {creator.daily.toLocaleString()}
              </div>
              <div className="leaderboard-yesterday-label">yesterday</div>

            </div>

          </div>
        ))}
      </div>
    </main>
  );
}
