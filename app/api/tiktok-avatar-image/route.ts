// app/api/tiktok-avatar-image/route.ts

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return new Response("Missing url", { status: 400 });
  }

  try {
    const imageRes = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Accept-Language": "en-GB,en;q=0.9",
        Referer: "https://www.tiktok.com/",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });

    if (!imageRes.ok) {
      return Response.redirect(new URL("/creators/default.jpg", req.url), 302);
    }

    const blob = await imageRes.blob();

    return new Response(blob, {
      headers: {
        "Content-Type": imageRes.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
  } catch {
    return Response.redirect(new URL("/creators/default.jpg", req.url), 302);
  }
}
