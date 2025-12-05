import { NextRequest, NextResponse } from "next/server";

// GET /api/battle/[id]
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  return NextResponse.json({
    id,
    message: "Battle fetched successfully",
  });
}

// DELETE /api/battle/[id]
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  return NextResponse.json({
    success: true,
    deleted: id,
  });
}
