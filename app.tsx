import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import { definePluginApp, useRealtime, useRealtimeConnectionState, useRpc } from "@get-bb/plugin-sdk/app";
import type { rpcContract } from "./src/contract";
import type { Board, Edit, Project, Task } from "./src/model";
import TaskModal from "./src/TaskModal";
import TaskCard from "./src/TaskCard";
import BoardControls from "./src/BoardControls";
import { selectBoardTasks, type BoardFilters } from "./src/board-controls";
import { childTasks } from "./src/task-relations";
import { mountMentionPreview } from "./src/mention-preview";
import "./app.css";
const STORAGE = { active: "Active tasks", completed: "Completed storage", archived: "Archived tasks", all: "All storage" };
const textError = (cause: unknown) => cause instanceof Error ? cause.message : String(cause);
function useBoard(id: string | null) {
 const rpc = useRpc<typeof rpcContract>();
 const connection = useRealtimeConnectionState();
 const [projects, setProjects] = useState<Project[]>([]);
 const [board, setBoard] = useState<Board | null>(null);
 const [error, setError] = useState("");
 const generation = useRef(0);
 const serial = useRef(0);
 const load = useCallback(async () => {
  const token = generation.current, request = ++serial.current;
  try {
   const [all, snapshot] = await Promise.all([rpc.call("projects", null), id ? rpc.call("board", { projectId: id }) : Promise.resolve(null)]);
   if (token !== generation.current || request !== serial.current) return;
   setProjects(all); setBoard(snapshot); setError("");
  } catch (cause) { if (token === generation.current && request === serial.current) setError(textError(cause)); }
 }, [id, rpc]);
 useEffect(() => {
  generation.current++; setBoard(null); void load();
  const timer = setInterval(() => void load(), 5000);
  return () => { generation.current++; clearInterval(timer); if (id) void rpc.call("release", { projectId: id }).catch(() => undefined); };
 }, [load, id, rpc]);
 useEffect(() => { if (connection === "connected") void load(); }, [connection, load]);
 useRealtime("backlog-changed", () => void load());
 return { rpc, projects, board, error, load, connection };
}
function FolderSettings({ project, close, saved, rpc }: { project: Project; close: () => void; saved: () => Promise<void>; rpc: ReturnType<typeof useRpc<typeof rpcContract>> }) {
 const [sourceId, setSource] = useState(project.selectedSourceId ?? project.sources[0]?.id ?? "");
 const [folder, setFolder] = useState(project.folder ?? "");
 const [error, setError] = useState("");
 const [pending, setPending] = useState(false);
 const submit = async () => {
  setPending(true); setError("");
  try { await rpc.call("settings", { projectId: project.id, sourceId, folder: folder.trim() || null }); await saved(); close(); }
  catch (cause) { setError(textError(cause)); } finally { setPending(false); }
 };
 return <section className="folder-settings" aria-label="Project folder settings"><header><h2>Task source</h2><button onClick={close}>Close settings</button></header><label>Project checkout<select aria-label="Project checkout" value={sourceId} onChange={e => { setSource(e.target.value); setFolder(""); }}>{project.sources.map(source => <option key={source.id} value={source.id}>{source.path} ({source.hostId})</option>)}</select></label>{!project.sources.length && <p>Add a checkout in BB project settings to use this project.</p>}<label>Custom Backlog folder<input aria-label="Custom Backlog folder" placeholder="Automatic: backlog.config.yml, backlog/ or .backlog/" value={folder} onChange={e => setFolder(e.target.value)} /></label><p>Use an absolute path or a path relative to this checkout. Leave blank for automatic detection.</p><div className="modal-actions"><button disabled={!sourceId || pending} onClick={async () => { try { const result = await rpc.call("browse", { projectId: project.id, sourceId }); if (result) setFolder(result); } catch (cause) { setError(textError(cause)); } }}>Browse on source host</button><button className="primary" disabled={!sourceId || pending} onClick={() => void submit()}>Save settings</button></div>{error && <p role="alert" className="notice error">{error}</p>}</section>;
}
export function Page() {
 const [selected, setSelected] = useState<string | null>(null);
 const { rpc, projects, board, error, load, connection } = useBoard(selected);
 const [query, setQuery] = useState("");
 const [storage, setStorage] = useState("active");
 const [hideDone, setHideDone] = useState(false);
 const [boardFilters, setBoardFilters] = useState<BoardFilters>({ status: [], priority: [], assignee: "", labels: [], sort: "ordinal", direction: "asc" });
 const [modal, setModal] = useState<Task | null>(null);
 const [settings, setSettings] = useState(false);
 const [actionError, setActionError] = useState("");
 const [moving, setMoving] = useState(false);
 const dragged = useRef<Task | null>(null);
 useEffect(() => { if (!selected && projects[0]) setSelected((projects.find(project => project.sources.length > 0) ?? projects[0]).id); }, [projects, selected]);
 const project = projects.find(item => item.id === selected);
 const statuses = board?.statuses ?? [];
 const doneStatus = statuses.at(-1);
 const filterOptions = useMemo(() => {
  const tasks = board?.tasks ?? [];
  return { statuses: [...new Set([...statuses, ...tasks.map(task => task.status)])], priorities: [...new Set(tasks.map(task => String(task.fields.priority ?? "")).filter(Boolean))].sort(), assignees: [...new Set(tasks.flatMap(task => Array.isArray(task.fields.assignee) ? task.fields.assignee.map(String) : task.fields.assignee ? [String(task.fields.assignee)] : []))].sort(), labels: [...new Set(tasks.flatMap(task => Array.isArray(task.fields.labels) ? task.fields.labels.map(String) : []))].sort() };
 }, [board, statuses]);
 const items = useMemo(() => selectBoardTasks(board?.tasks.filter(task => (storage === "all" || task.storage === storage) && (!hideDone || task.status !== doneStatus) && `${task.id} ${task.title} ${task.body} ${JSON.stringify(task.fields)}`.toLowerCase().includes(query.toLowerCase())) ?? [], boardFilters), [board, storage, hideDone, doneStatus, query, boardFilters]);
 const laneStatuses = [...statuses, ...new Set(items.map(task => task.status).filter(status => !statuses.includes(status)))];
 const move = async (task: Task, status: string, beforePath: string | null) => {
  if (!board?.sourceId || !board.folder || moving) return;
  setMoving(true); setActionError("");
  try { await rpc.call("move", { projectId: board.projectId, sourceId: board.sourceId, folder: board.folder, path: task.path, taskId: task.id, revision: task.revision, status, beforePath }); }
  catch (cause) { setActionError(textError(cause)); }
  finally { await load(); setMoving(false); }
 };
 const drop = (event: DragEvent, status: string, beforePath: string | null) => {
  event.preventDefault(); event.stopPropagation();
  const task = dragged.current;
  dragged.current = null;
  if (task && task.path !== beforePath) void move(task, status, beforePath);
 };
 const save = async (edits: Edit[], baseRevision?: string) => {
  if (!modal || !board?.sourceId || !board.folder) throw new Error("The board is unavailable. Your draft is still here.");
  const result = await rpc.call("save", { projectId: board.projectId, sourceId: board.sourceId, folder: board.folder, path: modal.path, taskId: modal.id, revision: baseRevision ?? modal.revision, edits });
  setModal(result.task); await load(); return result;
 };
 const currentTask = modal ? board?.tasks.find(task => task.path === modal.path) ?? modal : null;
 return <div className="backlog-root">
  <aside className="section-nav" aria-label="Backlog.MD sections"><strong>Backlog.MD</strong><button className="section-link active" aria-current="page">Tasks</button></aside>
  <main className="board-area"><header className="toolbar"><div><h1>{project?.name ?? "Backlog.MD"}</h1><p>{board?.folder ?? "Markdown tasks across your projects"}</p></div><span className="connection">{moving ? "Saving move..." : connection === "connected" ? "Live updates" : "Reconnecting"}</span></header>
   <div className="controls"><input aria-label="Search tasks" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search tasks" /><select aria-label="Task storage" value={storage} onChange={event => setStorage(event.target.value)}>{Object.entries(STORAGE).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select><label className="completed-toggle"><input type="checkbox" checked={hideDone} onChange={event => setHideDone(event.target.checked)} />Hide {doneStatus || "completed"}</label><button disabled={!project} onClick={() => setSettings(!settings)}>Folder settings</button><button onClick={() => void load()}>Refresh</button></div>
   {board && <BoardControls filters={boardFilters} options={filterOptions} setFilters={setBoardFilters} />}
   {settings && project && <FolderSettings key={project.id} project={project} rpc={rpc} saved={load} close={() => setSettings(false)} />}
   {(error || actionError) && <p role="alert" className="notice error">{error || actionError}</p>}
   {board?.warnings.map((warning, index) => <p className="notice" key={index}>{warning}</p>)}
   {!board ? <div className="empty">{selected ? "Loading tasks..." : "Select a project to view its tasks."}</div> : board.state !== "ready" ? <div className="empty"><h2>{board.state === "ambiguous" ? "Choose a Backlog folder" : board.state === "missing" ? "Connect a task folder" : "Project source unavailable"}</h2><p>{board.message}</p>{board.candidates.map(candidate => <p key={candidate}>{candidate}</p>)}<button onClick={() => setSettings(true)}>Open folder settings</button></div> : <>
    {items.length === 0 && <p className="empty-hint">{board.tasks.length ? "No tasks match these filters." : "No task files yet. Tasks created in Markdown will appear here."}</p>}
    <p id="backlog-keyboard-help" className="visually-hidden">On a focused card, Enter opens the task. Alt plus Left or Right moves between statuses. Alt plus Up or Down reorders the lane.</p><div className="lanes">{laneStatuses.map(status => {
     const lane = items.filter(task => task.status === status);
     return <section className="lane" key={status} aria-label={`${status || "No status"} lane`} onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }} onDrop={event => drop(event, status, null)}><header><h2>{status || "No status"}</h2><span>{lane.length}</span></header>{!statuses.includes(status) && <p className="lane-warning">Status is not in configuration. Move cards to a configured lane.</p>}<div className="lane-cards">{lane.map((task, index) => <div className="drop-slot" key={task.path} onDragOver={event => event.preventDefault()} onDrop={event => drop(event, status, task.path)}><TaskCard task={task} subtaskCount={childTasks(task, board.tasks).length} statuses={statuses} open={() => setModal(task)} start={event => { dragged.current = task; event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", task.path); }} move={(target, before) => void move(task, target, before)} before={lane[index - 1]?.path ?? null} after={index === lane.length - 1 ? task.path : lane[index + 2]?.path ?? null} /></div>)}<div className="lane-empty">{lane.length ? "Drop to end" : "Drop tasks here"}</div></div></section>;
    })}</div>
   </>}
  </main>
  <aside className="project-rail" aria-label="BB projects"><div className="rail-heading"><h2>Projects</h2><span>{projects.length}</span></div>{projects.map(item => <button key={item.id} className={selected === item.id ? "project-row selected" : "project-row"} aria-current={selected === item.id ? "page" : undefined} onClick={() => { if (modal) return; setSelected(item.id); setSettings(false); setActionError(""); }}>{item.name}{!item.sources.length && <small>No source</small>}</button>)}</aside>
  {currentTask && <TaskModal key={currentTask.path} task={currentTask} draftStorageKey={`${selected}:${board?.sourceId}:${currentTask.path}`} statuses={statuses} relatedTasks={board?.tasks ?? []} onOpenTask={setModal} fieldChoices={board?.choices} missing={!board?.tasks.some(task => task.path === currentTask.path)} onClose={() => setModal(null)} onSave={save} />}
 </div>;
}
export default definePluginApp(app => { app.contentScripts.register({ id: "mention-preview", mount: mountMentionPreview }); app.slots.navPanel({ id: "backlog", title: "Backlog.MD", icon: "ListTodo", path: "backlog", component: Page }); });
