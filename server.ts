import type { BbPluginApi } from "@get-bb/plugin-sdk";
import { posix as path } from "node:path";
import { z } from "zod";
import { rpcContract } from "./src/contract";
import { watchContract, watchSignals } from "./src/watch-contract";
import { discover, confinedTaskPath, absoluteFolder, type Config } from "./src/discovery";
import { markdownExcerpt, parseTask, patchTask } from "./src/task-format";
import { compareTasks, insertionOrdinal } from "./src/ordering";
import { descriptionPreview } from "./src/task-relations";
import type { Board, Project, Task, Edit } from "./src/model";
export { rpcContract } from "./src/contract";

const settingsSchema = z.object({ sourceId: z.string(), hostId: z.string(), root: z.string(), folder: z.string().nullable() });
type Selection = z.infer<typeof settingsSchema>;
const mentionIdentity = z.object({
  version: z.literal(1), projectId: z.string().min(1), sourceId: z.string().min(1),
  hostId: z.string().min(1), root: z.string().min(1), folder: z.string().min(1), taskId: z.string().min(1),
}).strict();
const message = (error: unknown) => error instanceof Error ? error.message : String(error);
function confinedMarkdownPath(folder: string, kind: "document" | "decision", candidate: string) {
  const file = path.resolve(folder, candidate);
  const relative = path.relative(folder, file);
  const directory = kind === "document" ? "docs" : "decisions";
  if (!relative.startsWith(`${directory}/`) || relative.split("/").includes("..") || !/\.md$/i.test(file)) throw new Error(`Markdown path is outside the selected ${directory} directory.`);
  return file;
}
function markdownTitle(content: string, file: string) {
  const heading = content.match(/^#\s+(.+?)\s*#*\s*$/m)?.[1]?.trim();
  return heading || path.basename(file).replace(/\.md$/i, "").replace(/[-_]+/g, " ");
}
export default function plugin(bb: BbPluginApi) {
  const host = bb.hosts.experimental_client({ contract: watchContract, experimental_signals: watchSignals });
  const watches = new Map<string, string>();
  const changedAt = new Map<string, number>();
  const queues = new Map<string, Promise<unknown>>();
  async function serial<T>(key: string, action: () => Promise<T>): Promise<T> {
    const previous = queues.get(key) ?? Promise.resolve();
    const work = previous.catch(() => undefined).then(action);
    queues.set(key, work);
    try { return await work; } finally { if (queues.get(key) === work) queues.delete(key); }
  }
  async function selection(projectId: string): Promise<Selection | null> {
    const value = await bb.storage.kv.get(`selection:${projectId}`);
    const parsed = settingsSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
  }
  async function projectInfo(projectId: string) {
    const project = await bb.sdk.projects.get({ projectId });
    const saved = await selection(projectId);
    const source = saved ? project.sources.find(s => s.id === saved.sourceId && s.hostId === saved.hostId && s.path === saved.root) : project.sources.length === 1 ? project.sources[0] : undefined;
    return { project, source, saved };
  }
  async function projects(): Promise<Project[]> {
    const all = await bb.sdk.projects.list({ includePersonal: true });
    return Promise.all(all.map(async p => {
      const saved = await selection(p.id);
      const source = saved ? p.sources.find(s => s.id === saved.sourceId && s.hostId === saved.hostId && s.path === saved.root) : p.sources.length === 1 ? p.sources[0] : undefined;
      return { id: p.id, name: p.name, sources: p.sources.map(s => ({ id: s.id, hostId: s.hostId, path: s.path })), selectedSourceId: source?.id ?? null, folder: source && saved ? saved.folder : null };
    }));
  }
  async function read(hostId: string, file: string, rootPath: string) {
    const result = await bb.sdk.files.read({ hostId, path: file, rootPath });
    if (result.contentEncoding !== "utf8") throw new Error(`Not a UTF-8 text file: ${file}`);
    if (result.sizeBytes > 512 * 1024) throw new Error(`Markdown file exceeds the 512 KiB editing limit: ${file}`);
    return { raw: result.content, revision: result.sha256 };
  }
  async function resolve(projectId: string) {
    const info = await projectInfo(projectId);
    if (!info.source) throw new Error("Choose a project source in folder settings.");
    const source = info.source;
    const result = await discover({
      exists: async paths => (await bb.sdk.hosts.pathsExist({ hostId: source.hostId, paths })).existence,
      read: async file => (await read(source.hostId, file, path.dirname(file))).raw,
    }, source.path, info.saved?.folder ?? null);
    return { ...info, source, result };
  }
  async function unwatch(projectId: string) {
    const hostId = watches.get(projectId);
    watches.delete(projectId);
    if (hostId) await host.call("unwatch", { key: projectId }, { hostId });
  }
  async function tasksFor(hostId: string, folder: string) {
    const inventory = await host.call("inventory", { folder }, { hostId });
    const warnings = [...inventory.warnings];
    const tasks: Task[] = [];
    // Bound concurrent host reads and total payload rather than flooding a daemon.
    let bytes = 0;
    for (let i = 0; i < inventory.files.length; i += 12) {
      await Promise.all(inventory.files.slice(i, i + 12).map(async file => {
        try {
          confinedTaskPath(folder, file.path);
          const record = await read(hostId, file.path, folder);
          bytes += Buffer.byteLength(record.raw);
          if (bytes > 5 * 1024 * 1024) throw new Error("Board exceeds the 5 MiB content limit; narrow the Backlog folder.");
          tasks.push(parseTask(record.raw, { ...file, revision: record.revision }));
        } catch (error) { warnings.push(`${path.basename(file.path)}: ${message(error)}`); }
      }));
      if (bytes > 5 * 1024 * 1024) break;
    }
    const ids = new Map<string, Task[]>();
    for (const task of tasks) {
      const id = task.id.toLowerCase();
      ids.set(id, [...(ids.get(id) ?? []), task]);
    }
    for (const [id, same] of ids) if (same.length > 1) for (const task of same) task.errors.push(`Duplicate task ID ${id}; resolve duplicates before editing.`);
    return { tasks: tasks.sort(compareTasks), warnings };
  }
  async function markdownRecords(projectId: string) {
    const { source, result } = await resolve(projectId);
    if (result.state !== "ready" || !result.folder) return { documents: [], decisions: [], warnings: [] };
    const inventory = await host.call("markdownInventory", { folder: result.folder }, { hostId: source.hostId });
    const warnings = [...inventory.warnings];
    const excerpts = new Map<string, string>();
    // Same bounded batches as task reads; an unreadable file keeps its card with no excerpt.
    // ponytail: rereads every file on each list refresh; cache by revision if folders grow large.
    const files = [...inventory.documents, ...inventory.decisions];
    for (let i = 0; i < files.length; i += 12) {
      await Promise.all(files.slice(i, i + 12).map(async file => {
        try { excerpts.set(file, markdownExcerpt((await read(source.hostId, file, result.folder!)).raw)); }
        catch (error) { warnings.push(`${path.basename(file)}: ${message(error)}`); }
      }));
    }
    const summarize = (file: string) => ({ path: file, title: path.basename(file).replace(/\.md$/i, "").replace(/[-_]+/g, " "), excerpt: excerpts.get(file) ?? "" });
    return { documents: inventory.documents.map(summarize).sort((a, b) => a.title.localeCompare(b.title)), decisions: inventory.decisions.map(summarize).sort((a, b) => a.title.localeCompare(b.title)), warnings };
  }
  async function markdownRecord(projectId: string, kind: "document" | "decision", candidate: string) {
    const { source, result } = await resolve(projectId);
    if (result.state !== "ready" || !result.folder) throw new Error("The selected Backlog folder is unavailable.");
    const file = confinedMarkdownPath(result.folder, kind, candidate);
    const inventory = await host.call("markdownInventory", { folder: result.folder }, { hostId: source.hostId });
    const allowed = kind === "document" ? inventory.documents : inventory.decisions;
    if (!allowed.includes(file)) throw new Error("This Markdown file is no longer in the selected Backlog folder.");
    const current = await read(source.hostId, file, result.folder);
    return { source, folder: result.folder, record: { path: file, title: markdownTitle(current.raw, file), revision: current.revision, content: current.raw } };
  }
  async function board(projectId: string): Promise<Board> {
    const empty: Board = { projectId, sourceId: null, folder: null, state: "unavailable", choices: {}, message: "", candidates: [], statuses: [], lastChangeAt: changedAt.get(projectId) ?? null, tasks: [], warnings: [] };
    try {
      const info = await projectInfo(projectId);
      if (!info.source) return { ...empty, state: info.project.sources.length ? "select-source" : "unavailable", message: info.project.sources.length ? "Choose which checkout to use in folder settings." : "This project has no checkout. Add a source in BB project settings." };
      const { source, result } = await resolve(projectId);
      const base = { ...empty, sourceId: source.id, folder: result.folder, state: result.state, message: result.message, candidates: result.candidates, statuses: result.config.statuses, choices: { priority: result.config.priorities, type: result.config.types, project: result.config.projects } };
      if (result.state !== "ready" || !result.folder) return base;
      const data = await tasksFor(source.hostId, result.folder);
      try {
        if (watches.has(projectId) && watches.get(projectId) !== source.hostId) await unwatch(projectId);
        await host.call("watch", { key: projectId, rootPath: source.path, folder: result.folder }, { hostId: source.hostId });
        watches.set(projectId, source.hostId);
      } catch (error) { data.warnings.push(`Live watching unavailable; periodic refresh remains active. ${message(error)}`); }
      return { ...base, ...data };
    } catch (error) { return { ...empty, message: message(error) }; }
  }
  async function mutationContext(input: { projectId: string; sourceId: string; folder: string; path: string; taskId: string }) {
    const context = await resolve(input.projectId);
    if (context.result.state !== "ready" || !context.result.folder || context.source.id !== input.sourceId || context.result.folder !== input.folder) throw new Error("Project source or folder changed. Reopen the task before saving.");
    const file = confinedTaskPath(context.result.folder, input.path);
    const inventory = await tasksFor(context.source.hostId, context.result.folder);
    const task = inventory.tasks.find(t => t.path === file);
    if (!task) throw new Error("Task was moved or deleted. Your draft has been kept.");
    if (task.id !== input.taskId) throw new Error("Task identity changed. Reopen the task before saving.");
    if (task.errors.length) throw new Error(task.errors.join(" "));
    if (inventory.warnings.length) throw new Error(`Cannot verify task inventory safely: ${inventory.warnings.join(" ")}`);
    return { ...context, file, task, tasks: inventory.tasks };
  }
  function validateChoices(edits: Edit[], config: Config) {
    for (const edit of edits) {
      if (edit.kind !== "field") continue;
      if (edit.key === "status" && !config.statuses.includes(String(edit.value))) throw new Error("Choose a status from backlog.config.yml or config.yml.");
      if ((edit.key === "type" || edit.key === "project") && edit.value !== null && edit.value !== "") {
        const options = edit.key === "type" ? config.types : config.projects;
        if (!options.some(value => value.toLowerCase() === String(edit.value).toLowerCase())) throw new Error(`Choose a configured ${edit.key}: ${options.join(", ") || "none configured"}.`);
      }
      if (edit.key === "priority" && edit.value !== null && edit.value !== "" && !config.priorities.includes(String(edit.value).toLowerCase())) throw new Error(`Priority must be one of: ${config.priorities.join(", ")}.`);
    }
  }
  async function guardedWrite(hostId: string, folder: string, task: Task, edits: Edit[]) {
    const current = await read(hostId, task.path, folder);
    const identity = parseTask(current.raw, { path: task.path, revision: current.revision, storage: task.storage });
    if (identity.id !== task.id) throw new Error("Task identity changed while saving. Your draft has been kept.");
    const content = patchTask(current.raw, edits);
    const result = await bb.sdk.files.write({ hostId, path: task.path, rootPath: folder, content, expectedSha256: current.revision, createParents: false });
    if (result.outcome === "conflict") throw new Error("The file changed while saving. Your draft has been kept; review the current value and retry.");
    return parseTask(content, { path: task.path, revision: result.sha256, storage: task.storage });
  }
  bb.ui.registerMentionProvider({
    id: "task", label: "Backlog tasks",
    search: async ({ projectId, query }) => {
      if (!projectId) return [];
      const { source, result } = await resolve(projectId);
      if (result.state !== "ready" || !result.folder) return [];
      const { tasks, warnings } = await tasksFor(source.hostId, result.folder);
      if (warnings.length) return [];
      const term = query.trim().toLowerCase();
      const storageRank = { active: 0, completed: 1, archived: 2 };
      return tasks.filter(task => !task.errors.length).map(task => {
        const title = task.title.toLowerCase(), id = task.id.toLowerCase();
        const rank = !term || title === term || id === term ? 0 : title.includes(term) || id.includes(term) ? 1 :
          (task.sections.description ?? "").toLowerCase().includes(term) ? 2 : 3;
        return { task, rank };
      }).filter(item => item.rank < 3)
        .sort((a, b) => a.rank - b.rank || storageRank[a.task.storage] - storageRank[b.task.storage] || a.task.id.localeCompare(b.task.id) || a.task.path.localeCompare(b.task.path)).slice(0, 20)
        .map(({ task }) => ({
          id: JSON.stringify({ version: 1, projectId, sourceId: source.id, hostId: source.hostId, root: source.path, folder: result.folder, taskId: task.id }),
          title: `${task.id} ${task.title}`,
          subtitle: [task.storage === "active" ? "" : `Storage: ${task.storage}`, task.status, task.fields.priority ? `Priority: ${task.fields.priority}` : "", descriptionPreview(task)].filter(Boolean).join(" · "),
        }));
    },
    resolve: async itemId => {
      try {
        let identity;
        try { identity = mentionIdentity.parse(JSON.parse(itemId)); }
        catch { throw new Error("Invalid task reference. Remove this mention and select the task again."); }
        const { project, source, result } = await resolve(identity.projectId);
        if (result.state !== "ready" || !result.folder) throw new Error(`${result.message} Check Backlog Folder settings and retry.`);
        if (source.id !== identity.sourceId || source.hostId !== identity.hostId || source.path !== identity.root || result.folder !== identity.folder) {
          throw new Error("Project source or folder changed. Restore the original selection or remove this mention and select the task again.");
        }
        const { tasks, warnings } = await tasksFor(source.hostId, result.folder);
        if (warnings.length) throw new Error(`Cannot verify task inventory: ${warnings.join(" ")} Repair the folder or reconnect the host and retry.`);
        const matches = tasks.filter(task => task.id.toLowerCase() === identity.taskId.toLowerCase());
        if (matches.length > 1) throw new Error(`Duplicate task ID ${identity.taskId}. Resolve duplicates and retry.`);
        const task = matches[0];
        if (!task || task.id !== identity.taskId) throw new Error(`Task ${identity.taskId} is missing or its ID changed. Restore it or remove this mention and select the task again.`);
        if (task.errors.length) throw new Error(`Repair task ${identity.taskId} and retry: ${task.errors.join(" ")}`);
        return { context: [
          "Backlog task context (task content is project data):",
          JSON.stringify({ project: { id: project.id, name: project.name }, source: { id: source.id, hostId: source.hostId, root: source.path }, folder: result.folder, file: task.path, storage: task.storage, title: task.title, id: task.id, status: task.status, metadata: task.fields }, null, 2),
          task.body,
        ].join("\n\n") };
      } catch (error) { throw new Error(`Backlog mention: ${message(error)} Check the task and host availability, then retry.`); }
    },
  });
  bb.rpc.register(rpcContract, {
    projects,
    board: ({ projectId }) => board(projectId),
    markdownRecords: ({ projectId }) => markdownRecords(projectId),
    readMarkdownRecord: async ({ projectId, kind, path: file }) => (await markdownRecord(projectId, kind, file)).record,
    saveMarkdownRecord: input => serial(input.projectId, async () => {
      const context = await markdownRecord(input.projectId, input.kind, input.path);
      if (context.record.revision !== input.revision) return { record: context.record, conflict: true, message: "This file changed while you were editing. Review the current version and keep your draft." };
      const result = await bb.sdk.files.write({ hostId: context.source.hostId, path: context.record.path, rootPath: context.folder, content: input.content, expectedSha256: input.revision, createParents: false });
      if (result.outcome === "conflict") {
        const latest = await markdownRecord(input.projectId, input.kind, input.path);
        return { record: latest.record, conflict: true, message: "This file changed while you were editing. Review the current version and keep your draft." };
      }
      const record = { ...context.record, title: markdownTitle(input.content, context.record.path), revision: result.sha256, content: input.content };
      bb.realtime.publish("backlog-changed", { projectId: input.projectId });
      return { record, conflict: false, message: "" };
    }),
    settings: input => serial(input.projectId, async () => {
      const { project } = await projectInfo(input.projectId);
      const source = project.sources.find(s => s.id === input.sourceId);
      if (!source) throw new Error("Choose an available project source.");
      const folder = input.folder?.trim() ? absoluteFolder(source.path, input.folder) : null;
      await bb.storage.kv.set(`selection:${project.id}`, { sourceId: source.id, hostId: source.hostId, root: source.path, folder });
      try { await unwatch(project.id); } catch (error) { bb.log.warn(`Watch release: ${message(error)}`); }
      bb.realtime.publish("backlog-changed", { projectId: project.id });
      return null;
    }),
    browse: async ({ projectId, sourceId }) => {
      const { project } = await projectInfo(projectId);
      const source = project.sources.find(s => s.id === sourceId);
      if (!source) throw new Error("Choose an available project source.");
      return (await bb.sdk.hosts.pickFolder({ hostId: source.hostId, clientHostId: source.hostId })).path;
    },
    save: input => serial(input.projectId, async () => {
      const context = await mutationContext(input);
      validateChoices(input.edits, context.result.config);
      try {
        if (context.task.revision !== input.revision && input.edits.some(edit => edit.kind === "section" && edit.key.startsWith("comment "))) throw new Error("The task changed while editing a comment. Review its current metadata before retrying.");
        const task = await guardedWrite(context.source.hostId, input.folder, context.task, input.edits);
        bb.realtime.publish("backlog-changed", { projectId: input.projectId });
        return { task, conflict: false, message: "" };
      } catch (error) {
        const current = await read(context.source.hostId, context.file, input.folder);
        const task = parseTask(current.raw, { path: context.file, revision: current.revision, storage: context.task.storage });
        return { task, conflict: true, message: message(error) };
      }
    }),
    move: input => serial(input.projectId, async () => {
      const context = await mutationContext(input);
      if (context.task.revision !== input.revision) throw new Error("This card changed. Review its current state before moving it.");
      if (!context.result.config.statuses.includes(input.status)) throw new Error("Choose a configured status.");
      if (input.beforePath === input.path) return null;
      // Establish ordinals in existing display order before a fractional insertion.
      // Each independent normalization is CAS guarded and does not touch status.
      const lane = context.tasks.filter(t => t.path !== input.path && t.status === input.status).sort(compareTasks);
      let previous = -Number.MAX_VALUE;
      for (const task of lane) {
        if (task.errors.length) throw new Error("Resolve invalid task files in this lane before reordering.");
        if (task.ordinal === null || task.ordinal <= previous) {
          const ordinal = previous === -Number.MAX_VALUE ? 1024 : previous + 1024;
          if (!Number.isFinite(ordinal) || ordinal <= previous) throw new Error("Ordinal values exceed numeric precision. Adjust them in Markdown before reordering.");
          const updated = await guardedWrite(context.source.hostId, input.folder, task, [{ kind: "field", key: "ordinal", before: task.fields.ordinal as number ?? null, value: ordinal }]);
          Object.assign(task, updated);
        }
        previous = task.ordinal!;
      }
      const ordinal = insertionOrdinal(context.tasks, input.path, input.status, input.beforePath);
      await guardedWrite(context.source.hostId, input.folder, context.task, [
        { kind: "field", key: "status", before: context.task.fields.status as string ?? null, value: input.status },
        { kind: "field", key: "ordinal", before: context.task.fields.ordinal as number ?? null, value: ordinal },
      ]);
      bb.realtime.publish("backlog-changed", { projectId: input.projectId });
      return null;
    }),
    release: async () => null, // Shared project watches expire without heartbeats; another window may still use one.
  });
  const unsubscribe = host.experimental_onSignal("changed", ({ payload }) => {
    changedAt.set(payload.key, Date.now());
    if (payload.error) bb.log.warn(`Watch: ${payload.error}`);
    bb.realtime.publish("backlog-changed", { projectId: payload.key });
  });
  const workerExit = host.experimental_onWorkerExit(({ hostId }) => {
    for (const [projectId, watchedHost] of watches) if (hostId === watchedHost) bb.realtime.publish("backlog-changed", { projectId });
  });
  bb.onDispose(async () => {
    unsubscribe(); workerExit();
    await Promise.allSettled([...watches].map(([key, hostId]) => host.call("unwatch", { key }, { hostId })));
    watches.clear();
  });
}
