import Link from "next/link";
import { creators } from "@/data/creators";

export default function HomePage() {
  const totalCreators = creators.length;

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

          <p className="hero-subtitle">
            The dashboard is currently under maintenance.
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

            <div className="glow-stats glow-stats-split">
              <div className="glow-stat compact">
                <div className="glow-stat-label">Creators</div>
                <div className="glow-stat-value">{totalCreators}</div>
                <div className="glow-stat-sub">ACTIVE IN THIS DASHBOARD</div>
              </div>

              <div className="glow-divider" />

              <div className="glow-stat compact">
                <div className="glow-stat-label">Status</div>
                <div className="glow-stat-value status-maintenance">
                  Under Maintenance
                </div>
                <div className="glow-stat-sub">TEMPORARILY UNAVAILABLE</div>
              </div>
            </div>

            <div className="glow-footer"></div>
          </div>
        </section>
      </div>
    </main>
  );
}