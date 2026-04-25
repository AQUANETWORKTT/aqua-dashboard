import Link from "next/link";
import { creators } from "@/data/creators";

export default function HomePage() {
  const totalCreators = creators.length;

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "28px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at top, rgba(0,180,255,0.18), transparent 34%), linear-gradient(180deg, #020617 0%, #030712 58%, #000 100%)",
        color: "#fff",
        fontFamily: "'Orbitron', 'Rajdhani', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1120,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 22,
          alignItems: "center",
        }}
      >
        <section>
          <img
            src="/aqua-logo.png"
            alt="Aqua Agency"
            style={{
              width: 130,
              marginBottom: 24,
              filter: "drop-shadow(0 0 20px rgba(45,224,255,0.35))",
            }}
          />

          <div
            style={{
              color: "#2de0ff",
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: "0.36em",
              textTransform: "uppercase",
              marginBottom: 14,
              textShadow: "0 0 10px rgba(45,224,255,0.65)",
            }}
          >
            Aqua Creator Network
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "clamp(42px, 8vw, 82px)",
              lineHeight: 0.95,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              textShadow:
                "0 0 8px rgba(45,224,255,0.9), 0 0 28px rgba(45,224,255,0.45)",
            }}
          >
            Creator
            <br />
            Dashboard
          </h1>

          <p
            style={{
              marginTop: 20,
              maxWidth: 520,
              color: "rgba(255,255,255,0.62)",
              fontSize: 16,
              lineHeight: 1.7,
            }}
          >
            Diamonds, streaks, rankings and incentive progress in one premium
            Aqua dashboard.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 28 }}>
            <Link
              href="/login"
              style={{
                padding: "15px 22px",
                borderRadius: 16,
                background:
                  "linear-gradient(90deg, rgba(45,224,255,0.95), rgba(124,246,255,0.95))",
                color: "#001018",
                fontSize: 13,
                fontWeight: 900,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                textDecoration: "none",
                boxShadow: "0 0 26px rgba(45,224,255,0.22)",
              }}
            >
              Creator Login
            </Link>

            <Link
              href="/leaderboard"
              style={{
                padding: "15px 22px",
                borderRadius: 16,
                border: "1px solid rgba(45,224,255,0.32)",
                color: "#7cf6ff",
                fontSize: 13,
                fontWeight: 900,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                textDecoration: "none",
                background: "rgba(45,224,255,0.05)",
                boxShadow: "inset 0 0 16px rgba(45,224,255,0.06)",
              }}
            >
              Leaderboard
            </Link>
          </div>
        </section>

        <section
          style={{
            borderRadius: 30,
            padding: 24,
            background:
              "linear-gradient(180deg, rgba(7,17,31,0.94), rgba(3,7,18,0.97))",
            border: "1px solid rgba(45,224,255,0.22)",
            boxShadow:
              "inset 0 0 28px rgba(45,224,255,0.04), 0 0 36px rgba(0,180,255,0.12)",
          }}
        >
          <div
            style={{
              color: "#2de0ff",
              fontSize: 13,
              fontWeight: 900,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              marginBottom: 18,
            }}
          >
            Network Snapshot
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
            }}
          >
            <div
              style={{
                padding: 18,
                borderRadius: 22,
                background: "rgba(255,255,255,0.035)",
                border: "1px solid rgba(255,255,255,0.09)",
              }}
            >
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>
                Creators
              </div>
              <div style={{ fontSize: 42, fontWeight: 900, marginTop: 8 }}>
                {totalCreators}
              </div>
              <div style={{ color: "#7cf6ff", fontSize: 10, marginTop: 6 }}>
                ACTIVE
              </div>
            </div>

            <div
              style={{a
                padding: 18,
                borderRadius: 22,
                background: "rgba(124,246,255,0.06)",
                border: "1px solid rgba(124,246,255,0.18)",
              }}
            >
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>
                Status
              </div>
              <div
                style={{
                  fontSize: 42,
                  fontWeight: 900,
                  marginTop: 8,
                  color: "#7cf6ff",
                  textShadow: "0 0 14px rgba(124,246,255,0.55)",
                }}
              >
                Live
              </div>
              <div style={{ color: "#7cf6ff", fontSize: 10, marginTop: 6 }}>
                OPERATIONAL
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}