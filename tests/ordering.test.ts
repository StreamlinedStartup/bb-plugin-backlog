import { expect, test } from "bun:test";
import { insertionOrdinal } from "../src/ordering";
import type { Task } from "../src/model";
const task = (path: string, ordinal: number | null): Task => ({ path, id: path, ordinal, status: "Open", title: path, revision: "sha", storage: "active", fields: {}, body: "", sections: {}, errors: [], progress: { done: 0, total: 0 } });
test("inserts before first, between cards, and at end", () => {
 const tasks = [task("a", 1024), task("b", 2048)];
 expect(insertionOrdinal(tasks, "new", "Open", "a")).toBe(0);
 expect(insertionOrdinal(tasks, "new", "Open", "b")).toBe(1536);
 expect(insertionOrdinal(tasks, "new", "Open", null)).toBe(3072);
});
test("excludes moving card when computing neighbors", () => {
 expect(insertionOrdinal([task("a", 1024), task("b", 2048)], "a", "Open", null)).toBe(3072);
});
test("stale drop target fails explicitly", () => {
 expect(() => insertionOrdinal([], "new", "Open", "removed")).toThrow("target card moved");
});
