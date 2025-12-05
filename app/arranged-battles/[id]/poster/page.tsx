import fs from "fs";
import path from "path";
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
    return json as Battle[];
  } catch {
    return [];
  }
}

function getBattle(id: string): Battle | undefined {
  const battles = loadBattles();
  return battles.find((b) => b.id === id);
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

export default function BattlePosterPage({
  params,
}: {
  params: { id: string };
}) {
  const battle = getBattle(params.id);

  if (!battle) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#e7f9ff",
        }}
      >
        Battle not found.
      </main>
    );
  }

  const creator = getCreatorInfo(battle.creatorUsername);

  return (
    <main
      style={{
        minHeight: "100vh",
        margin: 0,
        padding: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#000814",
      }}
    >
      <div
        style={{
          width: "520px",
          height: "932px",
          position: "relative",
          backgroundImage: "url('/branding/battle-poster-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          borderRadius: "24px",
          overflow: "hidden",
          boxShadow: "0 0 40px rgba(0,0,0,0.9)",
        }}
      >
        {/* Creator avatar */}
        <div
          style={{
            position: "absolute",
            left: "50px",
            top: "340px",
            width: "170px",
            height: "170px",
            borderRadius: "50%",
            overflow: "hidden",
            border: "3px solid #2de0ff",
          }}
        >
          <img
            src={creator.avatar}
            alt={creator.display}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        {/* Opponent avatar */}
        <div
          style={{
            position: "absolute",
            right: "50px",
            top: "340px",
            width: "170px",
            height: "170px",
            borderRadius: "50%",
            overflow: "hidden",
            border: "3px solid #2de0ff",
          }}
        >
          <img
            src={battle.opponentImageUrl || "/branding/default-opponent.png"}
            alt={battle.opponentName}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        {/* Creator name */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "530px",
            textAlign: "left",
            paddingLeft: "60px",
            fontSize: "22px",
            fontWeight: 700,
            color: "#ffffff",
          }}
        >
          {creator.display.toUpperCase()}
        </div>

        {/* Date + time */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: "190px",
            textAlign: "center",
            fontSize: "24px",
            fontWeight: 700,
            color: "#54c9ff",
            textTransform: "uppercase",
          }}
        >
          {formatDatePretty(battle.date).toUpperCase()} {battle.time}
        </div>

        {/* Opponent agency logo text at bottom-right (simple) */}
        <div
          style={{
            position: "absolute",
            right: "40px",
            bottom: "40px",
            textAlign: "right",
            color: "#ffd54f",
            fontWeight: 700,
            fontSize: "16px",
            textShadow: "0 0 8px rgba(0,0,0,0.7)",
          }}
        >
          {battle.opponentAgency}
        </div>
      </div>
    </main>
  );
}
