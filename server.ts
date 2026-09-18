import type { BbPluginApi } from "@get-bb/plugin-sdk";
import { posix as path } from "node:path";
import { z } from "zod";
import { rpcContract } from "./src/contract";
import { watchContract, watchSignals } from "./src/watch-contract";
import { discover, confinedTaskPath, absoluteFolder, type Config } from "./src/discovery";
import { parseTask, patchTask } from "./src/task-format";
import { compareTasks, insertionOrdinal } from "./src/ordering";
import type { Board, Project, Task, Edit } from "./src/model";
export { rpcContract } from "./src/contract";

const settingsSchema = z.object({ sourceId: z.string(), hostId: z.string(), root: z.string(), folder: z.string().nullable() });
type Selection = z.infer<typeof settingsSchema>;
const message = (error: unknown) => error instanceof Error ? error.message : String(error);
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
    if (result.sizeBytes > 512 * 1024) throw new Error(`Task exceeds the 512 KiB editing limit: ${file}`);
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
    for (const task of tasks) ids.set(task.id, [...(ids.get(task.id) ?? []), task]);
    for (const [id, same] of ids) if (same.length > 1) for (const task of same) task.errors.push(`Duplicate task ID ${id}; resolve duplicates before editing.`);
    return { tasks: tasks.sort(compareTasks), warnings };
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
  bb.rpc.register(rpcContract, {
    projects,
    board: ({ projectId }) => board(projectId),
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
