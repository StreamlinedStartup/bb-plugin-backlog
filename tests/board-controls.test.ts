import { expect, test } from "bun:test";
import { compareBoardTasks, matchesBoardFilters, selectBoardTasks, type BoardFilters } from "../src/board-controls";
import type { Task } from "../src/model";

const filters = (overrides: Partial<BoardFilters> = {}): BoardFilters => ({ status: [], priority: [], assignee: "", labels: [], sort: "ordinal", direction: "asc", ...overrides });
const task = (path: string, fields: Record<string, unknown> = {}, overrides: Partial<Task> = {}): Task => ({ path, revision: "r", storage: "active", id: path, title: path, status: "To Do", ordinal: null, fields, body: "", sections: {}, errors: [], progress: { done: 0, total: 0 }, ...overrides });

test("filters by status, priority, assignee, and all selected labels", () => {
 const match = task("match", { priority: "High", assignee: ["Alex"], labels: ["frontend", "urgent"] });
 expect(matchesBoardFilters(match, filters({ status: ["To Do"], priority: ["High"], assignee: "Alex", labels: ["frontend", "urgent"] }))).toBe(true);
 expect(matchesBoardFilters(match, filters({ status: ["Done"] }))).toBe(false);
 expect(matchesBoardFilters(match, filters({ priority: ["Low"] }))).toBe(false);
 expect(matchesBoardFilters(match, filters({ assignee: "Sam" }))).toBe(false);
 expect(matchesBoardFilters(match, filters({ labels: ["frontend", "missing"] }))).toBe(false);
});

test("sorts by title, priority, due date, and ordinal with missing values last", () => {
 const tasks = [task("missing", { priority: "", due_date: "" }, { title: "Beta", ordinal: null }), task("low", { priority: "Low", due_date: "2026-10-01" }, { title: "Alpha", ordinal: 20 }), task("high", { priority: "High", due_date: "2026-09-01" }, { title: "Alpha", ordinal: 10 }), task("medium", { priority: "Medium", due_date: "2026-09-15" }, { title: "Gamma", ordinal: null })];
 expect(selectBoardTasks(tasks, filters({ sort: "title" })).map(item => item.id)).toEqual(["high", "low", "missing", "medium"]);
 expect(selectBoardTasks(tasks, filters({ sort: "priority" })).map(item => item.id)).toEqual(["high", "medium", "low", "missing"]);
 expect(selectBoardTasks(tasks, filters({ sort: "due_date" })).map(item => item.id)).toEqual(["high", "medium", "low", "missing"]);
 expect(selectBoardTasks(tasks, filters({ sort: "ordinal" })).map(item => item.id)).toEqual(["high", "low", "medium", "missing"]);
 expect(compareBoardTasks(task("a", {}, { title: "Same", ordinal: null }), task("b", {}, { title: "Same", ordinal: null }), "title")).toBeLessThan(0);
});

test("sorts by created and updated dates with missing dates last", () => {
 const tasks = [task("missing", {}, { fields: { created_date: "", updated_date: "" } }), task("old", {}, { fields: { created_date: "2026-09-01", updated_date: "2026-09-20" } }), task("new", {}, { fields: { created_date: "2026-09-10", updated_date: "2026-09-05" } })];
 expect(selectBoardTasks(tasks, filters({ sort: "created_date" })).map(item => item.id)).toEqual(["old", "new", "missing"]);
 expect(selectBoardTasks(tasks, filters({ sort: "updated_date" })).map(item => item.id)).toEqual(["new", "old", "missing"]);
});

test("reverses every sort field without moving missing values ahead", () => {
 const tasks = [task("missing", { priority: "", due_date: "" }, { title: "Beta", ordinal: null, fields: { created_date: "", updated_date: "" } }), task("first", { priority: "High", due_date: "2026-09-01" }, { title: "Alpha", ordinal: 1, fields: { priority: "High", due_date: "2026-09-01", created_date: "2026-09-01", updated_date: "2026-09-03" } }), task("second", { priority: "Low", due_date: "2026-09-10" }, { title: "Gamma", ordinal: 2, fields: { priority: "Low", due_date: "2026-09-10", created_date: "2026-09-10", updated_date: "2026-09-01" } })];
 for (const sort of ["ordinal", "priority", "due_date", "created_date", "updated_date"] as const) {
  const descending = selectBoardTasks(tasks, filters({ sort, direction: "desc" }));
  expect(descending.at(-1)?.id).toBe("missing");
 }
 expect(selectBoardTasks(tasks, filters({ sort: "title", direction: "desc" })).map(item => item.id)).toEqual(["second", "missing", "first"]);
 expect(selectBoardTasks(tasks, filters({ sort: "ordinal", direction: "desc" })).map(item => item.id)).toEqual(["second", "first", "missing"]);
});

test("selection composes with the caller's search and storage scope", () => {
 const tasks = [task("active-match", { labels: ["ui"] }, { title: "Keep", storage: "active" }), task("completed-match", { labels: ["ui"] }, { title: "Keep", storage: "completed" }), task("active-other", { labels: ["ops"] }, { title: "Other", storage: "active" })];
 const scoped = tasks.filter(item => item.storage === "active" && item.title.includes("Keep"));
 expect(selectBoardTasks(scoped, filters({ labels: ["ui"], sort: "title" })).map(item => item.id)).toEqual(["active-match"]);
});
