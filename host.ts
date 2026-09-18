import { experimental_defineHostEntry, type ExperimentalHostRpcContext, type ExperimentalHostWatchEvent } from "@get-bb/plugin-sdk";
import { lstat, readdir } from "node:fs/promises";
import { join, resolve, relative, sep, isAbsolute } from "node:path";
import { watchContract, watchSignals } from "./src/watch-contract";
type Context = ExperimentalHostRpcContext<typeof watchSignals>;
type Subscription = { dispose(): Promise<void> };
interface Entry { root: string; folder: string; seen: number; subs: Subscription[]; context: Context }
const entries = new Map<string, Entry>();
const operations = new Map<string, Promise<void>>();
let timer: ReturnType<typeof setInterval> | undefined;
function queue(key: string, action: () => Promise<void>): Promise<void> {
 const previous = operations.get(key) ?? Promise.resolve();
 const next = previous.catch(() => undefined).then(action);
 operations.set(key, next);
 void next.then(() => { if (operations.get(key) === next) operations.delete(key); }, () => { if (operations.get(key) === next) operations.delete(key); });
 return next;
}
const under = (file: string, root: string) => { const part = relative(root, file); return part === "" || (part !== ".." && !part.startsWith(`..${sep}`) && !isAbsolute(part)); };
async function disposeEntry(key: string) {
 const entry = entries.get(key);
 if (!entry) return;
 entries.delete(key);
 const results = await Promise.allSettled(entry.subs.map(sub => sub.dispose()));
 const error = results.find(result => result.status === "rejected");
 if (error?.status === "rejected") throw error.reason;
}
function startExpiry() {
 if (timer) return;
 timer = setInterval(() => {
  for (const [key, entry] of entries) if (Date.now() - entry.seen > 30_000) {
   void queue(key, () => disposeEntry(key)).catch(error => entry.context.experimental_emitSignal("changed", { key, error: `Watch cleanup failed: ${String(error)}` }));
  }
 }, 5000);
 timer.unref();
}
async function inventory(folder: string) {
 if (!isAbsolute(folder)) throw new Error("Backlog folder must be absolute.");
 const root = resolve(folder);
 const rootStat = await lstat(root);
 if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error("Select a real Backlog directory, not a symbolic link.");
 const files: Array<{ path: string; storage: "active" | "completed" | "archived" }> = [];
 const warnings: string[] = [];
 let directories = 0;
 async function walk(dir: string, depth: number, storage: "active" | "completed" | "archived") {
  if (depth > 16 || ++directories > 100) { warnings.push("Directory scan limit reached. Narrow the Backlog folder."); return; }
  for (const item of await readdir(dir, { withFileTypes: true })) {
   const file = join(dir, item.name);
   if (item.isSymbolicLink()) { warnings.push(`Symbolic link skipped: ${file}`); continue; }
   if (item.isDirectory()) await walk(file, depth + 1, storage);
   else if (item.isFile() && /\.md$/i.test(item.name)) {
    if (files.length >= 3000) { warnings.push("Task scan limit of 3000 files reached."); return; }
    files.push({ path: file, storage });
   }
   if (directories > 100 || files.length >= 3000) return;
  }
 }
 for (const [parts, storage] of [[ ["tasks"], "active" ], [ ["completed"], "completed" ], [ ["archive", "tasks"], "archived" ]] as const) {
  let current = root, usable = true;
  for (const part of parts) {
   current = join(current, part);
   let stat;
   try { stat = await lstat(current); }
   catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") { usable = false; break; } throw error; }
   if (stat.isSymbolicLink()) { warnings.push(`Symbolic link skipped: ${current}`); usable = false; break; }
   if (!stat.isDirectory()) throw new Error(`Task storage is not a directory: ${current}`);
  }
  if (usable) await walk(current, 1, storage);
 }
 return { files, warnings };
}
export default experimental_defineHostEntry({
 contract: watchContract, experimental_signals: watchSignals,
 handlers: {
  inventory: ({ folder }) => inventory(folder),
  watch: async ({ key, rootPath, folder }, context) => {
   if (!isAbsolute(rootPath) || !isAbsolute(folder)) throw new Error("Watch paths must be absolute.");
   await queue(key, async () => {
    const root = resolve(rootPath), selected = resolve(folder), old = entries.get(key);
    if (old && old.root === root && old.folder === selected) { old.seen = Date.now(); old.context = context; return; }
    await disposeEntry(key);
    const entry: Entry = { root, folder: selected, seen: Date.now(), subs: [], context };
    entries.set(key, entry);
    const listener = (watchRoot: string) => async (event: ExperimentalHostWatchEvent) => {
     if (entries.get(key) !== entry) return;
     if (event.kind === "watch-error") { await entry.context.experimental_emitSignal("changed", { key, error: event.message }); return; }
     if (event.kind === "rescan-required" || event.changes.some(change => {
      const file = resolve(watchRoot, change.path);
      return under(file, selected) || file === join(root, "backlog.config.yml") || file === selected || under(selected, file);
     })) await entry.context.experimental_emitSignal("changed", { key });
    };
    try {
     entry.subs.push(await context.experimental_watch({ rootPath: root, ignoredPaths: [".git/**", "node_modules/**", ".mise-data/**", ".mise-cache/**", ".bun-cache/**"], debounceMs: 75, maxWaitMs: 300 }, listener(root)));
     if (!under(selected, root)) entry.subs.push(await context.experimental_watch({ rootPath: selected, debounceMs: 75, maxWaitMs: 300 }, listener(selected)));
    } catch (error) { await disposeEntry(key); throw error; }
    startExpiry();
   });
   return null;
  },
  unwatch: async ({ key }) => { await queue(key, () => disposeEntry(key)); return null; },
 },
 dispose: async () => {
  if (timer) clearInterval(timer); timer = undefined;
  await Promise.all([...new Set([...entries.keys(), ...operations.keys()])].map(key => queue(key, () => disposeEntry(key))));
 },
});
