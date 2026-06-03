// app/api/tiktok-avatar-image/route.ts

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return new Response("Missing url", { status: 400 });
  }

  const imageRes = await fetch(url, {
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });

  const blob = await imageRes.blob();

  return new Response(blob, {
    headers: {
      "Content-Type": imageRes.headers.get("content-type") || "image/jpeg",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}