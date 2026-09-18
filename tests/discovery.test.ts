import { describe, expect, test } from "bun:test";
import { discover, confinedTaskPath } from "../src/discovery";
function fixture(files: Record<string, string>) {
 return { exists: async (paths: string[]) => Object.fromEntries(paths.map(p => [p, p in files])), read: async (p: string) => files[p] };
}
describe("folder discovery", () => {
 test("finds hidden convention and legacy configuration", async () => {
  const result = await discover(fixture({ "/repo/.backlog": "", "/repo/.backlog/config.yml": "statuses: [Draft, Building, Shipped]" }), "/repo", null);
  expect(result.folder).toBe("/repo/.backlog"); expect(result.config.statuses).toEqual(["Draft", "Building", "Shipped"]);
 });
 test("does not choose between both conventions", async () => {
  expect((await discover(fixture({ "/repo/.backlog": "", "/repo/backlog": "" }), "/repo", null)).state).toBe("ambiguous");
 });
 test("root config selects folder and overrides legacy statuses", async () => {
  const result = await discover(fixture({ "/repo/backlog.config.yml": "backlog_directory: work\nstatuses: [Ready, Done]", "/repo/work": "", "/repo/work/config.yml": "statuses: [Old]" }), "/repo", null);
  expect(result.folder).toBe("/repo/work"); expect(result.config.statuses).toEqual(["Ready", "Done"]);
 });
 test("explicit override takes precedence and may select outside checkout", async () => {
  expect((await discover(fixture({ "/repo/backlog.config.yml": "backlog_directory: work", "/custom": "" }), "/repo", "/custom")).folder).toBe("/custom");
 });
 test("missing folders are never created", async () => {
  expect((await discover(fixture({}), "/repo", null)).state).toBe("missing");
 });
 test("malformed configuration is actionable", async () => {
  await expect(discover(fixture({ "/repo/backlog.config.yml": "statuses: [Open\n" }), "/repo", null)).rejects.toThrow("Invalid Backlog configuration");
 });
 test("duplicate statuses are rejected", async () => {
  await expect(discover(fixture({ "/repo/backlog.config.yml": "statuses: [Done, Done]" }), "/repo", null)).rejects.toThrow("unique");
 });
 test("task paths cannot escape task storage", () => {
  expect(confinedTaskPath("/repo/backlog", "tasks/task-1.md")).toBe("/repo/backlog/tasks/task-1.md");
  expect(() => confinedTaskPath("/repo/backlog", "tasks/../../README.md")).toThrow();
  expect(() => confinedTaskPath("/repo/backlog", "docs/doc-1.md")).toThrow();
 });
});
