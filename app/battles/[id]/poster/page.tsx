"use client";

import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";

export default function BattlePoster({ params }: { params: { id: string } }) {
  const [battle, setBattle] = useState<any>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/battle/${params.id}`)
      .then(res => res.json())
      .then(setBattle);
  }, []);

  if (!battle) return <p>Loading...</p>;

  async function download() {
    if (!ref.current) return;

    const dataUrl = await toPng(ref.current);
    const link = document.createElement("a");
    link.download = `${battle.id}.png`;
    link.href = dataUrl;
    link.click();
  }

  return (
    <div className="flex flex-col items-center p-6 text-white">
      <div
        ref={ref}
        style={{
          width: "1080px",
          height: "1920px",
          position: "relative",
          background: "radial-gradient(circle at top, #05273a 0, #02040a 45%, #010208 100%)",
          padding: "60px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {/* TOP LABEL */}
        <div style={{
          alignSelf: "center",
          padding: "10px 22px",
          borderRadius: "999px",
          border: "1px solid #2de0ff55",
          background: "rgba(0,0,0,0.3)",
          textTransform: "uppercase",
          fontSize: "24px"
        }}>
          Arranged Battle · Aqua Agency 🐬
        </div>

        {/* MAIN CONTENT */}
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center" }}>

          {/* LEFT PERSON */}
          <div style={{ textAlign: "left" }}>
            <img src={battle.left.image} style={{ width: "450px", borderRadius: "20px" }} />
            <div style={{ fontSize: "60px", fontWeight: "900" }}>{battle.left.name}</div>
            <div style={{ opacity: 0.8, fontSize: "30px" }}>@{battle.left.handle}</div>
          </div>

          {/* VS */}
          <div style={{
            width: "220px",
            height: "220px",
            borderRadius: "50%",
            border: "3px solid #2de0ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "70px",
            fontWeight: "900"
          }}>
            VS
          </div>

          {/* RIGHT PERSON */}
          <div style={{ textAlign: "right" }}>
            <img src={battle.right.image} style={{ width: "450px", borderRadius: "20px" }} />
            <div style={{ fontSize: "60px", fontWeight: "900" }}>{battle.right.name}</div>
            <div style={{ opacity: 0.8, fontSize: "30px" }}>@{battle.right.handle}</div>
          </div>

        </div>

        {/* FOOTER */}
        <div style={{ textAlign: "center", fontSize: "40px" }}>
          <div style={{ letterSpacing: "0.16em" }}>{battle.date}</div>
          <div style={{ fontSize: "55px", fontWeight: "900" }}>{battle.time}</div>
        </div>
      </div>

      <button onClick={download} className="mt-6 p-3 bg-cyan-500 rounded">
        Download Poster
      </button>
    </div>
  );
}
