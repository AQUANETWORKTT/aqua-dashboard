"use client";

import { useRef, useState } from "react";
import * as htmlToImage from "html-to-image";

export default function BattleGeneratorPage() {
  const posterRef = useRef<HTMLDivElement>(null);

  const [paste, setPaste] = useState("");

  const [name1, setName1] = useState("ANNA_QUINNELL");
  const [name2, setName2] = useState("DRTY_GAMING7");

  const [date, setDate] = useState("TUESDAY 19TH MAY");
  const [time, setTime] = useState("8:00PM");

  const [image1, setImage1] = useState("");
  const [image2, setImage2] = useState("");

  function getTikTokUsername(url: string) {
    const match = url.match(/@([^/?]+)/);
    return match ? match[1].toUpperCase() : "";
  }

  function formatTime(raw: string) {
    if (!raw) return "";
    return raw.replace(":00", "") + ":00PM";
  }

  function readPaste() {
    const parts = paste.trim().split(/\t+/);

    setDate((parts[0] || "").toUpperCase());
    setName1((parts[1] || "").toUpperCase());
    setTime(formatTime(parts[5] || ""));
    setName2(getTikTokUsername(parts[6] || ""));
  }

  function handleImageUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (value: string) => void
  ) {
    const file = e.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      setter(reader.result as string);
    };

    reader.readAsDataURL(file);
  }

  async function downloadPoster() {
    if (!posterRef.current) return;

    try {
      const dataUrl = await htmlToImage.toJpeg(posterRef.current, {
        quality: 0.95,
        cacheBust: true,
        pixelRatio: 2,
        skipFonts: true,
      });

      const link = document.createElement("a");
      link.download = `${name1}-vs-${name2}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("DOWNLOAD ERROR:", err);
      alert("Failed to download poster.");
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <h1 className="text-3xl font-black mb-6">
        Aqua Battle Poster Generator
      </h1>

      <textarea
        value={paste}
        onChange={(e) => setPaste(e.target.value)}
        placeholder="Paste spreadsheet row here"
        className="w-full max-w-5xl h-28 bg-white text-black p-3 rounded mb-4"
      />

      <div className="flex gap-3 mb-6">
        <button
          type="button"
          onClick={readPaste}
          className="bg-cyan-400 hover:bg-cyan-300 transition text-black font-black px-6 py-3 rounded cursor-pointer"
        >
          Read Row
        </button>

        <button
          type="button"
          onClick={downloadPoster}
          className="bg-yellow-400 hover:bg-yellow-300 transition text-black font-black px-6 py-3 rounded cursor-pointer"
        >
          Download Poster
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-5xl mb-6">
        <input
          value={name1}
          onChange={(e) => setName1(e.target.value.toUpperCase())}
          className="bg-white text-black p-3 rounded"
          placeholder="Left name"
        />

        <input
          value={name2}
          onChange={(e) => setName2(e.target.value.toUpperCase())}
          className="bg-white text-black p-3 rounded"
          placeholder="Right name"
        />

        <input
          value={date}
          onChange={(e) => setDate(e.target.value.toUpperCase())}
          className="bg-white text-black p-3 rounded"
          placeholder="Date"
        />

        <input
          value={time}
          onChange={(e) => setTime(e.target.value.toUpperCase())}
          className="bg-white text-black p-3 rounded"
          placeholder="Time"
        />

        <label className="bg-white text-black p-3 rounded">
          Left photo
          <input
            type="file"
            accept="image/*"
            className="block mt-2"
            onChange={(e) => handleImageUpload(e, setImage1)}
          />
        </label>

        <label className="bg-white text-black p-3 rounded">
          Right photo
          <input
            type="file"
            accept="image/*"
            className="block mt-2"
            onChange={(e) => handleImageUpload(e, setImage2)}
          />
        </label>
      </div>

      <div className="scale-[0.35] origin-top-left">
        <div
          ref={posterRef}
          className="relative w-[1080px] h-[1920px] overflow-hidden bg-black"
        >
          {/* BACKGROUND */}
          <img
            src="/posters/aqua-battle/background.png"
            className="absolute inset-0 w-full h-full"
          />

          {/* LEFT PHOTO */}
          {image1 && (
            <img
              src={image1}
              className="absolute left-[97px] top-[616px] w-[336px] h-[336px] rounded-full object-cover"
            />
          )}

          {/* RIGHT PHOTO */}
          {image2 && (
            <img
              src={image2}
              className="absolute left-[664px] top-[622px] w-[340px] h-[340px] rounded-full object-cover"
            />
          )}

          {/* LEFT NAME */}
          <div className="absolute left-[50px] top-[1000px] w-[420px] text-center text-cyan-100 text-[30px] font-black tracking-wide drop-shadow-[3px_3px_0px_black]">
            {name1}
          </div>

          {/* RIGHT NAME */}
          <div className="absolute left-[610px] top-[1005px] w-[430px] text-center text-cyan-100 text-[30px] font-black tracking-wide drop-shadow-[3px_3px_0px_black]">
            {name2}
          </div>

          {/* DATE */}
          <div className="absolute top-[1100px] left-0 w-full text-center text-cyan-100 text-[75px] font-black tracking-wide drop-shadow-[4px_4px_0px_black]">
            {date}
          </div>

          {/* TIME */}
          <div className="absolute top-[1200px] left-0 w-full text-center text-cyan-100 text-[82px] font-black tracking-wide drop-shadow-[4px_4px_0px_black]">
            {time}
          </div>
        </div>
      </div>
    </div>
  );
}