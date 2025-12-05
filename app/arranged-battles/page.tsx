import fs from "fs";
import path from "path";
import Link from "next/link";
import { creators } from "@/data/creators";

type Battle = {
  id: string;
  date: string;
  time: string;
  creatorUsername: string;
  opponentAgency: string;
  opponentName: string;
  opponentImageUrl?: string;
  notes?: string;
};

function loadBattles(): Battle[] {
  const file = path.join(process.cwd(), "data", "arranged-battles.json");
  if (!fs.existsSync(file)) return [];
  try {
    const json = JSON.parse(fs.readFileSync(file, "utf8"));
    return (json as Battle[]).sort((a, b) =>
      (a.date + a.time).localeCompare(b.date + b.time)
    );
  } catch {
    return [];
  }
}

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

function getCreatorInfo(username: string) {
  const c = creators.find(
    (x) => x.username.toLowerCase() === username.toLowerCase()
  );
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

export default function ArrangedBattlesPage() {
  const battles = loadBattles();

  return (
    <main
      className="leaderboard-wrapper"
      style={{ maxWidth: "900px", margin: "0 auto" }}
    >
      <div className="leaderboard-title-image">
        <img
          src="/branding/arranged-battles.png"
          alt="Arranged Battles"
          className="leaderboard-title-img"
        />
      </div>

      {battles.length === 0 && (
        <p style={{ textAlign: "center", marginTop: "20px" }}>
          No arranged battles are currently scheduled.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
        {battles.map((b) => {
          const creator = getCreatorInfo(b.creatorUsername);

          return (
            <div
              key={b.id}
              style={{
                background: "#03101a",
                borderRadius: "18px",
                padding: "20px",
                border: "1px solid rgba(45,224,255,0.25)",
                boxShadow: "0 0 24px rgba(45,224,255,0.15)",
              }}
            >
              {/* Date + Time */}
              <div
                style={{
                  textAlign: "center",
                  color: "#2de0ff",
                  fontSize: "20px",
                  fontWeight: 600,
                  marginBottom: "12px",
                }}
              >
                {formatDatePretty(b.date)} — {b.time}
              </div>

              {/* Battle layout */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "20px",
                }}
              >
                {/* Aqua Creator side */}
                <div style={{ textAlign: "center", flex: 1 }}>
                  <img
                    src={creator.avatar}
                    alt={creator.display}
                    style={{
                      width: "120px",
                      height: "120px",
                      borderRadius: "50%",
                      border: "2px solid #2de0ff",
                      objectFit: "cover",
                    }}
                  />
                  <div
                    style={{
                      color: "#e7f9ff",
                      marginTop: "6px",
                      fontSize: "18px",
                      fontWeight: 600,
                    }}
                  >
                    {creator.display}
                  </div>
                  <div
                    style={{ color: "#8ad6ff", fontSize: "14px", marginTop: 2 }}
                  >
                    Aqua Agency
                  </div>
                </div>

                {/* VS */}
                <div
                  style={{
                    fontSize: "26px",
                    fontWeight: 700,
                    color: "#2de0ff",
                  }}
                >
                  VS
                </div>

                {/* Opponent side */}
                <div style={{ textAlign: "center", flex: 1 }}>
                  <img
                    src={b.opponentImageUrl || "/branding/default-opponent.png"}
                    alt={b.opponentName}
                    style={{
                      width: "120px",
                      height: "120px",
                      borderRadius: "50%",
                      border: "2px solid #2de0ff",
                      objectFit: "cover",
                    }}
                  />
                  <div
                    style={{
                      color: "#e7f9ff",
                      marginTop: "6px",
                      fontSize: "18px",
                      fontWeight: 600,
                    }}
                  >
                    {b.opponentName}
                  </div>
                  <div
                    style={{ color: "#8ad6ff", fontSize: "14px", marginTop: 2 }}
                  >
                    {b.opponentAgency}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {b.notes && (
                <div
                  style={{
                    textAlign: "center",
                    marginTop: "12px",
                    color: "#bdeaff",
                    fontSize: "14px",
                  }}
                >
                  Notes: {b.notes}
                </div>
              )}

              {/* Poster link */}
              <div style={{ textAlign: "center", marginTop: "14px" }}>
                <Link
                  href={`/arranged-battles/${b.id}/poster`}
                  className="aqua-link"
                >
                  View Poster
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
