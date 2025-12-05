import fs from "fs";
import path from "path";

type Battle = {
  id: string;
  date: string;
  time: string;
  creatorUsername: string;
  opponentAgency: string;
  opponentName: string;
  opponentImageUrl?: string;
  notes?: string;
  posterUrl?: string;
};

// Load all battles
function loadBattles(): Battle[] {
  const file = path.join(process.cwd(), "data", "arranged-battles.json");
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as Battle[];
  } catch {
    return [];
  }
}

export default async function BattlePosterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // ⬇️ FIX: unwrap params
  const { id } = await params;

  const battles = loadBattles();
  const battle = battles.find((b) => b.id === id);

  if (!battle || !battle.posterUrl) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <h2 style={{ color: "white" }}>Poster not found</h2>
      </div>
    );
  }

  return (
    <main
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        textAlign: "center",
        paddingTop: "20px",
      }}
    >
      <img
        src={battle.posterUrl}
        alt="Battle Poster"
        style={{
          width: "100%",
          borderRadius: "16px",
          border: "2px solid #2de0ff",
        }}
      />
    </main>
  );
}
