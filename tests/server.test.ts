import { afterEach, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { createFakePluginHost } from "@get-bb/plugin-sdk/testing";
import plugin from "../server";
import { rpcContract } from "../src/contract";
import { parseTask } from "../src/task-format";
import type { Edit } from "../src/model";
const taskPath = "/repo/backlog/tasks/t.md";
const raw = "---\nid: T-1\ntitle: Hello\nstatus: To Do\nunknown: keep # comment\n---\n\n## Description\nBody\n";
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const disposals: Array<() => Promise<void>> = [];
afterEach(async () => { await Promise.all(disposals.splice(0).map(dispose => dispose())); });
async function setup(initial = raw) {
 const files = new Map([[taskPath, initial]]);
 let beforeWrite: (() => void) | null = null;
 const writes: Array<{ path: string; rootPath?: string; expectedSha256?: string | null }> = [];
 const project = { id: "p", name: "Project", sources: [{ id: "s", hostId: "h", path: "/repo" }] };
 const fake = createFakePluginHost({ pluginId: "backlog", sdk: {
  projects: { list: async () => [project, { id: "personal", name: "Personal", sources: [] }], get: async () => project },
  hosts: { pathsExist: async ({ paths }: { paths: string[] }) => ({ existence: Object.fromEntries(paths.map(path => [path, path === "/repo/backlog"])) }) },
  files: {
   read: async ({ path }: { path: string }) => {
    const content = files.get(path); if (content === undefined) throw new Error("File deleted");
    return { path, content, contentEncoding: "utf8", sha256: hash(content), sizeBytes: content.length };
   },
   write: async (args: { path: string; content: string; rootPath?: string; expectedSha256?: string | null }) => {
    beforeWrite?.(); beforeWrite = null; writes.push(args);
    const content = files.get(args.path);
    if (content === undefined || args.expectedSha256 !== hash(content)) return { outcome: "conflict", currentSha256: content ? hash(content) : null };
    files.set(args.path, args.content); return { outcome: "written", sha256: hash(args.content), sizeBytes: args.content.length };
   },
  },
 }, experimental_callHostRpc: async ({ method }) => method === "inventory" ? { files: [...files.keys()].map(path => ({ path, storage: "active" })), warnings: [] } : null });
 await plugin(fake.bb);
 disposals.push(() => fake.harness.lifecycle.dispose());
 const input = { projectId: "p", sourceId: "s", folder: "/repo/backlog", path: taskPath, taskId: "T-1", revision: hash(initial) };
 const save = async (edits: Edit[], overrides = {}) => rpcContract.save.output.parse(await fake.harness.behavior.callRpc("save", { ...input, edits, ...overrides }));
 const move = (status: string, beforePath: string | null, overrides = {}) => fake.harness.behavior.callRpc("move", { ...input, status, beforePath, ...overrides });
 return { ...fake, files, writes, input, save, move, race: (action: () => void) => { beforeWrite = action; } };
}
test("saves through explicit host/root and hash guard while preserving unknown bytes", async () => {
 const f = await setup();
 const result = await f.save([{ kind: "field", key: "status", before: "To Do", value: "Done" }]);
 expect(result.conflict).toBe(false); expect(f.files.get(taskPath)).toBe(raw.replace("status: To Do", "status: \"Done\""));
 expect(f.writes[0]).toMatchObject({ path: taskPath, rootPath: "/repo/backlog", expectedSha256: hash(raw) });
});
test("merges an old draft when an agent changed a disjoint field", async () => {
 const f = await setup(); f.files.set(taskPath, raw.replace("Body", "Agent notes"));
 const result = await f.save([{ kind: "field", key: "title", before: "Hello", value: "Mine" }]);
 expect(result.conflict).toBe(false); expect(f.files.get(taskPath)).toContain("Agent notes"); expect(result.task.title).toBe("Mine");
});
test("overlapping agent edit returns current file and leaves user edit unwritten", async () => {
 const f = await setup(); f.files.set(taskPath, raw.replace("title: Hello", "title: Agent"));
 const result = await f.save([{ kind: "field", key: "title", before: "Hello", value: "Mine" }]);
 expect(result.conflict).toBe(true); expect(result.task.title).toBe("Agent"); expect(f.writes).toHaveLength(0);
});
test("agent write between read and final CAS is never overwritten", async () => {
 const f = await setup(); f.race(() => f.files.set(taskPath, raw.replace("title: Hello", "title: Racing agent")));
 const result = await f.save([{ kind: "field", key: "title", before: "Hello", value: "Mine" }]);
 expect(result.conflict).toBe(true); expect(result.task.title).toBe("Racing agent"); expect(f.files.get(taskPath)).not.toContain("Mine");
});
test("two overlapping user saves serialize and second reports conflict", async () => {
 const f = await setup();
 const results = await Promise.all([f.save([{ kind: "field", key: "title", before: "Hello", value: "First" }]), f.save([{ kind: "field", key: "title", before: "Hello", value: "Second" }])]);
 expect(results.map(result => result.conflict)).toEqual([false, true]); expect(results[1].task.title).toBe("First");
});
test("deleted file cannot be recreated by stale save", async () => {
 const f = await setup(); f.files.delete(taskPath);
 await expect(f.save([{ kind: "field", key: "title", before: "Hello", value: "Mine" }])).rejects.toThrow("moved or deleted");
 expect(f.writes).toHaveLength(0);
});
test("duplicate task IDs block mutations", async () => {
 const f = await setup(); f.files.set("/repo/backlog/tasks/duplicate.md", raw);
 await expect(f.save([{ kind: "field", key: "title", before: "Hello", value: "Mine" }])).rejects.toThrow("Duplicate task ID");
 expect(f.writes).toHaveLength(0);
});
test("source, folder and path changes cannot redirect a pending mutation", async () => {
 const f = await setup(); const edits: Edit[] = [{ kind: "field", key: "title", before: "Hello", value: "Mine" }];
 await expect(f.save(edits, { sourceId: "other" })).rejects.toThrow("source or folder changed");
 await expect(f.save(edits, { folder: "/other" })).rejects.toThrow("source or folder changed");
 await expect(f.save(edits, { path: "/repo/README.md" })).rejects.toThrow("outside");
});
test("move adds missing ordinal and persists configured status", async () => {
 const f = await setup(); await f.move("In Progress", null);
 const task = parseTask(f.files.get(taskPath)!, { path: taskPath, revision: "", storage: "active" });
 expect(task.status).toBe("In Progress"); expect(task.ordinal).toBe(1024);
});
test("reordering tasks without ordinals works in existing display order", async () => {
 const f = await setup(); const second = "/repo/backlog/tasks/t2.md", third = "/repo/backlog/tasks/t3.md";
 f.files.set(second, raw.replace("T-1", "T-2")); f.files.set(third, raw.replace("T-1", "T-3"));
 await f.move("To Do", third);
 const readOrder = (path: string) => parseTask(f.files.get(path)!, { path, revision: "", storage: "active" }).ordinal!;
 expect(readOrder(second)).toBeLessThan(readOrder(taskPath)); expect(readOrder(taskPath)).toBeLessThan(readOrder(third));
});
test("stale drag and unconfigured statuses fail explicitly", async () => {
 const f = await setup(); f.files.set(taskPath, raw.replace("Body", "Agent notes"));
 await expect(f.move("Done", null)).rejects.toThrow("card changed");
 await expect(f.move("Unknown", null, { revision: hash(f.files.get(taskPath)!) })).rejects.toThrow("configured status");
});
test("project listing requests Personal and keeps sourceless projects visible", async () => {
 const f = await setup(); const result = rpcContract.projects.output.parse(await f.harness.behavior.callRpc("projects", null));
 expect(result.map(project => project.name)).toEqual(["Project", "Personal"]);
 expect(f.harness.inspection.sdk.callsTo("projects.list")[0]).toEqual([{ includePersonal: true }]);
});

test("a file replaced by a different task cannot receive a stale draft", async () => {
 const f = await setup(); f.files.set(taskPath, raw.replace("T-1", "T-99"));
 await expect(f.save([{ kind: "field", key: "title", before: "Hello", value: "Mine" }])).rejects.toThrow("identity changed");
 expect(f.writes).toHaveLength(0);
});
