import { afterEach, expect, test } from "bun:test";
import { mkdtemp, mkdir, symlink, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { experimental_createHostEntryHarness } from "@get-bb/plugin-sdk/testing/host";
import type { ExperimentalHostWatchListener } from "@get-bb/plugin-sdk";
import host from "../host";
const roots: string[] = [];
const disposals: Array<() => Promise<void>> = [];
async function root() { const dir = await mkdtemp(join(tmpdir(), "backlog-watch-")); roots.push(dir); return dir; }
afterEach(async () => { await Promise.all(disposals.splice(0).map(dispose => dispose())); await Promise.all(roots.splice(0).map(path => rm(path, { recursive: true, force: true }))); });
function setup() {
 const calls: Array<{ root: string; listener: ExperimentalHostWatchListener; disposed: boolean }> = [];
 const harness = experimental_createHostEntryHarness(host, { experimental_watch: async (options, listener) => {
  const call = { root: options.rootPath, listener, disposed: false }; calls.push(call);
  await Promise.resolve(); return { dispose: async () => { call.disposed = true; } };
 } });
 disposals.push(() => harness.experimental_dispose());
 return { harness, calls };
}
test("filters irrelevant events but forwards config, task and rescan events", async () => {
 const { harness, calls } = setup(); const dir = await root();
 await harness.experimental_call("watch", { key: "p", rootPath: dir, folder: join(dir, "backlog") });
 await calls[0].listener({ kind: "changed", changes: [{ path: "unrelated.md", type: "update" }] });
 expect(harness.experimental_getSignals()).toHaveLength(0);
 for (const path of ["backlog/tasks/task-1.md", "backlog.config.yml", "backlog/config.yml"]) await calls[0].listener({ kind: "changed", changes: [{ path, type: "update" }] });
 await calls[0].listener({ kind: "rescan-required" });
 expect(harness.experimental_getSignals()).toHaveLength(4);
});
test("heartbeat reuses native watcher and parallel replace/release disposes all", async () => {
 const { harness, calls } = setup(); const dir = await root();
 const input = { key: "p", rootPath: dir, folder: join(dir, "backlog") };
 await harness.experimental_call("watch", input); await harness.experimental_call("watch", input);
 expect(calls).toHaveLength(1);
 await Promise.all([harness.experimental_call("watch", { ...input, folder: join(dir, "other") }), harness.experimental_call("unwatch", { key: "p" })]);
 expect(calls).toHaveLength(2); expect(calls.every(call => call.disposed)).toBe(true);
});
test("custom folder outside checkout has its own subscription", async () => {
 const { harness, calls } = setup(); const dir = await root(), custom = await root();
 await harness.experimental_call("watch", { key: "p", rootPath: dir, folder: custom });
 expect(calls.map(call => call.root)).toEqual([dir, custom]);
 await calls[1].listener({ kind: "changed", changes: [{ path: "tasks/t.md", type: "create" }] });
 expect(harness.experimental_getSignals()).toHaveLength(1);
 await harness.experimental_call("unwatch", { key: "p" }); expect(calls.every(call => call.disposed)).toBe(true);
});
test("inventory distinguishes storage and excludes non-Markdown files", async () => {
 const { harness } = setup(); const dir = await root();
 for (const folder of ["tasks", "completed", "archive/tasks"]) { await mkdir(join(dir, folder), { recursive: true }); await writeFile(join(dir, folder, "a.md"), "x"); }
 await writeFile(join(dir, "tasks", "notes.txt"), "x");
 const result = await harness.experimental_call("inventory", { folder: dir });
 expect(result.files.map(file => file.storage)).toEqual(["active", "completed", "archived"]);
});
test("symlinks at storage roots, parent archive and nested directories are skipped", async () => {
 const { harness } = setup(); const dir = await root(), outside = await root();
 await mkdir(join(outside, "tasks")); await writeFile(join(outside, "secret.md"), "x"); await writeFile(join(outside, "tasks", "secret.md"), "x");
 await symlink(outside, join(dir, "tasks")); await symlink(outside, join(dir, "archive"));
 await mkdir(join(dir, "completed")); await symlink(outside, join(dir, "completed", "nested"));
 const result = await harness.experimental_call("inventory", { folder: dir });
 expect(result.files).toEqual([]); expect(result.warnings).toHaveLength(3);
});
test("empty storage is allowed but nonexistent selected folder is not", async () => {
 const { harness } = setup(); const dir = await root();
 expect(await harness.experimental_call("inventory", { folder: dir })).toEqual({ files: [], warnings: [] });
 await expect(harness.experimental_call("inventory", { folder: join(dir, "missing") })).rejects.toThrow();
});
