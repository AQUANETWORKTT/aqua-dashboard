import Link from "next/link";
import { creators } from "@/data/creators";

function formatNumber(num: number) {
  return num.toLocaleString("en-GB");
}

export default function HomePage() {
  const totalCreators = creators.length;
  const totalLifetime = creators.reduce((sum, c) => sum + c.lifetime, 0);
  const totalDaily = creators.reduce((sum, c) => sum + c.daily, 0);

  return (
    <main className="home-wrapper">
      <div className="hero-grid">

        {/* LEFT SIDE */}
        <section className="hero-left">

          <img
            src="/aqua-logo.png"
            alt="Aqua Agency"
            className="hero-logo-img"
          />

          

          <h1 className="hero-title">
            Diamonds, streaks &amp; rankings
            <span className="hero-title-accent"> in one dashboard.</span>
          </h1>

          {/* UPDATED SUBTITLE */}
          <p className="hero-subtitle">
            Flowing Toward Your Full Potential.
          </p>

          <div className="hero-buttons">
            <Link href="/login" className="btn-primary">
              Creator Login
            </Link>
          </div>

                  
        </section>

        {/* RIGHT SIDE */}
        <section className="hero-right">
          <div className="glow-card">
            <div className="glow-card-header">
              <span className="glow-dot" />
              <span className="glow-label">Network Snapshot</span>
            </div>

            <div className="glow-stats">
              <div className="glow-stat">
                <div className="glow-stat-label">Creators</div>
                <div className="glow-stat-value">{totalCreators}</div>
                <div className="glow-stat-sub">active in this dashboard</div>
              </div>

              <div className="glow-stat">
                <div className="glow-stat-label">Lifetime Diamonds</div>
                <div className="glow-stat-value">
                  {formatNumber(totalLifetime)}
                </div>
                <div className="glow-stat-sub">all-time across the network</div>
              </div>

              <div className="glow-stat">
                <div className="glow-stat-label">Today's Diamonds</div>
                <div className="glow-stat-value">
                  {formatNumber(totalDaily)}
                </div>
                <div className="glow-stat-sub">generated so far today</div>
              </div>
            </div>

            <div className="glow-footer">
              
             
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
