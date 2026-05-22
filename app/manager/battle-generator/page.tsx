"use client";

import { useRef, useState } from "react";
import * as htmlToImage from "html-to-image";
import JSZip from "jszip";
import { saveAs } from "file-saver";

type Battle = {
  id: string;
  date: string;
  manager: string;
  name1: string;
  name2: string;
  time: string;
  image1: string;
  image2: string;
};

export default function BattleGeneratorPage() {
  const posterRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [paste, setPaste] = useState("");
  const [battles, setBattles] = useState<Battle[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedBattle = battles.find((b) => b.id === selectedId) || null;

  function getTikTokUsername(url: string) {
    const match = url.match(/@([^/?]+)/);
    return match ? match[1].toLowerCase() : "";
  }

  function formatTime(raw: string) {
    if (!raw) return "";
    return raw.replace(":00", "") + ":00PM";
  }

  function cleanFileName(value: string) {
    return value
      .replaceAll(" ", "-")
      .replaceAll("/", "-")
      .replaceAll(":", "-")
      .replaceAll("—", "-");
  }

  function updateBattle(id: string, changes: Partial<Battle>) {
    setBattles((prev) =>
      prev.map((battle) =>
        battle.id === id ? { ...battle, ...changes } : battle
      )
    );
  }

  function uploadImageFile(
    file: File,
    id: string,
    field: "image1" | "image2"
  ) {
    const reader = new FileReader();

    reader.onload = () => {
      updateBattle(id, { [field]: reader.result as string });
    };

    reader.readAsDataURL(file);
  }

  function handleImageUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    id: string,
    field: "image1" | "image2"
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    uploadImageFile(file, id, field);
  }

  function handleDrop(
    e: React.DragEvent<HTMLDivElement>,
    id: string,
    field: "image1" | "image2"
  ) {
    e.preventDefault();

    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    uploadImageFile(file, id, field);
  }

  async function fetchTikTokAvatar(username: string) {
    if (!username) return "";

    try {
      const res = await fetch("/api/tiktok-avatar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username }),
      });

      const json = await res.json();
      return json.avatar || "";
    } catch {
      return "";
    }
  }

  async function readRows() {
    setLoading(true);

    const rows = paste
      .split("\n")
      .map((row) => row.trim())
      .filter((row) => row.length > 0)
      .filter((row) => row.includes("tiktok.com"));

    const parsed: Battle[] = [];

    for (const row of rows) {
      const parts = row.split(/\t+/);

      const date = (parts[0] || "").toUpperCase();
      const name1Raw = (parts[1] || "").toLowerCase();
      const manager = (parts[2] || "UNKNOWN").toUpperCase();
      const name2Raw = getTikTokUsername(parts[6] || "");
      const time = formatTime(parts[7] || "");

      const image1 = await fetchTikTokAvatar(name1Raw);
      const image2 = await fetchTikTokAvatar(name2Raw);

      parsed.push({
        id: crypto.randomUUID(),
        date,
        manager,
        name1: name1Raw.toUpperCase(),
        name2: name2Raw.toUpperCase(),
        time,
        image1,
        image2,
      });
    }

    setBattles(parsed);
    setSelectedId(parsed[0]?.id || "");
    setLoading(false);
  }

  async function makePosterBlob(battle: Battle) {
    const node = posterRefs.current[battle.id];
    if (!node) return null;

    const dataUrl = await htmlToImage.toJpeg(node, {
      quality: 0.95,
      cacheBust: true,
      pixelRatio: 2,
      skipFonts: true,
    });

    return await fetch(dataUrl).then((res) => res.blob());
  }

  function getPosterFileName(battle: Battle) {
    return cleanFileName(
      `${battle.date}-${battle.time}-${battle.name1}-vs-${battle.name2}.jpg`
    );
  }

  async function downloadAllPosters() {
    const zip = new JSZip();

    for (const battle of battles) {
      const blob = await makePosterBlob(battle);
      if (!blob) continue;

      const managerFolder = zip.folder(battle.manager || "UNKNOWN");
      managerFolder?.file(getPosterFileName(battle), blob);
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    saveAs(zipBlob, "Aqua-Battle-Posters.zip");
  }

  async function saveAllToFolder() {
    try {
      setSaving(true);

      const picker = window as typeof window & {
        showDirectoryPicker?: () => Promise<any>;
      };

      if (!picker.showDirectoryPicker) {
        alert(
          "Save to Folder only works in Chrome or Edge. Use Download ZIP instead."
        );
        return;
      }

      const rootHandle = await picker.showDirectoryPicker();

      for (const battle of battles) {
        const blob = await makePosterBlob(battle);
        if (!blob) continue;

        const managerHandle = await rootHandle.getDirectoryHandle(
          battle.manager || "UNKNOWN",
          { create: true }
        );

        const fileHandle = await managerHandle.getFileHandle(
          getPosterFileName(battle),
          { create: true }
        );

        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
      }

      alert("Posters saved into manager folders.");
    } catch (err) {
      console.error("SAVE TO FOLDER ERROR:", err);
      alert("Save cancelled or failed.");
    } finally {
      setSaving(false);
    }
  }

  function DropPhotoBox({
    battle,
    field,
    label,
  }: {
    battle: Battle;
    field: "image1" | "image2";
    label: string;
  }) {
    const inputId = `${battle.id}-${field}`;

    return (
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleDrop(e, battle.id, field)}
        className="rounded-lg border-2 border-dashed border-cyan-300/40 bg-black/45 p-4 text-center hover:border-cyan-300 transition"
      >
        <p className="text-[#5CEEFF] font-black uppercase text-sm tracking-widest">
          {label}
        </p>

        <p className="text-white/45 text-xs mt-2">
          Drag photo here or click to choose
        </p>

        <label
          htmlFor={inputId}
          className="mt-3 inline-block cursor-pointer bg-cyan-300 text-black font-black px-4 py-2 rounded uppercase text-xs"
        >
          Choose Image
        </label>

        <input
          id={inputId}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleImageUpload(e, battle.id, field)}
        />
      </div>
    );
  }

  function PosterPreview({
    battle,
    scale = 0.3,
  }: {
    battle: Battle;
    scale?: number;
  }) {
    return (
      <div className="w-[324px] h-[576px] overflow-hidden mx-auto bg-black rounded-lg">
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <div
            ref={(el) => {
              posterRefs.current[battle.id] = el;
            }}
            className="relative w-[1080px] h-[1920px] overflow-hidden bg-black"
          >
            <img
              src="/posters/aqua-battle/background.png"
              className="absolute inset-0 w-full h-full"
            />

            {battle.image1 && (
              <img
                src={battle.image1}
                className="absolute left-[97px] top-[616px] w-[336px] h-[336px] rounded-full object-cover"
              />
            )}

            {battle.image2 && (
              <img
                src={battle.image2}
                className="absolute left-[664px] top-[622px] w-[340px] h-[340px] rounded-full object-cover"
              />
            )}

            <div className="absolute left-[50px] top-[1000px] w-[420px] text-center text-cyan-100 text-[30px] font-black tracking-wide drop-shadow-[3px_3px_0px_black]">
              {battle.name1}
            </div>

            <div className="absolute left-[610px] top-[1005px] w-[430px] text-center text-cyan-100 text-[30px] font-black tracking-wide drop-shadow-[3px_3px_0px_black]">
              {battle.name2}
            </div>

            <div className="absolute top-[1100px] left-0 w-full text-center text-cyan-100 text-[75px] font-black tracking-wide drop-shadow-[4px_4px_0px_black]">
              {battle.date}
            </div>

            <div className="absolute top-[1200px] left-0 w-full text-center text-cyan-100 text-[82px] font-black tracking-wide drop-shadow-[4px_4px_0px_black]">
              {battle.time}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#02080d] text-white p-8">
      <div className="grid grid-cols-1 xl:grid-cols-[460px_1fr] gap-8 items-start">
        <section className="space-y-6">
          <h1 className="text-[#5CEEFF] text-3xl font-black tracking-[0.18em] uppercase">
            Aqua Battle Poster Generator
          </h1>

          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder="Paste all battle rows here"
            className="w-full h-72 bg-black/40 border border-white/20 text-white p-5 rounded-lg text-sm outline-none focus:border-cyan-300"
          />

          <div className="grid grid-cols-3 gap-4">
            <button
              type="button"
              onClick={readRows}
              className="bg-[#5CEEFF] hover:bg-cyan-300 transition text-black font-black px-4 py-5 rounded-lg cursor-pointer uppercase tracking-widest"
            >
              {loading ? "Loading..." : "Read Rows"}
            </button>

            <button
              type="button"
              onClick={downloadAllPosters}
              disabled={battles.length === 0}
              className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 transition text-black font-black px-4 py-5 rounded-lg cursor-pointer uppercase tracking-widest"
            >
              Download ZIP
            </button>

            <button
              type="button"
              onClick={saveAllToFolder}
              disabled={battles.length === 0 || saving}
              className="bg-green-400 hover:bg-green-300 disabled:opacity-40 transition text-black font-black px-4 py-5 rounded-lg cursor-pointer uppercase tracking-widest"
            >
              {saving ? "Saving..." : "Save Folder"}
            </button>
          </div>

          <div className="bg-black/35 border border-white/15 rounded-lg p-5">
            <p className="text-white/70 text-sm">
              Posters generated:{" "}
              <span className="text-[#5CEEFF] font-black">
                {battles.length}
              </span>
            </p>

            <p className="text-white/50 text-xs mt-2">
              Save Folder creates manager folders directly. Download ZIP is the
              backup option.
            </p>
          </div>

          {selectedBattle && (
            <div className="bg-black/35 border border-cyan-300/25 rounded-lg p-5 space-y-4">
              <h2 className="text-[#5CEEFF] font-black uppercase tracking-widest">
                Selected Poster Editor
              </h2>

              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full bg-black/50 border border-white/20 text-white p-3 rounded"
              >
                {battles.map((battle) => (
                  <option key={battle.id} value={battle.id}>
                    {battle.manager} — {battle.name1} VS {battle.name2}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-3">
                <DropPhotoBox
                  battle={selectedBattle}
                  field="image1"
                  label="Left photo"
                />

                <DropPhotoBox
                  battle={selectedBattle}
                  field="image2"
                  label="Right photo"
                />
              </div>
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 2xl:grid-cols-2 gap-x-28 gap-y-16">
          {battles.map((battle) => (
            <button
              key={battle.id}
              type="button"
              onClick={() => setSelectedId(battle.id)}
              className={`bg-black/30 p-4 rounded-xl text-left border transition ${
                selectedId === battle.id
                  ? "border-cyan-300"
                  : "border-transparent hover:border-white/25"
              }`}
            >
              <div className="text-xs text-cyan-200 font-black mb-3">
                {battle.manager} • {battle.name1} VS {battle.name2}
              </div>

              <PosterPreview battle={battle} />
            </button>
          ))}
        </section>
      </div>
    </div>
  );
}