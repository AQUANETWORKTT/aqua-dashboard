import Link from "next/link";
import { submissionsSupabase } from "@/lib/submissions-supabase";

export default async function HomePage() {
  const { data: latestUpload } = await submissionsSupabase
    .from("creator_monthly_stats")
    .select("stats_date")
    .not("stats_date", "is", null)
    .order("stats_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const latestStatsDate = latestUpload?.stats_date;

  const { count } = latestStatsDate
    ? await submissionsSupabase
        .from("creator_monthly_stats")
        .select("creator_id", { count: "exact", head: true })
        .eq("stats_date", latestStatsDate)
    : await submissionsSupabase
        .from("creator_monthly_stats")
        .select("creator_id", { count: "exact", head: true });

  const totalCreators = count ?? 0;

  return (
    <main className="home-wrapper">
      <div className="hero-grid">
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

          <p className="hero-subtitle">The dashboard is now live.</p>

          <div className="hero-buttons">
            <Link href="/login" className="btn-primary">
              Creator Login
            </Link>
          </div>
        </section>

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
                <div className="glow-stat-value status-live">Live</div>
                <div className="glow-stat-sub">FULLY OPERATIONAL</div>
              </div>
            </div>

            <div className="glow-footer"></div>
          </div>
        </section>
      </div>
    </main>
  );
}
