import Link from "next/link";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "28px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        background:
          "radial-gradient(circle at top, rgba(0,180,255,0.18), transparent 34%), linear-gradient(180deg, #020617 0%, #030712 58%, #000 100%)",
        color: "#fff",
        fontFamily: "'Orbitron', 'Rajdhani', system-ui, sans-serif",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 620,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <img
          src="/aqua-logo.png"
          alt="Aqua Agency"
          style={{
            width: 145,
            marginBottom: 28,
            filter: "drop-shadow(0 0 22px rgba(45,224,255,0.42))",
          }}
        />

        <h1
          style={{
            margin: 0,
            fontSize: "clamp(46px, 10vw, 86px)",
            lineHeight: 0.92,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            textShadow:
              "0 0 8px rgba(45,224,255,0.9), 0 0 28px rgba(45,224,255,0.45)",
          }}
        >
          Aqua App
        </h1>

        <p
          style={{
            marginTop: 22,
            maxWidth: 500,
            color: "rgba(255,255,255,0.62)",
            fontSize: 16,
            lineHeight: 1.7,
          }}
        >
          Diamonds, streaks, rankings and incentive progress in one premium
          Aqua dashboard.
        </p>

        <div
          style={{
            marginTop: 26,
            padding: "12px 18px",
            borderRadius: 999,
            background: "rgba(124,246,255,0.06)",
            border: "1px solid rgba(124,246,255,0.22)",
            color: "#7cf6ff",
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            boxShadow: "0 0 18px rgba(45,224,255,0.12)",
          }}
        >
          Status: Live
        </div>

        <Link
          href="/login"
          style={{
            marginTop: 30,
            padding: "15px 24px",
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
      </section>
    </main>
  );
}