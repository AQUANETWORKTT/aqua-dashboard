import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: any) {
  const username = params.username;

  try {
    const html = await fetch(`https://www.tiktok.com/@${username}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0 Safari/537.36",
      },
    }).then((r) => r.text());

    // Extract avatar URL from JSON blob
    const match = html.match(/"avatarLarger":"([^"]+)"/);

    if (!match) {
      console.log("No avatar found for: ", username);
      return NextResponse.redirect("/default-avatar.png");
    }

    const avatarUrl = match[1].replace(/\\u0026/g, "&");

    // Return the actual image
    const image = await fetch(avatarUrl);
    const buffer = await image.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400", // 1 day cache
      },
    });
  } catch (err) {
    console.error("Avatar fetch error for:", username, err);
    return NextResponse.redirect("/default-avatar.png");
  }
}
