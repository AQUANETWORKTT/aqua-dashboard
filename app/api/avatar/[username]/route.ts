import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  const { username } = await context.params;

  try {
    // Fetch TikTok profile page
    const html = await fetch(`https://www.tiktok.com/@${username}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      cache: "no-store",
    }).then((r) => r.text());

    // Extract avatar URL from page HTML
    const match = html.match(/"avatarLarger":"([^"]+)"/);

    if (!match) {
      console.warn(`No avatar found for @${username}`);
      return NextResponse.redirect("/default-avatar.png");
    }

    // Clean TikTok escape codes
    const avatarUrl = match[1].replace(/\\u0026/g, "&");

    // Fetch avatar image directly
    const avatarRes = await fetch(avatarUrl);

    if (!avatarRes.ok) {
      console.warn(`Failed downloading avatar for @${username}`);
      return NextResponse.redirect("/default-avatar.png");
    }

    const buffer = await avatarRes.arrayBuffer();

    // Return image buffer as response
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400", // Cache for 1 day
      },
    });

  } catch (err) {
    console.error(`Avatar fetch error for @${username}`, err);
    return NextResponse.redirect("/default-avatar.png");
  }
}
