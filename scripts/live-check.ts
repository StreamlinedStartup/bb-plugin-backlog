import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { strict as assert } from "node:assert";
import { rpcContract } from "../src/contract";
const base = "http://127.0.0.1:38886/api/v1/plugins/backlog/rpc";
async function call(method: string, input: unknown) {
 const response = await fetch(`${base}/${method}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
 const body = await response.json() as { ok: boolean; result: unknown; error?: unknown };
 if (!body.ok) throw new Error(JSON.stringify(body.error ?? body));
 return body.result;
}
const projects = rpcContract.projects.output.parse(await call("projects", null));
const project = projects.find(p => p.sources.some(s => s.path === process.cwd()));
assert(project, "This checkout must be a BB project");
const source = project.sources.find(s => s.path === process.cwd())!;
const folder = resolve(".test-results/live-backlog");
const original = { projectId: project.id, sourceId: project.selectedSourceId ?? source.id, folder: project.folder };
const projectId = project.id;
const header = (id: string, title: string, status: string) => `---\nid: ${id}\ntitle: ${title}\nstatus: ${status}\nlabels: [plugin, verification]\nassignee: [developer]\npriority: medium\nunknown: retained # custom\n---\n\n## Description\n\n<!-- SECTION:DESCRIPTION:BEGIN -->\nA **live** task with a table.\n\n| Check | Result |\n| --- | --- |\n| Markdown | Rendered |\n<!-- SECTION:DESCRIPTION:END -->\n\n## Acceptance Criteria\n<!-- AC:BEGIN -->\n- [x] #1 Render task\n- [ ] #2 Verify editing\n<!-- AC:END -->\n`;
for (const dir of ["tasks", "completed", "archive/tasks"]) await mkdir(resolve(folder, dir), { recursive: true });
await writeFile(resolve(folder, "config.yml"), "statuses: [To Do, In Progress, Done]\n");
await writeFile(resolve(folder, "tasks/task-1.md"), header("TASK-1", "Verify the live board", "To Do"));
await writeFile(resolve(folder, "tasks/task-2.md"), header("TASK-2", "Keep user drafts", "In Progress"));
await writeFile(resolve(folder, "completed/task-3.md"), header("TASK-3", "Completed fixture", "Done"));
await writeFile(resolve(folder, "archive/tasks/task-4.md"), header("TASK-4", "Archived fixture", "Done"));
const report: Record<string, unknown> = {};
try {
 await call("settings", { projectId, sourceId: source.id, folder });
 const getBoard = async () => rpcContract.board.output.parse(await call("board", { projectId }));
 let board = await getBoard(); assert.equal(board.state, "ready", board.message); assert.equal(board.tasks.length, 4, board.warnings.join("\n"));
 assert.equal(board.warnings.length, 0, board.warnings.join("\n"));
 assert.deepEqual(board.tasks.map(t => t.storage).sort(), ["active", "active", "archived", "completed"]);
 report.discovery = "Four fixture tasks across all three storage locations";
 const task = board.tasks.find(t => t.id === "TASK-1")!;
 const input = { projectId, sourceId: source.id, folder, path: task.path, taskId: task.id, revision: task.revision };
 await call("move", { ...input, status: "In Progress", beforePath: null });
 board = await getBoard(); assert.equal(board.tasks.find(t => t.id === task.id)?.status, "In Progress");
 assert((await readFile(task.path, "utf8")).includes("unknown: retained # custom"));
 report.move = "Status and ordinal persisted via hash-guarded host writes";
 const beforeEvent = board.lastChangeAt;
 const started = Date.now();
 await writeFile(task.path, (await readFile(task.path, "utf8")).replace("status: \"In Progress\"", "status: Done"));
 let observed = false;
 while (Date.now() - started < 3000) {
  board = await getBoard();
  if (board.lastChangeAt !== beforeEvent && board.lastChangeAt !== null && board.lastChangeAt >= started && board.tasks.find(t => t.id === task.id)?.status === "Done") { observed = true; break; }
  await Bun.sleep(50);
 }
 assert(observed, "Native watcher did not publish a changed signal");
 report.nativeWatchLatencyMs = board.lastChangeAt! - started;
 const overlapping = rpcContract.save.output.parse(await call("save", { ...input, edits: [{ kind: "field", key: "status", before: "To Do", value: "In Progress" }] }));
 assert.equal(overlapping.conflict, true); assert.equal(overlapping.task.status, "Done");
 const merged = rpcContract.save.output.parse(await call("save", { ...input, edits: [{ kind: "field", key: "title", before: task.title, value: "Verified live board" }] }));
 assert.equal(merged.conflict, false); assert.equal(merged.task.status, "Done");
 report.conflicts = "Overlapping save rejected; disjoint title edit merged with agent status";
 const archive = board.tasks.find(t => t.storage === "archived")!;
 await call("move", { ...input, path: archive.path, taskId: archive.id, revision: archive.revision, status: "To Do", beforePath: null });
 assert((await readFile(archive.path, "utf8")).includes("status: \"To Do\""));
 report.archive = "Status edit retained archived storage";
} finally { await call("settings", original); }
await writeFile(".test-results/live-report.json", JSON.stringify(report, null, 2) + "\n");
process.stdout.write(JSON.stringify(report, null, 2) + "\n");
