import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ADJUST_FILE = path.join(process.cwd(), "data", "points-adjustments.json");

type AdjustmentsMap = {
  [username: string]: number;
};

function loadAdjustments(): AdjustmentsMap {
  try {
    if (!fs.existsSync(ADJUST_FILE)) {
      fs.writeFileSync(ADJUST_FILE, JSON.stringify({}, null, 2), "utf8");
      return {};
    }
    const raw = fs.readFileSync(ADJUST_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as AdjustmentsMap;
    return {};
  } catch {
    return {};
  }
}

function saveAdjustments(map: AdjustmentsMap) {
  fs.writeFileSync(ADJUST_FILE, JSON.stringify(map, null, 2), "utf8");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const username = url.searchParams.get("username");

  const data = loadAdjustments();

  if (username) {
    const adjustment = data[username] ?? 0;
    return NextResponse.json({ username, adjustment });
  }

  return NextResponse.json(data);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const username = String(body.username || "").trim();
    const deltaRaw = body.delta;

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    const deltaNum = Number(deltaRaw);
    if (!Number.isFinite(deltaNum) || deltaNum === 0) {
      return NextResponse.json(
        { error: "Delta must be a non-zero number" },
        { status: 400 }
      );
    }

    const data = loadAdjustments();
    const current = data[username] ?? 0;
    const next = current + deltaNum;

    data[username] = next;
    saveAdjustments(data);

    return NextResponse.json({
      username,
      previousAdjustment: current,
      newAdjustment: next,
      appliedDelta: deltaNum,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
