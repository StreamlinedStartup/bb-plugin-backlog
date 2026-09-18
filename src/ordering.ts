import type { Task } from "./model";
export function compareTasks(a: Task, b: Task): number {
  return (a.ordinal ?? Number.MAX_VALUE) - (b.ordinal ?? Number.MAX_VALUE) || a.id.localeCompare(b.id, undefined, { numeric: true }) || a.path.localeCompare(b.path);
}
/** A single-file fractional order avoids partially committed multi-file rewrites. */
export function insertionOrdinal(tasks: Task[], movingPath: string, status: string, beforePath: string | null): number {
  const lane = tasks.filter(t => t.path !== movingPath && t.status === status).sort(compareTasks);
  const index = beforePath === null ? lane.length : lane.findIndex(t => t.path === beforePath);
  if (index < 0) throw new Error("The target card moved. Refresh the board and try again.");
  const previous = lane[index - 1];
  const next = lane[index];
  // Unordered records sort after ordered records. Assign a finite position before
  // them, but refuse an insertion between indistinguishable missing/duplicate keys.
  if (previous && previous.ordinal === null) throw new Error("These tasks have no ordinal values. Place the card before the first unordered task to establish its order.");
  const low = previous?.ordinal ?? 0;
  const high = next?.ordinal ?? null;
  const value = high === null ? low + 1024 : previous ? low + (high - low) / 2 : high - 1024;
  if (!Number.isFinite(value) || (previous && value <= low) || (high !== null && value >= high)) throw new Error("There is no numeric ordering space between these cards. Move one to the start of the lane first.");
  return value;
}
