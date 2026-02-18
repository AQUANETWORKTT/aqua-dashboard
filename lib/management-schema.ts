// lib/management-schema.ts

export type ManagerId =
  | "jamesintune"
  | "mavis"
  | "mattfx"
  | "elliew"
  | "haz"
  | "alfieharnett"
  | "lewis";

export type ManagerRow = {
  id: ManagerId;
  name: string;

  // Manual inputs
  validGoLiveRate: number | null; // %
  recruitsThisWeek: number | null;
  recruitsMTD: number | null;
  avgDiamondsPerCreator: number | null;
  matchesPerCreator: number | null;

  // NEW: manual pay % (max 60)
  currentPayPercent: number | null;

  notes: string;
};

export type Meeting = {
  id: string; // e.g. "2026-02-w1"
  label: string; // "Feb Week 1"
  dateISO: string; // "2026-02-03"
  attendance: Partial<Record<ManagerId, boolean>>;
};

export type ManagementData = {
  updatedAtISO: string;
  managers: ManagerRow[];
  meetings: Meeting[];
};

export const DEFAULT_MANAGEMENT_DATA: ManagementData = {
  updatedAtISO: new Date().toISOString(),
  managers: [
    {
      id: "jamesintune",
      name: "JamesInTune",
      validGoLiveRate: null,
      recruitsThisWeek: null,
      recruitsMTD: null,
      avgDiamondsPerCreator: null,
      matchesPerCreator: null,
      currentPayPercent: null,
      notes: "",
    },
    {
      id: "mavis",
      name: "Mavis",
      validGoLiveRate: null,
      recruitsThisWeek: null,
      recruitsMTD: null,
      avgDiamondsPerCreator: null,
      matchesPerCreator: null,
      currentPayPercent: null,
      notes: "",
    },
    {
      id: "mattfx",
      name: "MattFx",
      validGoLiveRate: null,
      recruitsThisWeek: null,
      recruitsMTD: null,
      avgDiamondsPerCreator: null,
      matchesPerCreator: null,
      currentPayPercent: null,
      notes: "",
    },
    {
      id: "elliew",
      name: "Ellie W",
      validGoLiveRate: null,
      recruitsThisWeek: null,
      recruitsMTD: null,
      avgDiamondsPerCreator: null,
      matchesPerCreator: null,
      currentPayPercent: null,
      notes: "",
    },
    {
      id: "haz",
      name: "haz",
      validGoLiveRate: null,
      recruitsThisWeek: null,
      recruitsMTD: null,
      avgDiamondsPerCreator: null,
      matchesPerCreator: null,
      currentPayPercent: null,
      notes: "",
    },
    {
      id: "alfieharnett",
      name: "Alfie Harnett",
      validGoLiveRate: null,
      recruitsThisWeek: null,
      recruitsMTD: null,
      avgDiamondsPerCreator: null,
      matchesPerCreator: null,
      currentPayPercent: null,
      notes: "",
    },
    {
      id: "lewis",
      name: "Lewis",
      validGoLiveRate: null,
      recruitsThisWeek: null,
      recruitsMTD: null,
      avgDiamondsPerCreator: null,
      matchesPerCreator: null,
      currentPayPercent: null,
      notes: "",
    },
  ],
  meetings: [],
};

export function clampNullableNumber(n: any): number | null {
  if (n === "" || n === null || n === undefined) return null;
  const x = Number(n);
  if (!Number.isFinite(x)) return null;
  return x;
}

export function attendancePercent(
  managerId: ManagerId,
  meetings: Meeting[]
): { attended: number; total: number; percent: number } {
  const total = meetings.length;
  if (!total) return { attended: 0, total: 0, percent: 0 };

  let attended = 0;
  for (const m of meetings) {
    if (m.attendance?.[managerId]) attended++;
  }
  const percent = Math.round((attended / total) * 100);
  return { attended, total, percent };
}
