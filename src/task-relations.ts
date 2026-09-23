import type { Task } from "./model";
const sameId = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
export function childTasks(parent: Task, tasks: Task[]): Task[] {
 const explicit = Array.isArray(parent.fields.subtasks) ? parent.fields.subtasks.map(String) : [];
 return tasks.filter(task => {
  if (sameId(task.id, parent.id)) return false;
  if (sameId(String(task.fields.parent_task_id ?? ""), parent.id)) return true;
  if (explicit.some(id => sameId(id, task.id))) return true;
  const prefix = `${parent.id.toLowerCase()}.`;
  return task.id.toLowerCase().startsWith(prefix) && !task.id.slice(prefix.length).includes(".");
 });
}
export function parentTask(task: Task, tasks: Task[]): Task | undefined {
 const id = typeof task.fields.parent_task_id === "string" ? task.fields.parent_task_id : task.id.includes(".") ? task.id.slice(0, task.id.lastIndexOf(".")) : null;
 return id ? tasks.find(candidate => sameId(candidate.id, id)) : tasks.find(candidate => Array.isArray(candidate.fields.subtasks) && candidate.fields.subtasks.some(id => sameId(String(id), task.id)));
}
export function descriptionPreview(task: Task): string {
 return (task.sections.description ?? "")
  .replace(/<!--[\s\S]*?-->/g, "")
  .replace(/<[^>]*>/g, " ")
  .replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, " ")
  .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
  .replace(/^\s{0,3}(?:#{1,6}\s+|[-*+]\s+|>\s*)/gm, "")
  .replace(/[*_`~]/g, "")
  .replace(/\s+/g, " ").trim().slice(0, 420);
}
export const assignees = (task: Task): string[] => Array.isArray(task.fields.assignee) ? task.fields.assignee.map(String) : task.fields.assignee ? [String(task.fields.assignee)] : [];
export const initials = (name: string) => Array.from(name.trim().replace(/^@/, "")).slice(0, 2).join("").toUpperCase();
export function assigneeProvider(name: string): "codex" | "claude-code" | null {
 const normalized = name.trim().replace(/^@/, "").toLowerCase().replace(/[\s_-]+/g, "");
 return normalized === "codex" ? "codex" : normalized === "claude" || normalized === "claudecode" ? "claude-code" : null;
}
