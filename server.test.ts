import { afterEach, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { createFakePluginHost } from "@get-bb/plugin-sdk/testing";
import plugin from "./server";

const raw = (id = "CUSTOM-1", title = "Fix Login", status = "Awaiting QA") => `---\nid: ${id}\ntitle: ${title}\nstatus: ${status}\npriority: high\nlabels: [auth]\ncustom: preserved\n---\n\n## Description\nOriginal description\n`;
const disposals: Array<() => Promise<void>> = [];
afterEach(async () => { await Promise.all(disposals.splice(0).map(dispose => dispose())); });
async function setup() {
 const project = { id: "p", name: "First", sources: [{ id: "s", hostId: "h", path: "/repo" }] };
 const other = { id: "other", name: "Second", sources: [{ id: "other-s", hostId: "other-h", path: "/other" }] };
 const files = new Map([["/repo/backlog/tasks/one.md", raw()], ["/other/backlog/tasks/one.md", raw("CUSTOM-1", "Other project")]]);
 const folders = new Set(["/repo/backlog", "/other/backlog"]);
 let offline = false, warnings: string[] = [];
 const fake = createFakePluginHost({ pluginId: "backlog", sdk: {
  projects: { get: async ({ projectId }: { projectId: string }) => projectId === "p" ? project : other },
  hosts: { pathsExist: async ({ paths }: { paths: string[] }) => {
   if (offline) throw new Error("Host unavailable");
   return { existence: Object.fromEntries(paths.map(path => [path, folders.has(path)])) };
  } },
  files: { read: async ({ path, hostId }: { path: string; hostId?: string }) => {
   expect(hostId).toBe(path.startsWith("/other/") ? "other-h" : "h");
   const content = files.get(path); if (content === undefined) throw new Error("File unavailable");
   return { path, content, contentEncoding: "utf8", sha256: createHash("sha256").update(content).digest("hex"), sizeBytes: content.length };
  } },
 }, experimental_callHostRpc: async ({ method, input }) => {
  expect(method).toBe("inventory");
  const { folder } = input as { folder: string };
  return { files: [...files.keys()].filter(path => path.startsWith(folder + "/")).map(path => ({ path, storage: path.includes("/archive/") ? "archived" : path.includes("/completed/") ? "completed" : "active" })), warnings };
 } });
 plugin(fake.bb);
 disposals.push(() => fake.harness.lifecycle.dispose());
 const provider = fake.harness.inspection.registrations.mentionProviders[0];
 const search = (query = "", projectId: string | null = "p") => provider.search({ trigger: "@", query, projectId, threadId: null });
 return { ...fake, project, other, files, folders, provider, search, offline: (value: boolean) => { offline = value; }, warnings: (value: string[]) => { warnings = value; } };
}
test("native registration searches custom IDs/titles/statuses without watches and caps results", async () => {
 const f = await setup();
 expect(f.provider.label).toBe("Backlog tasks"); expect(f.provider.triggers).toEqual(["@"]);
 expect(await f.search("LOGIN")).toMatchObject([{ title: "CUSTOM-1 Fix Login", subtitle: "Awaiting QA · Priority: high · Original description" }]);
 expect(await f.search("custom-1")).toHaveLength(1);
 expect(await f.search("absent")).toEqual([]);
 f.files.set("/repo/backlog/completed/old.md", raw("OLD-1", "Historical"));
 expect(await f.search("Historical")).toMatchObject([{ subtitle: "Storage: completed · Awaiting QA · Priority: high · Original description" }]);
 for (let i = 2; i < 30; i++) f.files.set(`/repo/backlog/tasks/${i}.md`, raw(`CUSTOM-${i}`));
 expect(await f.search()).toHaveLength(20);
 expect(f.harness.inspection.experimental_hostRpcCalls.every(call => call.method === "inventory")).toBe(true);
});
test("fresh context uses persisted identity and the correct project and host", async () => {
 const f = await setup(); const first = (await f.search())[0], other = (await f.search("", "other"))[0];
 expect(first.id).not.toBe(other.id);
 f.files.set("/repo/backlog/tasks/one.md", raw().replace("Original description", "Fresh description").replace("Awaiting QA", "Shipped"));
 const { context } = await f.provider.resolve(JSON.parse(JSON.stringify(first.id)));
 expect(context).toContain("Fresh description"); expect(context).toContain('"status": "Shipped"');
 for (const value of ["First", "CUSTOM-1", "preserved", "auth", "/repo/backlog/tasks/one.md"]) expect(context).toContain(value);
 expect(context).not.toContain("Other project");
 expect((await f.provider.resolve(other.id)).context).toContain("Other project");
});
test("no project, missing/ambiguous folders or sources cannot offer unrelated tasks", async () => {
 const f = await setup(); expect(await f.search("", null)).toEqual([]);
 f.folders.clear(); expect(await f.search()).toEqual([]);
 f.folders.add("/repo/backlog"); f.folders.add("/repo/.backlog"); expect(await f.search()).toEqual([]);
 f.project.sources.push({ id: "s2", hostId: "h", path: "/second" });
 await expect(f.search()).rejects.toThrow("Choose a project source"); // BB isolates search errors as an empty group.
 f.project.sources.length = 0; await expect(f.search()).rejects.toThrow("Choose a project source");
});
test("malformed identities, duplicates, deleted or invalid tasks block resolution", async () => {
 const f = await setup(); const { id } = (await f.search())[0];
 for (const value of ["no json", "null", "{}", JSON.stringify({ ...JSON.parse(id), version: 2 }), JSON.stringify({ ...JSON.parse(id), taskId: "" }), JSON.stringify({ ...JSON.parse(id), extra: true })]) {
  await expect(f.provider.resolve(value)).rejects.toThrow("Invalid task reference");
 }
 f.files.set("/repo/backlog/tasks/duplicate.md", raw());
 expect(await f.search()).toEqual([]); await expect(f.provider.resolve(id)).rejects.toThrow("Duplicate task ID");
 f.files.delete("/repo/backlog/tasks/duplicate.md");
 f.files.set("/repo/backlog/tasks/one.md", raw().replace("priority: high", "priority: [invalid]"));
 await expect(f.provider.resolve(id)).rejects.toThrow("Repair task");
 f.files.delete("/repo/backlog/tasks/one.md"); await expect(f.provider.resolve(id)).rejects.toThrow("missing");
});
test("source, host, root, folder, inventory and availability boundaries block send", async () => {
 const f = await setup(); const { id } = (await f.search())[0];
 for (const change of [{ sourceId: "other" }, { hostId: "other" }, { root: "/other" }, { folder: "/other" }]) {
  await expect(f.provider.resolve(JSON.stringify({ ...JSON.parse(id), ...change }))).rejects.toThrow("source or folder changed");
 }
 f.warnings(["Scan incomplete"]); expect(await f.search()).toEqual([]);
 await expect(f.provider.resolve(id)).rejects.toThrow("Cannot verify task inventory"); f.warnings([]);
 f.folders.clear(); await expect(f.provider.resolve(id)).rejects.toThrow("Folder settings"); f.folders.add("/repo/backlog");
 f.offline(true); await expect(f.provider.resolve(id)).rejects.toThrow("Host unavailable"); f.offline(false);
 expect((await f.provider.resolve(id)).context).toContain("CUSTOM-1");
 f.folders.add("/other/backlog");
 await f.harness.behavior.callRpc("settings", { projectId: "p", sourceId: "s", folder: "/other/backlog" });
 await expect(f.provider.resolve(id)).rejects.toThrow("source or folder changed");
});
test("description matches rank after exact and partial title/ID with deterministic ties", async () => {
 const f = await setup(); f.files.clear();
 const add = (id: string, title: string, description = "Original description") => f.files.set(`/repo/backlog/tasks/${id}.md`, raw(id, title).replace("Original description", description));
 add("Z-1", "Login"); add("A-1", "Fix Login"); add("B-1", "Other", "lOgIn flow"); add("A-2", "Fix Login"); add("LOGIN", "Identity match");
 const ids = async (query: string) => (await f.search(query)).map(item => JSON.parse(item.id).taskId);
 expect(await ids("login")).toEqual(["LOGIN", "Z-1", "A-1", "A-2", "B-1"]);
 expect(await ids("a-1")).toEqual(["A-1"]);
 expect(await ids("FLOW")).toEqual(["B-1"]);
 expect(await ids(" ")).toEqual(["A-1", "A-2", "B-1", "LOGIN", "Z-1"]);
 expect(await ids(" ")).toEqual(await ids(""));
});
test("previews are bounded plain text while search covers the full description", async () => {
 const f = await setup();
 f.files.set("/repo/backlog/tasks/one.md", raw().replace("Original description", '<!-- hidden-marker -->\n# **Readable** [link](https://example.com) <b>HTML</b>\n```js\ncode\n```\n' + "words ".repeat(100) + "deepneedle"));
 const [item] = await f.search("deepNEEDLE");
 expect(item.title).toBe("CUSTOM-1 Fix Login");
 expect(item.subtitle).toStartWith("Awaiting QA · Priority: high · Readable link HTML words");
 expect(item.subtitle!.length).toBeLessThanOrEqual("Awaiting QA · Priority: high · ".length + 420);
 for (const hidden of ["<!--", "<b>", "**", "https://", "hidden-marker", "code", "deepneedle"]) expect(item.subtitle).not.toContain(hidden);
 f.files.set("/repo/backlog/tasks/one.md", raw().replace("priority: high\n", "").replace("## Description\nOriginal description\n", ""));
 expect((await f.search())[0].subtitle).toBe("Awaiting QA");
});
test("historical exact matches beat active partial matches; empty queries favor active storage", async () => {
 const f = await setup();
 f.files.set("/repo/backlog/completed/old.md", raw("OLD-1", "Login"));
 f.files.set("/repo/backlog/archive/tasks/old.md", raw("ARCHIVE-1", "Login", "Custom historical status"));
 const matches = await f.search("login");
 expect(matches.map(item => JSON.parse(item.id).taskId)).toEqual(["OLD-1", "ARCHIVE-1", "CUSTOM-1"]);
 expect(matches[1].subtitle).toStartWith("Storage: archived · Custom historical status");
 expect((await f.search()).map(item => JSON.parse(item.id).taskId)).toEqual(["CUSTOM-1", "OLD-1", "ARCHIVE-1"]);
 expect((await f.search("archive-1"))[0].title).toBe("ARCHIVE-1 Login");
 expect((await f.provider.resolve(matches[1].id)).context).toContain('"storage": "archived"');
});
test("persisted references survive title/filename changes and every storage move", async () => {
 const f = await setup(); const { id } = (await f.search())[0];
 let previous = "/repo/backlog/tasks/one.md";
 for (const location of ["tasks/renamed.md", "completed/renamed.md", "archive/tasks/moved.md", "tasks/restored.md"]) {
  const next = `/repo/backlog/${location}`;
  f.files.delete(previous);
  f.files.set(next, raw("CUSTOM-1", "Renamed", "Released").replace("Original description", `Fresh ${location}`));
  const result = await f.provider.resolve(id);
  expect(result.context).toContain(next); expect(result.context).toContain(`Fresh ${location}`);
  expect(result.context).toContain('"title": "Renamed"'); expect(result.context).toContain('"status": "Released"');
  expect((await f.search("Renamed"))[0].id).toBe(id);
  previous = next;
 }
 f.files.set(previous, raw("CUSTOM-99", "Replacement"));
 await expect(f.provider.resolve(id)).rejects.toThrow("ID changed");
 f.files.set(previous, raw("custom-1", "Case changed ID"));
 await expect(f.provider.resolve(id)).rejects.toThrow("ID changed");
 f.files.set(previous, raw()); expect((await f.provider.resolve(id)).context).toContain("CUSTOM-1");
});
test("cross-storage duplicate IDs including case variants are never selected or resolved", async () => {
 const f = await setup(); const { id } = (await f.search())[0];
 for (const duplicate of ["CUSTOM-1", "custom-1"]) {
  f.files.set("/repo/backlog/archive/tasks/duplicate.md", raw(duplicate));
  expect(await f.search()).toEqual([]);
  await expect(f.provider.resolve(id)).rejects.toThrow("Duplicate task ID");
  f.files.delete("/repo/backlog/archive/tasks/duplicate.md");
  expect((await f.provider.resolve(id)).context).toContain("CUSTOM-1");
 }
});
test("a changed selected source or missing host never redirects a saved historical reference", async () => {
 const f = await setup(); const original = "/repo/backlog/tasks/one.md";
 f.files.set("/repo/backlog/completed/one.md", f.files.get(original)!); f.files.delete(original);
 const { id } = (await f.search())[0];
 await f.harness.behavior.callRpc("settings", { projectId: "p", sourceId: "s", folder: null });
 const source = f.project.sources[0];
 f.project.sources[0] = { ...source, hostId: "replacement-host" };
 await expect(f.provider.resolve(id)).rejects.toThrow("Choose a project source");
 f.project.sources[0] = { ...source, path: "/other" };
 await expect(f.provider.resolve(id)).rejects.toThrow("Choose a project source");
 f.project.sources[0] = source;
 f.offline(true); await expect(f.provider.resolve(id)).rejects.toThrow("Host unavailable");
 f.offline(false); expect((await f.provider.resolve(id)).context).toContain('"storage": "completed"');
});
