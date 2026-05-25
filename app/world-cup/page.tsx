"use client";

import React, { useEffect, useMemo, useState } from "react";

type Creator = {
  username: string;
};

type Team = {
  id: number;
  country: string;
  kit: string;
  accent: string;
  glow: string;
  creators: Creator[];
};

const LOCAL_AVATAR_OVERRIDES: Record<string, string> = {
  livburns5: "/creators/livburns5.jpg",
};

const TEAMS: Team[] = [
  {
    id: 1,
    country: "Brazil",
    kit: "from-[#009739] via-[#FEDD00] to-[#012169]",
    accent: "border-[#FEDD00]",
    glow: "shadow-yellow-400/30",
    creators: [
      { username: "lucylou449" },
      { username: "damo_bafc" },
      { username: "keeton663" },
    ],
  },
  {
    id: 2,
    country: "Argentina",
    kit: "from-[#6CACE4] via-white to-[#6CACE4]",
    accent: "border-[#6CACE4]",
    glow: "shadow-sky-400/30",
    creators: [
      { username: "xomarky" },
      { username: "maximillion231" },
      { username: "willem_yates" },
    ],
  },
  {
    id: 3,
    country: "France",
    kit: "from-[#002654] via-white to-[#ED2939]",
    accent: "border-[#ED2939]",
    glow: "shadow-blue-500/30",
    creators: [
      { username: "dylanjinks" },
      { username: "xemma.bellx" },
      { username: "amzymooxox1" },
      { username: "libbyamberxoxo" },
    ],
  },
  {
    id: 4,
    country: "Spain",
    kit: "from-[#AA151B] via-[#F1BF00] to-[#AA151B]",
    accent: "border-[#F1BF00]",
    glow: "shadow-red-500/30",
    creators: [
      { username: "georgiabrookss20" },
      { username: "doltonl" },
      { username: "alfiedavies048" },
      { username: "rubesamari4" },
      { username: "georgiaa.dale" },
    ],
  },
  {
    id: 5,
    country: "Germany",
    kit: "from-black via-[#DD0000] to-[#FFCE00]",
    accent: "border-[#FFCE00]",
    glow: "shadow-red-500/30",
    creators: [
      { username: "arabellama_y" },
      { username: "adam_gym234" },
      { username: "jordan.sears_" },
      { username: "ayo_itz_phoebe" },
      { username: "rubes.wh1tw0rth" },
    ],
  },
  {
    id: 6,
    country: "England",
    kit: "from-white via-[#C8102E] to-white",
    accent: "border-white",
    glow: "shadow-red-400/30",
    creators: [
      { username: "harryjonesey" },
      { username: "whossoleice" },
      { username: "harleyj23x" },
      { username: "livy_lucy28" },
    ],
  },
  {
    id: 7,
    country: "Portugal",
    kit: "from-[#006600] via-[#FF0000] to-[#FFCC00]",
    accent: "border-[#006600]",
    glow: "shadow-green-500/30",
    creators: [
      { username: "corie.watkins" },
      { username: "xojayyy" },
      { username: "j.wliveacc" },
      { username: "callum.072" },
      { username: "ab1ssecret" },
    ],
  },
  {
    id: 8,
    country: "Netherlands",
    kit: "from-[#AE1C28] via-white to-[#21468B]",
    accent: "border-[#21468B]",
    glow: "shadow-blue-500/30",
    creators: [
      { username: "elliex035" },
      { username: "lukealbert4" },
      { username: "livburns5" },
      { username: "clyall05" },
    ],
  },
];

const HERO_IMAGE = "/world-cup/world-cup-hero.jpg";

function getInitials(username: string) {
  return (
    username
      .replace(/[^a-zA-Z0-9]/g, " ")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "A"
  );
}

function cleanUsername(value: string | null | undefined) {
  return String(value || "")
    .replace("@", "")
    .trim()
    .toLowerCase();
}

async function fetchTikTokAvatar(username: string) {
  if (!username) return "";

  try {
    const res = await fetch("/api/tiktok-avatar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username }),
    });

    const json = await res.json();
    return json.avatar || "";
  } catch {
    return "";
  }
}

function CreatorAvatar({ username }: { username: string }) {
  const clean = cleanUsername(username);
  const fallbackSrc = "/creators/default.jpg";

  const [src, setSrc] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadAvatar() {
      setFailed(false);

      const manualAvatar = LOCAL_AVATAR_OVERRIDES[clean];

      if (manualAvatar) {
        setSrc(manualAvatar);
        return;
      }

      const scrapedAvatar = await fetchTikTokAvatar(clean);

      if (scrapedAvatar) {
        if (!cancelled) {
          setSrc(scrapedAvatar);
        }
        return;
      }

      const localSrc = `/creators/${encodeURIComponent(clean)}.jpg`;

      const img = new window.Image();
      img.src = localSrc;

      img.onload = () => {
        if (!cancelled) {
          setSrc(localSrc);
        }
      };

      img.onerror = () => {
        if (!cancelled) {
          setSrc(fallbackSrc);
        }
      };
    }

    loadAvatar();

    return () => {
      cancelled = true;
    };
  }, [clean]);

  const showFallbackInitials = failed || !src;

  return (
    <div className="flex min-w-[82px] flex-col items-center gap-2 sm:min-w-[96px]">
      <div className="relative">
        <div className="absolute inset-[-5px] rounded-full bg-white/25 blur-md" />

        <div className="relative grid h-16 w-16 place-items-center overflow-hidden rounded-full border-2 border-white bg-slate-950 shadow-lg sm:h-20 sm:w-20">
          {showFallbackInitials ? (
            <span className="text-lg font-black text-white">
              {getInitials(username)}
            </span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={username}
              className="h-full w-full object-cover"
              onError={() => {
                setFailed(true);
                setSrc("");
              }}
            />
          )}
        </div>
      </div>

      <p className="max-w-[95px] truncate text-center font-mono text-[11px] font-black uppercase tracking-[-0.02em] text-white sm:max-w-[120px] sm:text-xs">
        {username}
      </p>
    </div>
  );
}

function CountryFlag({ country }: { country: string }) {
  if (country === "France") {
    return (
      <div className="grid h-12 w-12 grid-cols-3 overflow-hidden rounded-2xl shadow-lg">
        <div className="bg-[#002654]" />
        <div className="bg-white" />
        <div className="bg-[#ED2939]" />
      </div>
    );
  }

  if (country === "Germany") {
    return (
      <div className="grid h-12 w-12 grid-rows-3 overflow-hidden rounded-2xl shadow-lg">
        <div className="bg-black" />
        <div className="bg-[#DD0000]" />
        <div className="bg-[#FFCE00]" />
      </div>
    );
  }

  if (country === "Netherlands") {
    return (
      <div className="grid h-12 w-12 grid-rows-3 overflow-hidden rounded-2xl shadow-lg">
        <div className="bg-[#AE1C28]" />
        <div className="bg-white" />
        <div className="bg-[#21468B]" />
      </div>
    );
  }

  if (country === "Spain") {
    return (
      <div className="grid h-12 w-12 overflow-hidden rounded-2xl shadow-lg">
        <div className="h-3 bg-[#AA151B]" />
        <div className="h-6 bg-[#F1BF00]" />
        <div className="h-3 bg-[#AA151B]" />
      </div>
    );
  }

  if (country === "Argentina") {
    return (
      <div className="grid h-12 w-12 grid-rows-3 overflow-hidden rounded-2xl shadow-lg">
        <div className="bg-[#6CACE4]" />
        <div className="relative bg-white">
          <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F6B40E]" />
        </div>
        <div className="bg-[#6CACE4]" />
      </div>
    );
  }

  if (country === "England") {
    return (
      <div className="relative h-12 w-12 overflow-hidden rounded-2xl bg-white shadow-lg">
        <div className="absolute left-1/2 top-0 h-full w-2 -translate-x-1/2 bg-[#C8102E]" />
        <div className="absolute left-0 top-1/2 h-2 w-full -translate-y-1/2 bg-[#C8102E]" />
      </div>
    );
  }

  if (country === "Portugal") {
    return (
      <div className="relative flex h-12 w-12 overflow-hidden rounded-2xl shadow-lg">
        <div className="w-[42%] bg-[#006600]" />
        <div className="flex-1 bg-[#FF0000]" />
        <div className="absolute left-[34%] top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-[#FFCC00]" />
      </div>
    );
  }

  return (
    <div className="relative h-12 w-12 overflow-hidden rounded-2xl bg-[#009739] shadow-lg">
      <div className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[#FEDD00]" />
      <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#012169]" />
    </div>
  );
}

function TeamCard({ team, index }: { team: Team; index: number }) {
  const captain = team.creators[0];
  const players = team.creators.slice(1);

  return (
    <section
      className={`relative overflow-hidden rounded-[2rem] border ${team.accent} bg-black/55 shadow-2xl ${team.glow} backdrop-blur-md`}
    >
      <div className={`absolute inset-x-0 top-0 h-2 bg-gradient-to-r ${team.kit}`} />
      <div
        className={`absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gradient-to-br ${team.kit} opacity-30 blur-2xl`}
      />

      <div className="relative p-4 sm:p-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CountryFlag country={team.country} />

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-white/55">
                Team {index + 1}
              </p>

              <h2 className="text-2xl font-black uppercase tracking-tight text-white">
                {team.country}
              </h2>
            </div>
          </div>

          <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black text-white">
            {team.creators.length} players
          </div>
        </div>

        <div className="mb-6 flex justify-center">
          <div className="relative">
            <div className="absolute inset-[-10px] rounded-full bg-yellow-400/30 blur-xl" />

            <div className="relative flex flex-col items-center">
              <div className="mb-2 rounded-full border border-yellow-300/50 bg-yellow-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-yellow-200">
                Captain
              </div>

              <div className="scale-110">
                <CreatorAvatar username={captain.username} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-x-5 gap-y-5">
          {players.map((creator) => (
            <CreatorAvatar key={creator.username} username={creator.username} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function WorldCupPage() {
  const totalPlayers = useMemo(
    () => TEAMS.reduce((sum, team) => sum + team.creators.length, 0),
    []
  );

  return (
    <main
      className="min-h-dvh overflow-x-hidden bg-[#060611] pb-[calc(8rem+env(safe-area-inset-bottom))] text-white"
      style={{
        WebkitOverflowScrolling: "touch",
      }}
    >
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[#060611]" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,#234bff33,transparent_35%),radial-gradient(circle_at_bottom_left,#ffb00022,transparent_35%),radial-gradient(circle_at_bottom_right,#ff004422,transparent_35%)]" />

      <section className="relative mx-auto max-w-6xl px-4 pb-6 pt-4 sm:px-6 sm:pt-6">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black shadow-2xl shadow-blue-500/20">
          <div className="absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-[#060611] via-[#060611]/35 to-transparent sm:h-28" />
          <div className="absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-black/30 to-transparent" />

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HERO_IMAGE}
            alt="Aqua's World Cup Campaign"
            className="h-[290px] w-full object-cover object-center sm:h-[460px]"
          />
        </div>

        <div className="relative z-20 -mt-6 text-center sm:-mt-8">
          <h1 className="sr-only">Aqua World Cup Campaign</h1>

          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 backdrop-blur-md">
              <p className="text-2xl font-black">{TEAMS.length}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/55">
                Teams
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 backdrop-blur-md">
              <p className="text-2xl font-black">9</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/55">
                Days
              </p>
            </div>

            <div className="rounded-2xl border border-yellow-300/40 bg-yellow-300/15 px-5 py-3 shadow-lg shadow-yellow-400/20 backdrop-blur-md">
              <p className="text-2xl font-black">15K</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-yellow-100/80">
                Prize
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 backdrop-blur-md">
              <p className="text-2xl font-black">{totalPlayers}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/55">
                Creators
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:grid-cols-2 sm:px-6">
        {TEAMS.map((team, index) => (
          <TeamCard key={team.id} team={team} index={index} />
        ))}
      </section>
    </main>
  );
}
