import fs from "fs";
import path from "path";
import Link from "next/link";
import { creators } from "@/data/creators";

// -----------------------------
// Types
// -----------------------------
type Creator = {
  username: string;
  displayName?: string;
  daily: number;
  lifetime: number;
};

type Battle = {
  id: string;
  date: string;
  time: string;
  creatorUsername: string;
  opponentAgency: string;
  opponentName: string;
  opponentImageUrl?: string;
  posterUrl?: string;
  notes?: string;
};

// -----------------------------
// Load Arranged Battles
// -----------------------------
function loadBattles(): Battle[] {
  const file = path.join(process.cwd(), "data", "arranged-battles.json");
  if (!fs.existsSync(file)) return [];

  try {
    const json = JSON.parse(fs.readFileSync(file, "utf8"));
    return json.sort((a: Battle, b: Battle) =>
      (a.date + a.time).localeCompare(b.date + b.time)
    );
  } catch {
    return [];
  }
}

// -----------------------------
// Formatting Helpers
// -----------------------------
function formatDatePretty(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// -----------------------------
// Creator Lookup (Type-safe)
// -----------------------------
function getCreatorInfo(username: string) {
  const c = creators.find(
    (x) => x.username.toLowerCase() === username.toLowerCase()
  ) as Creator | undefined;

  if (!c)
    return {
      display: username,
      avatar: "/branding/default-creator.png",
      agency: "Aqua Agency",
    };

  return {
    display: c.displayName ?? c.username,
    avatar: `/creators/${c.username}.jpg`,
    agency: "Aqua Agency",
  };
}

// -----------------------------
// Page Component
// -----------------------------
export default function ArrangedBattlesPage() {
  const battles = loadBattles();

  return (
    <main
      className="leaderboard-wrapper"
      style={{ maxWidth: "900px", margin: "0 auto" }}
    >
      {/* Banner */}
      <div className="leaderboard-title-image">
        <img
          src="/branding/arranged-battles.png"
          alt="Arranged Battles"
          className="leaderboard-title-img"
        />
      </div>

      {/* No Battles */}
      {battles.length === 0 && (
        <p style={{ textAlign: "center", marginTop: "20px" }}>
          No arranged battles are currently scheduled.
        </p>
      )}

      {/* Battles List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
        {battles.map((b) => {
          const creator = getCreatorInfo(b.creatorUsername);

          return (
            <div
              key={b.id}
              style={{
                background: "#03101a",
                borderRadius: "20px",
                padding: "22px",
                border: "1px solid rgba(45,224,255,0.25)",
                boxShadow: "0 0 24px rgba(45,224,255,0.18)",
              }}
            >
              {/* Date */}
              <div
                style={{
                  textAlign: "center",
                  color: "#2de0ff",
                  fontSize: "20px",
                  fontWeight: 700,
                  marginBottom: "16px",
                }}
              >
                {formatDatePretty(b.date)} — {b.time}
              </div>

              {/* Battle Row */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "20px",
                  alignItems: "center",
                }}
              >
                {/* Creator */}
                <div style={{ flex: 1, textAlign: "center" }}>
                  <img
                    src={creator.avatar}
                    alt={creator.display}
                    style={{
                      width: "130px",
                      height: "130px",
                      borderRadius: "50%",
                      border: "2px solid #2de0ff",
                      objectFit: "cover",
                    }}
                  />
                  <div
                    style={{
                      marginTop: "10px",
                      fontSize: "20px",
                      fontWeight: 600,
                      color: "#e7f9ff",
                    }}
                  >
                    {creator.display}
                  </div>
                  <div style={{ color: "#8ad6ff", fontSize: "15px" }}>
                    {creator.agency}
                  </div>
                </div>

                {/* VS */}
                <div
                  style={{
                    color: "#2de0ff",
                    fontSize: "32px",
                    fontWeight: 800,
                  }}
                >
                  VS
                </div>

                {/* Opponent */}
                <div style={{ flex: 1, textAlign: "center" }}>
                  <img
                    src={b.opponentImageUrl || "/branding/default-opponent.png"}
                    alt={b.opponentName}
                    style={{
                      width: "130px",
                      height: "130px",
                      borderRadius: "50%",
                      border: "2px solid #2de0ff",
                      objectFit: "cover",
                    }}
                  />
                  <div
                    style={{
                      marginTop: "10px",
                      fontSize: "20px",
                      fontWeight: 600,
                      color: "#e7f9ff",
                    }}
                  >
                    {b.opponentName}
                  </div>
                  <div style={{ color: "#8ad6ff", fontSize: "15px" }}>
                    {b.opponentAgency}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {b.notes && (
                <div
                  style={{
                    marginTop: "15px",
                    textAlign: "center",
                    fontSize: "15px",
                    color: "#bdeaff",
                  }}
                >
                  Notes: {b.notes}
                </div>
              )}

              {/* POSTER LINK */}
              <div style={{ textAlign: "center", marginTop: "20px" }}>
                {b.posterUrl ? (
                  <Link
                    href={b.posterUrl}
                    target="_blank"
                    style={{
                      display: "inline-block",
                      padding: "10px 22px",
                      background: "#2de0ff",
                      color: "#02141b",
                      borderRadius: "10px",
                      fontWeight: 700,
                      fontSize: "15px",
                      textDecoration: "none",
                      boxShadow: "0 0 14px rgba(45,224,255,0.6)",
                    }}
                  >
                    View Poster
                  </Link>
                ) : (
                  <div
                    style={{
                      color: "#8ad6ff",
                      marginTop: "10px",
                      fontSize: "14px",
                    }}
                  >
                    Poster not uploaded yet
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
