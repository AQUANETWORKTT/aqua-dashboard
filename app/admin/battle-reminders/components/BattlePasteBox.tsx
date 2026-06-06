"use client";

type BattlePasteBoxProps = {
  value: string;
  onChange: (value: string) => void;
  onImport: () => void;
  rowCount: number;
  duplicateCount: number;
};

export default function BattlePasteBox({
  value,
  onChange,
  onImport,
  rowCount,
  duplicateCount,
}: BattlePasteBoxProps) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-black text-white">
          Paste Battle Schedule
        </h2>

        <p className="text-sm text-zinc-400">
          Paste copied rows directly from your battle planner.
        </p>
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`WEDNESDAY 3RD JUNE	damo_bafc	DYLAN	1 - 5K	https://www.tiktok.com/@damo_bafc	19:30	https://www.tiktok.com/@hannahbrissenden12	20:00	FIRST CLASS✈️	TRUE`}
        className="mt-5 min-h-[300px] w-full rounded-2xl border border-zinc-800 bg-black p-4 font-mono text-sm text-white outline-none transition-all focus:border-red-500"
      />

      <div className="mt-5 flex flex-col gap-3 lg:flex-row">
        <button
          onClick={onImport}
          disabled={!value.trim()}
          className="rounded-2xl bg-red-500 px-6 py-3 font-black text-white transition-all hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-zinc-700"
        >
          Import Battles
        </button>

        <div className="rounded-2xl border border-zinc-800 bg-black px-4 py-3">
          <span className="text-zinc-500">Rows:</span>{" "}
          <span className="font-bold text-white">{rowCount}</span>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-black px-4 py-3">
          <span className="text-zinc-500">Duplicates:</span>{" "}
          <span
            className={
              duplicateCount > 0
                ? "font-bold text-red-400"
                : "font-bold text-green-400"
            }
          >
            {duplicateCount}
          </span>
        </div>
      </div>
    </section>
  );
}