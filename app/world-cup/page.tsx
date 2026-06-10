"use client";

import React, { useEffect, useMemo, useState } from "react";

type Creator = {
  username: string;
  diamonds: number;
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
    glow: "shadow-none",
    creators: [
      { username: "lucylou449", diamonds: 0 },
      { username: "sasha.firstclass.agency", diamonds: 0 },
      { username: "livburns5", diamonds: 0 },
      { username: "junior.fontana80", diamonds: 0 },
      { username: "dotlonl", diamonds: 0 },
      { username: ".caitlynrn", diamonds: 0 },
    ],
  },
  {
    id: 2,
    country: "Argentina",
    kit: "from-[#6CACE4] via-white to-[#6CACE4]",
    accent: "border-[#6CACE4]",
    glow: "shadow-none",
    creators: [
      { username: "xomarky", diamonds: 0 },
      { username: "keeton663", diamonds: 0 },
      { username: "nwowen07", diamonds: 0 },
      { username: "x_ruby_x3", diamonds: 0 },
      { username: "lacey.xo.1", diamonds: 0 },
      { username: "e.xm07", diamonds: 0 },
      { username: "livy_lucy28", diamonds: 0 },
    ],
  },
  {
    id: 3,
    country: "France",
    kit: "from-[#002654] via-white to-[#ED2939]",
    accent: "border-[#ED2939]",
    glow: "shadow-none",
    creators: [
      { username: "arabellama_y", diamonds: 0 },
      { username: "xojayyy", diamonds: 0 },
      { username: "jake_pearson_1", diamonds: 0 },
      { username: "maximillion231", diamonds: 0 },
      { username: "nathansonfiree", diamonds: 0 },
      { username: "ayo_itz_phoebe", diamonds: 0 },
      { username: "beccahughes853", diamonds: 0 },
    ],
  },
  {
    id: 4,
    country: "Spain",
    kit: "from-[#AA151B] via-[#F1BF00] to-[#AA151B]",
    accent: "border-[#F1BF00]",
    glow: "shadow-none",
    creators: [
      { username: "z.diness", diamonds: 0 },
      { username: "georgiabrookss20", diamonds: 0 },
      { username: "lukealbert4", diamonds: 0 },
      { username: "candiceI05", diamonds: 0 },
      { username: "alfiedavies048", diamonds: 0 },
      { username: "whossoleice", diamonds: 0 },
      { username: "tionneitaliaa", diamonds: 0 },
    ],
  },
  {
    id: 5,
    country: "Germany",
    kit: "from-black via-[#DD0000] to-[#FFCE00]",
    accent: "border-[#FFCE00]",
    glow: "shadow-none",
    creators: [
      { username: "corie.watkins", diamonds: 0 },
      { username: "avangalinefarr_x0", diamonds: 0 },
      { username: "matt.in.motion_", diamonds: 0 },
      { username: "mikeybrennan05", diamonds: 0 },
      { username: "christina_eva.xo", diamonds: 0 },
      { username: "sarahashy123", diamonds: 0 },
      { username: "sum.cxx", diamonds: 0 },
    ],
  },
  {
    id: 6,
    country: "England",
    kit: "from-white via-[#C8102E] to-white",
    accent: "border-white",
    glow: "shadow-none",
    creators: [
      { username: "j.wliveacc", diamonds: 0 },
      { username: "elliex035", diamonds: 0 },
      { username: "shaysullivan316", diamonds: 0 },
      { username: "adam_gym234", diamonds: 0 },
      { username: "essexdollabi", diamonds: 0 },
      { username: "libbyamberxoxo", diamonds: 0 },
      { username: "lukersuv", diamonds: 0 },
    ],
  },
  {
    id: 7,
    country: "Portugal",
    kit: "from-[#006600] via-[#FF0000] to-[#FFCC00]",
    accent: "border-[#006600]",
    glow: "shadow-none",
    creators: [
      { username: "dylanjinks", diamonds: 0 },
      { username: "mollsjadex", diamonds: 0 },
      { username: "nelly.parsnipsx40", diamonds: 0 },
      { username: "jordan.sears_", diamonds: 0 },
      { username: "georgia.dale", diamonds: 0 },
      { username: "chappers97", diamonds: 0 },
      { username: "libbiejayne1", diamonds: 0 },
    ],
  },
  {
    id: 8,
    country: "Netherlands",
    kit: "from-[#AE1C28] via-white to-[#21468B]",
    accent: "border-[#21468B]",
    glow: "shadow-none",
    creators: [
      { username: "harryjonesey", diamonds: 0 },
      { username: "damo_bafc", diamonds: 0 },
      { username: "kaidensc07", diamonds: 0 },
      { username: "zeedz", diamonds: 0 },
      { username: "rubesamari4", diamonds: 0 },
      { username: "y0ur_local_j", diamonds: 0 },
      { username: "callum.072", diamonds: 0 },
    ],
  },
];

const HERO_IMAGE = "/world-cup/world-cup-hero.jpg";

function cleanUsername(value: string | null | undefined) {
  return String(value || "").replace("@", "").trim().toLowerCase();
}

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

function formatDiamonds(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(2)}m`;
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return value.toLocaleString();
}

function getTeamTotal(team: Team) {
  return team.creators.reduce((sum, creator) => sum + creator.diamonds, 0);
}

function sortCreators(creators: Creator[]) {
  return [...creators].sort((a, b) => b.diamonds - a.diamonds);
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

function CreatorAvatar({
  username,
  size = "small",
  captain = false,
}: {
  username: string;
  size?: "tiny" | "small" | "medium" | "large";
  captain?: boolean;
}) {
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
        if (!cancelled) setSrc(scrapedAvatar);
        return;
      }

      const localSrc = `/creators/${encodeURIComponent(clean)}.jpg`;
      const img = new window.Image();
      img.src = localSrc;

      img.onload = () => {
        if (!cancelled) setSrc(localSrc);
      };

      img.onerror = () => {
        if (!cancelled) setSrc(fallbackSrc);
      };
    }

    loadAvatar();

    return () => {
      cancelled = true;
    };
  }, [clean]);

  const sizeClass =
    size === "large"
      ? "h-20 w-20"
      : size === "medium"
        ? "h-14 w-14"
        : size === "tiny"
          ? "h-9 w-9"
          : "h-11 w-11";

  const textSize =
    size === "large"
      ? "text-lg"
      : size === "medium"
        ? "text-sm"
        : "text-xs";

  return (
    <div className="relative shrink-0">
      {captain && (
        <>
          <div className="absolute inset-[-7px] animate-pulse rounded-full bg-yellow-300/60 blur-md" />
          <div className="absolute inset-[-3px] rounded-full border-2 border-yellow-200 shadow-[0_0_18px_rgba(250,204,21,0.95)]" />
        </>
      )}

      <div
        className={`relative grid ${sizeClass} place-items-center overflow-hidden rounded-full border-2 ${
          captain
            ? "border-yellow-200 bg-yellow-400/20"
            : "border-white/80 bg-[#07314a]"
        } shadow-lg`}
      >
        {failed || !src ? (
          <span className={`font-black text-white ${textSize}`}>
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
  );
}

function CountryFlag({
  country,
  size = "normal",
}: {
  country: string;
  size?: "normal" | "small";
}) {
  const flagSize = size === "small" ? "h-10 w-10" : "h-12 w-12";
  const stripeThin = size === "small" ? "h-2.5" : "h-3";
  const stripeThick = size === "small" ? "h-5" : "h-6";

  if (country === "France") {
    return (
      <div className={`grid ${flagSize} grid-cols-3 overflow-hidden rounded-full shadow-lg`}>
        <div className="bg-[#002654]" />
        <div className="bg-white" />
        <div className="bg-[#ED2939]" />
      </div>
    );
  }

  if (country === "Germany") {
    return (
      <div className={`grid ${flagSize} grid-rows-3 overflow-hidden rounded-full shadow-lg`}>
        <div className="bg-black" />
        <div className="bg-[#DD0000]" />
        <div className="bg-[#FFCE00]" />
      </div>
    );
  }

  if (country === "Netherlands") {
    return (
      <div className={`grid ${flagSize} grid-rows-3 overflow-hidden rounded-full shadow-lg`}>
        <div className="bg-[#AE1C28]" />
        <div className="bg-white" />
        <div className="bg-[#21468B]" />
      </div>
    );
  }

  if (country === "Spain") {
    return (
      <div className={`grid ${flagSize} overflow-hidden rounded-full shadow-lg`}>
        <div className={`${stripeThin} bg-[#AA151B]`} />
        <div className={`${stripeThick} bg-[#F1BF00]`} />
        <div className={`${stripeThin} bg-[#AA151B]`} />
      </div>
    );
  }

  if (country === "Argentina") {
    return (
      <div className={`grid ${flagSize} grid-rows-3 overflow-hidden rounded-full shadow-lg`}>
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
      <div className={`relative ${flagSize} overflow-hidden rounded-full bg-white shadow-lg`}>
        <div className="absolute left-1/2 top-0 h-full w-2 -translate-x-1/2 bg-[#C8102E]" />
        <div className="absolute left-0 top-1/2 h-2 w-full -translate-y-1/2 bg-[#C8102E]" />
      </div>
    );
  }

  if (country === "Portugal") {
    return (
      <div className={`relative flex ${flagSize} overflow-hidden rounded-full shadow-lg`}>
        <div className="w-[42%] bg-[#006600]" />
        <div className="flex-1 bg-[#FF0000]" />
        <div className="absolute left-[34%] top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-[#FFCC00]" />
      </div>
    );
  }

  return (
    <div className={`relative ${flagSize} overflow-hidden rounded-full bg-[#009739] shadow-lg`}>
      <div className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[#FEDD00]" />
      <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#012169]" />
    </div>
  );
}

function FullTeamDropdown({ team }: { team: Team }) {
  const sortedCreators = sortCreators(team.creators);

  return (
    <div className="px-3 pb-4">
      <div className="rounded-2xl border border-cyan-200/15 bg-[#041a2b]/80 p-3">
        <p className="mb-3 text-center text-xs font-black uppercase tracking-[0.25em] text-cyan-100/60">
          Full Team
        </p>

        <div className="flex flex-col gap-2">
          {sortedCreators.map((creator, index) => (
            <div
              key={creator.username}
              className="flex w-full items-center gap-4 rounded-2xl border border-white/5 bg-white/5 px-4 py-3"
            >
              <CreatorAvatar
                username={creator.username}
                size="tiny"
                captain={index === 0}
              />

              <div className="min-w-0 flex-1">
                <p className="break-all text-sm font-black leading-tight text-white">
                  {creator.username}
                </p>

                {index === 0 && (
                  <p className="mt-0.5 text-[10px] font-black uppercase text-yellow-200">
                    Captain
                  </p>
                )}
              </div>

              <p className="shrink-0 text-sm font-black text-cyan-100/80">
                {formatDiamonds(creator.diamonds)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PodiumCard({ team, place }: { team: Team; place: number }) {
  const total = getTeamTotal(team);
  const sortedCreators = sortCreators(team.creators);
  const captain = sortedCreators[0];
  const second = sortedCreators[1];
  const third = sortedCreators[2];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${team.accent} bg-[#06324f]/95 text-center shadow-xl`}
    >
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${team.kit}`} />

      <div className="p-4">
        <div className="mb-2 flex justify-center">
          <CountryFlag country={team.country} />
        </div>

        <p className="truncate text-sm font-black uppercase text-white">
          Team {team.country}
        </p>

        <p className="mt-1 text-lg font-black text-cyan-200">
          {formatDiamonds(total)}
        </p>

        <div className="mt-3 flex items-start justify-center gap-0">
          {second && (
            <div className="-mr-2 flex min-w-0 flex-col items-center opacity-95">
              <CreatorAvatar username={second.username} size="tiny" />
              
              
            </div>
          )}

          <div className="z-10 flex min-w-0 flex-col items-center">
            <CreatorAvatar username={captain.username} size="medium" />
            
          </div>

          {third && (
            <div className="-ml-2 flex min-w-0 flex-col items-center opacity-95">
              <CreatorAvatar username={third.username} size="tiny" />
              
            </div>
          )}
        </div>
      </div>

      <div className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-xs font-black text-[#052f4a]">
        #{place}
      </div>
    </div>
  );
}

function TeamRow({ team, index }: { team: Team; index: number }) {
  const [open, setOpen] = useState(false);

  const total = getTeamTotal(team);
  const sortedCreators = sortCreators(team.creators);
  const captain = sortedCreators[0];
  const nextThree = sortedCreators.slice(1, 4);

  return (
    <div className="overflow-hidden border-b border-cyan-200/10 bg-[#052f4a]/85 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="grid min-h-[132px] w-full grid-cols-[78px_minmax(0,1fr)_82px_38px] items-center gap-3 px-4 py-5 text-left sm:min-h-[150px] sm:grid-cols-[95px_minmax(0,1fr)_120px_44px] sm:gap-5 sm:px-5 sm:py-6"
      >
        <div className="flex shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-cyan-200/10 bg-cyan-300/5 py-3">
          <div className="text-2xl font-black leading-none text-white sm:text-3xl">
            {index + 1}
          </div>

          <CountryFlag country={team.country} size="small" />
        </div>

        <div className="min-w-0">
          <h2 className="whitespace-normal break-words text-2xl font-black uppercase leading-tight text-white sm:text-3xl">
            Team {team.country}
          </h2>

          <div className="mt-4 flex min-w-0 items-center">
            <CreatorAvatar username={captain.username} size="medium" captain />

            <div className="ml-3 flex min-w-0 items-center">
              {nextThree.map((creator, avatarIndex) => (
                <div
                  key={creator.username}
                  className={avatarIndex === 0 ? "" : "-ml-2"}
                >
                  <CreatorAvatar username={creator.username} size="small" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="z-10 min-w-0 shrink-0 rounded-2xl bg-black/15 px-2 py-3 text-right sm:px-3">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100/45 sm:text-xs">
            Points
          </p>
          <p className="truncate text-3xl font-black leading-none text-white sm:text-4xl">
            {formatDiamonds(total)}
          </p>
          <p className="mt-1 text-[10px] font-bold text-cyan-100/45 sm:text-xs">
            {team.creators.length} players
          </p>
        </div>

        <div className="shrink-0 rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-3 text-cyan-100">
          <span
            className={`block text-xl leading-none transition-transform ${
              open ? "rotate-180" : ""
            }`}
          >
            ▼
          </span>
        </div>
      </button>

      {open && <FullTeamDropdown team={team} />}
    </div>
  );
}

export default function WorldCupPage() {
  const sortedTeams = useMemo(() => {
    return [...TEAMS].sort((a, b) => getTeamTotal(b) - getTeamTotal(a));
  }, []);

  const totalPlayers = useMemo(
    () => TEAMS.reduce((sum, team) => sum + team.creators.length, 0),
    []
  );

  return (
    <main className="min-h-dvh overflow-x-hidden bg-[#02111f] pb-16 text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,#00d5ff55,transparent_35%),radial-gradient(circle_at_bottom,#0077ff44,transparent_42%)]" />

      <section className="mx-auto max-w-3xl px-3 pt-4">
        <div className="overflow-hidden rounded-[1.7rem] border border-cyan-200/15 bg-[#05263d] shadow-2xl shadow-cyan-950/60">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={HERO_IMAGE}
              alt="Aqua World Cup"
              className="h-52 w-full object-cover object-center sm:h-60"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-[#05263d] via-transparent to-black/20" />
          </div>

          <div className="px-3 pb-5 pt-4 sm:px-4">
            <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-4">
              {sortedTeams.slice(1, 2).map((team) => (
                <PodiumCard key={team.id} team={team} place={2} />
              ))}

              {sortedTeams.slice(0, 1).map((team) => (
                <PodiumCard key={team.id} team={team} place={1} />
              ))}

              {sortedTeams.slice(2, 3).map((team) => (
                <PodiumCard key={team.id} team={team} place={3} />
              ))}
            </div>

            <div className="mb-4 rounded-2xl border border-cyan-200/15 bg-cyan-300/10 px-4 py-5 text-center">
  <p className="text-lg font-black uppercase tracking-[0.12em] text-cyan-100">
    1 Diamond = 1 Point
  </p>

  <p className="mt-1 text-sm font-black uppercase tracking-[0.12em] text-cyan-100/70">
    11th June – 19th June
  </p>
</div>

            <div className="mb-4 grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-white/10 px-3 py-4 text-center">
                <p className="text-xl font-black">{TEAMS.length}</p>
                <p className="text-[10px] font-black uppercase text-cyan-100/50">
                  Teams
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 px-3 py-4 text-center">
                <p className="text-xl font-black">{totalPlayers}</p>
                <p className="text-[10px] font-black uppercase text-cyan-100/50">
                  Creators
                </p>
              </div>

              <div className="rounded-2xl bg-yellow-300/20 px-3 py-4 text-center">
                <p className="text-xl font-black">15K</p>
                <p className="text-[10px] font-black uppercase text-yellow-100/70">
                  Prize
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-cyan-200/15 divide-y divide-cyan-200/10">
              {sortedTeams.map((team, index) => (
                <TeamRow key={team.id} team={team} index={index} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}