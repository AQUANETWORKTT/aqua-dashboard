import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export async function POST(req: Request) {
  const form = await req.formData();

  const id = "battle-" + Date.now();

  const leftName = form.get("leftName") as string;
  const leftHandle = form.get("leftHandle") as string;
  const rightName = form.get("rightName") as string;
  const rightHandle = form.get("rightHandle") as string;
  const date = form.get("date") as string;
  const time = form.get("time") as string;

  const leftImage = form.get("leftImage") as File | null;
  const rightImage = form.get("rightImage") as File | null;

  const uploadDir = path.join(process.cwd(), "public/uploads");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

  let leftImagePath = "";
  let rightImagePath = "";

  if (leftImage) {
    const bytes = Buffer.from(await leftImage.arrayBuffer());
    leftImagePath = `/uploads/${id}-left.png`;
    fs.writeFileSync(path.join("public", leftImagePath), bytes);
  }

  if (rightImage) {
    const bytes = Buffer.from(await rightImage.arrayBuffer());
    rightImagePath = `/uploads/${id}-right.png`;
    fs.writeFileSync(path.join("public", rightImagePath), bytes);
  }

  const battleData = {
    id,
    left: {
      name: leftName,
      handle: leftHandle,
      image: leftImagePath,
    },
    right: {
      name: rightName,
      handle: rightHandle,
      image: rightImagePath,
    },
    date,
    time
  };

  fs.writeFileSync(
    path.join(process.cwd(), "data/battles", `${id}.json`),
    JSON.stringify(battleData, null, 2)
  );

  return NextResponse.json({ success: true, id });
}
