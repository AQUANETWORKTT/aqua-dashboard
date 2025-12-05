import { NextResponse } from "next/server";

// GET /api/battle/[id]
export async function GET(
  req: Request,
  context: { params: { id: string } }
) {
  const { id } = context.params;

  return NextResponse.json({
    id,
    message: "Battle fetched successfully",
  });
}

// DELETE /api/battle/[id]
export async function DELETE(
  req: Request,
  context: { params: { id: string } }
) {
  const { id } = context.params;

  // Here you would delete the battle file, DB entry, etc.
  return NextResponse.json({
    success: true,
    deleted: id,
  });
}
