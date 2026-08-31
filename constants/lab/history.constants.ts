import { SessionHistoryFilterType } from "@/types/lab";

export const PAGE_LIMIT = 20;

export const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export const DATE_PRESETS: { label: string; getRange: () => { dateFrom?: string; dateTo?: string } }[] = [
  { label: "All time", getRange: () => ({}) },
  { label: "Today", getRange: () => ({ dateFrom: startOfToday().toISOString() }) },
  {
    label: "This week",
    getRange: () => {
      const d = startOfToday();
      d.setDate(d.getDate() - 7);
      return { dateFrom: d.toISOString() };
    },
  },
  {
    label: "This month",
    getRange: () => {
      const d = startOfToday();
      d.setDate(1);
      return { dateFrom: d.toISOString() };
    },
  },
  { label: "Custom range", getRange: () => ({}) },
];

export const SCORE_BANDS: { label: string; scoreMin?: number; scoreMax?: number }[] = [
  { label: "All" },
  { label: "0-50", scoreMin: 0, scoreMax: 50 },
  { label: "51-75", scoreMin: 51, scoreMax: 75 },
  { label: "76-100", scoreMin: 76, scoreMax: 100 },
];

export const HISTORY_FILTER_SUBJECTS = ["All", "Chemistry", "Biology", "Physics"];

export const GRADES: { label: string; grade?: number }[] = [
  { label: "All" },
  { label: "Grade 10", grade: 10 },
  { label: "Grade 11", grade: 11 },
];

export const STATUSES: { label: string; status?: SessionHistoryFilterType["status"] }[] = [
  { label: "All" },
  { label: "Completed", status: "completed" },
  { label: "In Progress", status: "in_progress" },
  { label: "Abandoned", status: "abandoned" },
];
