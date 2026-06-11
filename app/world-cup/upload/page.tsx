"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";

type PreviewRow = {
  score_date: string;
  creator_username: string;
  diamonds: number;
};

function cleanUsername(value: unknown) {
  return String(value || "")
    .trim()
    .replace(/^@/, "")
    .toLowerCase();
}

function toNumber(value: unknown) {
  const num = Number(String(value || "").replace(/,/g, ""));
  return Number.isFinite(num) ? num : 0;
}

export default function WorldCupUploadPage() {
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [uploadDate, setUploadDate] = useState("");
  const [status, setStatus] = useState("");

  const totalDiamonds = useMemo(
    () => rows.reduce((sum, row) => sum + row.diamonds, 0),
    [rows]
  );

  async function handleFile(file: File) {
    setStatus("");

    if (!uploadDate) {
      setStatus("Please select the World Cup date first.");
      return;
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const json = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
    });

    const parsed = json
      .slice(1)
      .map((row) => ({
        score_date: uploadDate,
        creator_username: cleanUsername(row[2]),
        diamonds: toNumber(row[7]),
      }))
      .filter((row) => row.creator_username);

    setRows(parsed);
    setStatus(`Loaded ${parsed.length} rows for ${uploadDate}`);
  }

  async function uploadRows() {
    if (!uploadDate) {
      setStatus("Please select a date first.");
      return;
    }

    if (rows.length === 0) {
      setStatus("No rows loaded. Select a date, then upload the Excel file.");
      return;
    }

    setStatus("Uploading...");

    const res = await fetch("/api/world-cup/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ rows }),
    });

    const data = await res.json();

    if (!res.ok) {
      setStatus(data.error || "Upload failed");
      return;
    }

    setStatus(`Uploaded ${data.count} World Cup scores for ${uploadDate}`);
  }

  return (
    <main className="min-h-dvh bg-[#02111f] px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl rounded-[2rem] border border-cyan-200/15 bg-[#05263d] p-5 shadow-2xl shadow-cyan-950/60">
        <div className="mb-6 rounded-3xl bg-cyan-300/10 p-5 text-center">
          <h1 className="text-3xl font-black uppercase tracking-wide text-cyan-100">
            World Cup Upload
          </h1>
          <p className="mt-2 text-sm font-bold text-cyan-100/70">
            Upload one daily export. Only creator username and diamonds are used.
          </p>
        </div>

        <div className="mb-5 grid gap-4 rounded-3xl border border-cyan-200/15 bg-white/5 p-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-cyan-100/60">
              Upload Date
            </label>
            <input
              type="date"
              value={uploadDate}
              onChange={(e) => {
                setUploadDate(e.target.value);
                setRows([]);
                setStatus("");
              }}
              className="w-full rounded-2xl border border-cyan-200/20 bg-[#02111f] px-4 py-3 font-bold text-white outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-cyan-100/60">
              Daily Export File
            </label>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
              className="w-full rounded-2xl border border-cyan-200/20 bg-[#02111f] px-4 py-3 font-bold text-white"
            />
          </div>
        </div>

        {status && (
          <div className="mb-5 rounded-2xl border border-yellow-200/20 bg-yellow-300/10 px-4 py-3 text-center font-black text-yellow-100">
            {status}
          </div>
        )}

        <button
          onClick={uploadRows}
          className="mb-5 w-full rounded-2xl bg-cyan-300 px-5 py-4 text-lg font-black uppercase text-[#02111f] shadow-lg"
        >
          Upload World Cup Scores
        </button>

        {rows.length > 0 && (
          <>
            <div className="mb-5 grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-white/10 px-3 py-4 text-center">
                <p className="text-xl font-black">{uploadDate}</p>
                <p className="text-[10px] font-black uppercase text-cyan-100/50">
                  Date
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 px-3 py-4 text-center">
                <p className="text-xl font-black">{rows.length}</p>
                <p className="text-[10px] font-black uppercase text-cyan-100/50">
                  Creators
                </p>
              </div>

              <div className="rounded-2xl bg-cyan-300/10 px-3 py-4 text-center">
                <p className="text-xl font-black">
                  {totalDiamonds.toLocaleString()}
                </p>
                <p className="text-[10px] font-black uppercase text-cyan-100/50">
                  Diamonds
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-cyan-200/15">
              <table className="w-full border-collapse text-left">
                <thead className="bg-cyan-300/10">
                  <tr>
                    <th className="px-4 py-3 text-xs font-black uppercase text-cyan-100/70">
                      Date
                    </th>
                    <th className="px-4 py-3 text-xs font-black uppercase text-cyan-100/70">
                      Creator
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-black uppercase text-cyan-100/70">
                      Diamonds
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row, index) => (
                    <tr
                      key={`${row.score_date}-${row.creator_username}-${index}`}
                      className="border-t border-cyan-200/10 bg-white/5"
                    >
                      <td className="px-4 py-3 text-sm font-bold text-white/80">
                        {row.score_date}
                      </td>
                      <td className="px-4 py-3 text-sm font-black text-white">
                        {row.creator_username}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-black text-cyan-100">
                        {row.diamonds.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </main>
  );
}