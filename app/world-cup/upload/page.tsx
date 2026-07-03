"use client";

import { useMemo, useRef, useState } from "react";
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
  const num = Number(String(value || "").replace(/,/g, "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(num) ? num : 0;
}

function findColumnIndex(headers: unknown[], possibleNames: string[]) {
  const cleanHeaders = headers.map((h) =>
    String(h || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
  );

  for (const name of possibleNames) {
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const index = cleanHeaders.findIndex((h) => h === cleanName || h.includes(cleanName));
    if (index !== -1) return index;
  }

  return -1;
}

export default function WorldCupUploadPage() {
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [uploadDate, setUploadDate] = useState("");
  const [status, setStatus] = useState("");
  const [debugRows, setDebugRows] = useState<unknown[][]>([]);
  const [selectedFileName, setSelectedFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const totalDiamonds = useMemo(
    () => rows.reduce((sum, row) => sum + row.diamonds, 0),
    [rows]
  );

  async function handleFile(file: File) {
    setRows([]);
    setDebugRows([]);
    setStatus("");
    setSelectedFileName(file.name);

    if (!uploadDate) {
      setStatus("Please select the World Cup date first.");
      setSelectedFileName("");
      return;
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
    });

    setDebugRows(rawRows.slice(0, 8));

    const headerIndex = rawRows.findIndex((row) =>
      row.some((cell) =>
        String(cell || "")
          .toLowerCase()
          .includes("creator")
      ) &&
      row.some((cell) =>
        String(cell || "")
          .toLowerCase()
          .includes("diamond")
      )
    );

    if (headerIndex === -1) {
      setStatus("Could not find the header row. Check the preview below.");
      return;
    }

    const headers = rawRows[headerIndex];

    const usernameIndex = findColumnIndex(headers, [
      "Creator's username",
      "Creator username",
      "Username",
      "Creator",
    ]);

    const diamondsIndex = findColumnIndex(headers, [
      "Diamonds",
      "Diamond",
      "Diamonds earned",
      "Total diamonds",
    ]);

    if (usernameIndex === -1 || diamondsIndex === -1) {
      setStatus(
        `Could not find columns. Username column: ${usernameIndex}, Diamonds column: ${diamondsIndex}. Check the preview below.`
      );
      return;
    }

    const parsed = rawRows
      .slice(headerIndex + 1)
      .map((row) => ({
        score_date: uploadDate,
        creator_username: cleanUsername(row[usernameIndex]),
        diamonds: toNumber(row[diamondsIndex]),
      }))
      .filter((row) => row.creator_username);

    setRows(parsed);
    setStatus(
      `Loaded ${parsed.length} rows for ${uploadDate}. Username column ${usernameIndex + 1}, diamonds column ${diamondsIndex + 1}.`
    );
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

    try {
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
    } catch (error) {
      console.error(error);
      setStatus("Upload failed");
    }
  }

  function removeSelectedFile() {
    setRows([]);
    setDebugRows([]);
    setSelectedFileName("");
    setStatus("");
    if (fileInputRef.current) fileInputRef.current.value = "";
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
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
              className="w-full rounded-2xl border border-cyan-200/20 bg-[#02111f] px-4 py-3 font-bold text-white"
            />
            {selectedFileName ? (
              <button
                type="button"
                onClick={removeSelectedFile}
                className="mt-3 w-full rounded-2xl border border-red-200/30 bg-red-500/10 px-4 py-3 text-xs font-black uppercase text-red-100"
              >
                Remove {selectedFileName}
              </button>
            ) : null}
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

        {debugRows.length > 0 && rows.length === 0 && (
          <div className="mt-5 overflow-hidden rounded-2xl border border-red-200/20 bg-red-500/10">
            <div className="px-4 py-3 text-sm font-black uppercase text-red-100">
              File Preview - First Rows
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <tbody>
                  {debugRows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-t border-red-200/10">
                      <td className="px-3 py-2 font-black text-red-100">
                        Row {rowIndex + 1}
                      </td>

                      {row.slice(0, 15).map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className="min-w-[120px] px-3 py-2 text-white/80"
                        >
                          {String(cell || "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
