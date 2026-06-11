import { NextResponse } from "next/server";
import { submissionsSupabase } from "@/lib/submissions-supabase";

export const dynamic = "force-dynamic";

type UploadRow = {
  score_date: string;
  creator_username: string;
  diamonds: number;
};

export async function GET() {
  const { data, error } = await submissionsSupabase
    .from("world_cup_scores")
    .select("creator_username, diamonds");

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  const totals: Record<string, number> = {};

  for (const row of data ?? []) {
    const username = String(row.creator_username || "")
      .trim()
      .replace(/^@/, "")
      .toLowerCase();

    totals[username] =
      (totals[username] || 0) +
      Number(row.diamonds || 0);
  }

  return NextResponse.json(totals);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rows = body.rows as UploadRow[];

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "No rows provided" },
        { status: 400 }
      );
    }

    const cleanRows = rows
      .map((row) => ({
        score_date: row.score_date,
        creator_username: String(row.creator_username || "")
          .trim()
          .replace(/^@/, "")
          .toLowerCase(),
        diamonds: Number(row.diamonds || 0),
      }))
      .filter(
        (row) => row.score_date && row.creator_username
      );

    const { error } = await submissionsSupabase
      .from("world_cup_scores")
      .upsert(cleanRows, {
        onConflict: "score_date,creator_username",
      });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: cleanRows.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Upload failed",
      },
      { status: 500 }
    );
  }
}