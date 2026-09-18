import type { Task } from "./model";
import { assignees } from "./task-relations";
import { compareTasks } from "./ordering";

export type SortMode = "ordinal" | "title" | "priority" | "due_date" | "created_date" | "updated_date";
export type SortDirection = "asc" | "desc";
export type BoardFilters = { status: string[]; priority: string[]; assignee: string; labels: string[]; sort: SortMode; direction: SortDirection };
const text = (value: unknown) => String(value ?? "").trim();
const compareText = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
const missingLast = (a: string, b: string) => !a && !b ? 0 : !a ? 1 : !b ? -1 : compareText(a, b);
const priorityRank = (value: string) => ({ high: 0, medium: 1, low: 2 }[value.toLowerCase()] ?? 3);
const fieldValues = (task: Task, key: "labels" | "assignee") => { const value = task.fields[key]; return Array.isArray(value) ? value.map(text).filter(Boolean) : value ? [text(value)] : []; };

export function matchesBoardFilters(task: Task, filters: BoardFilters) {
 if (filters.status.length && !filters.status.includes(task.status)) return false;
 const priority = text(task.fields.priority);
 if (filters.priority.length && !filters.priority.includes(priority)) return false;
 if (filters.assignee && !assignees(task).map(text).includes(filters.assignee)) return false;
 const labels = new Set(fieldValues(task, "labels"));
 return filters.labels.every(label => labels.has(label));
}
export function compareBoardTasks(a: Task, b: Task, mode: SortMode, direction: SortDirection = "asc") {
 const priorityA = text(a.fields.priority), priorityB = text(b.fields.priority);
 const dateKey = mode === "created_date" || mode === "updated_date" ? mode : null;
 const valueA = mode === "title" ? a.title : mode === "priority" ? priorityA : mode === "due_date" ? text(a.fields.due_date) : dateKey ? text(a.fields[dateKey]) : a.ordinal === null ? "" : String(a.ordinal);
 const valueB = mode === "title" ? b.title : mode === "priority" ? priorityB : mode === "due_date" ? text(b.fields.due_date) : dateKey ? text(b.fields[dateKey]) : b.ordinal === null ? "" : String(b.ordinal);
 const missingA = !valueA, missingB = !valueB;
 if (missingA !== missingB) return missingA ? 1 : -1;
 let result = mode === "priority" ? priorityRank(valueA) - priorityRank(valueB) || compareText(valueA, valueB) : mode === "ordinal" ? Number(valueA) - Number(valueB) : compareText(valueA, valueB);
 if (direction === "desc") result *= -1;
 return result || compareText(a.id, b.id) || compareText(a.path, b.path);
}
export function selectBoardTasks(tasks: Task[], filters: BoardFilters) { return tasks.filter(task => matchesBoardFilters(task, filters)).slice().sort((a, b) => compareBoardTasks(a, b, filters.sort, filters.direction)); }
