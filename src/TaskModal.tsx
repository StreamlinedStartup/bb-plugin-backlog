import AssigneeAvatar from "./AssigneeAvatar";
import { useEffect, useRef, useState } from "react";
import { editSchema, type Edit, type FieldValue, type Task } from "./model";
import { editableSectionLabels, fieldLabels, listFields } from "./task-format";
import Markdown from "./Markdown";
import { childTasks, parentTask, assignees } from "./task-relations";
export type SaveResult = { task: Task; conflict: boolean; message: string };
const display = (value: unknown) => value === null || value === undefined || value === "" ? "Not set" : Array.isArray(value) ? value.join(", ") || "Not set" : typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
const inputValue = (value: unknown) => Array.isArray(value) ? value.join("\n") : value === null || value === undefined ? "" : String(value);
interface Draft { kind: "field" | "section"; key: string; before: FieldValue; text: string; revision?: string }
function restoreDraft(key: string): { draft: Draft | null; recovery: string | null; message: string } {
 let stored: string | null = null;
 try {
  stored = sessionStorage.getItem(key);
  if (!stored) return { draft: null, recovery: null, message: "" };
  const candidate = JSON.parse(stored);
  const valid = editSchema.safeParse({ ...candidate, value: candidate.text });
  if (!valid.success || typeof candidate.text !== "string") throw new Error("Unrecognized draft format");
  return { draft: { kind: valid.data.kind, key: valid.data.key, before: valid.data.before, text: candidate.text, revision: typeof candidate.revision === "string" ? candidate.revision : undefined }, recovery: null, message: "Recovered your unsaved draft from this browser session." };
 } catch {
  return { draft: null, recovery: stored, message: "Saved draft storage could not be read. Any stored text is retained below for recovery." };
 }
}
export default function TaskModal({ task, statuses, relatedTasks = [], onOpenTask, fieldChoices = {}, draftStorageKey = task.path, missing = false, onClose, onSave }: { task: Task; draftStorageKey?: string; statuses: string[]; relatedTasks?: Task[]; onOpenTask?: (task: Task) => void; fieldChoices?: Record<string, string[]>; missing?: boolean; onClose: () => void; onSave: (edits: Edit[], baseRevision?: string) => Promise<SaveResult> }) {
 const [current, setCurrent] = useState(task);
 const storageKey = `bb-backlog-draft:${draftStorageKey}`;
 const [restored] = useState(() => restoreDraft(storageKey));
 const [recovery, setRecovery] = useState(restored.recovery);
 const [draft, setDraft] = useState<Draft | null>(restored.draft);
 const [error, setError] = useState(restored.message);
 const [conflict, setConflict] = useState(false);
 const [pending, setPending] = useState(false);
 const dialog = useRef<HTMLDialogElement>(null);
 const editor = useRef<HTMLTextAreaElement>(null);
 const draftRef = useRef(draft); draftRef.current = draft;
 useEffect(() => { setCurrent(task); }, [task]);
 useEffect(() => {
  try { if (draft) sessionStorage.setItem(storageKey, JSON.stringify(draft)); else if (!recovery) sessionStorage.removeItem(storageKey); }
  catch { if (draft) setError("This browser cannot retain drafts across page reloads. Keep this task open until you save or cancel."); }
 }, [draft, storageKey, recovery]);
 useEffect(() => {
  const warn = (event: BeforeUnloadEvent) => { if (draftRef.current) { event.preventDefault(); event.returnValue = ""; } };
  window.addEventListener("beforeunload", warn);
  return () => window.removeEventListener("beforeunload", warn);
 }, []);
 useEffect(() => {
  const element = dialog.current!;
  const previous = document.activeElement as HTMLElement | null;
  element.showModal();
  return () => { element.close(); previous?.focus(); };
 }, []);
 useEffect(() => { if (draft) editor.current?.focus(); }, [draft?.kind, draft?.key]);
 const start = (kind: Draft["kind"], key: string) => {
  if (recovery) { setError("Copy the saved draft below, then explicitly discard it before starting another edit."); return; }
  if (draft || pending) { setError("Save or cancel the active edit first."); return; }
  const value = kind === "field" ? current.fields[key] ?? null : current.sections[key] ?? null;
  setDraft({ kind, key, before: value as FieldValue, text: inputValue(value), revision: current.revision });
  setConflict(false); setError("");
 };
 const cancel = () => { if (pending) return; setDraft(null); setConflict(false); setError(""); };
 const close = () => { if (draftRef.current || pending) { setError("Save or cancel your edit before closing this task."); return; } onClose(); };
 const save = async () => {
  if (!draft || pending) return;
  setPending(true); setError("");
  try {
   const value: FieldValue = draft.kind === "section" ? draft.text : listFields.has(draft.key) ? draft.text.split("\n").map(s => s.trim()).filter(Boolean) : draft.text || null;
   const result = await onSave([{ kind: draft.kind, key: draft.key, before: draft.before, value }], draft.revision);
   setCurrent(result.task);
   if (result.conflict) { setConflict(true); setError(result.message); }
   else { setDraft(null); setConflict(false); }
  } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  finally { setPending(false); }
 };
 const rebase = () => {
  if (!draft) return;
  const value = draft.kind === "field" ? current.fields[draft.key] ?? null : current.sections[draft.key] ?? null;
  setDraft({ ...draft, before: value as FieldValue, revision: current.revision }); setConflict(false); setError("Draft kept. Save changes to replace the current value shown above.");
 };
 const editableSections = Object.keys(editableSectionLabels);
 const children = childTasks(current, relatedTasks);
 const parent = parentTask(current, relatedTasks);
 const doneChildren = children.filter(child => child.status === statuses.at(-1)).length;
 const openRelated = (task: Task) => {
  if (draft || pending || recovery) { setError("Save or cancel your edit before opening another task."); return; }
  onOpenTask?.(task);
 };
 return <dialog ref={dialog} className="backlog-modal" aria-labelledby="task-modal-title" onCancel={event => { event.preventDefault(); if (pending) return; if (draft) cancel(); else onClose(); }}>
  <div className="task-modal">
   <header className="modal-header"><div><span className="task-id">{current.id} / {current.storage}</span><h2 id="task-modal-title" onDoubleClick={() => start("field", "title")}>{current.title}<button className="inline-edit" onClick={() => start("field", "title")} aria-label="Edit title">Edit</button></h2></div><button onClick={close} aria-label="Close task">Close</button></header>
   {recovery && <section className="notice error"><h3>Saved draft recovery</h3><pre>{recovery}</pre><button onClick={() => setRecovery(null)}>Discard unreadable saved draft</button></section>}
   {missing && <p role="alert" className="notice error">This task is no longer in the current snapshot. Your draft is still here. Check whether the file moved or the source is unavailable.</p>}
   {current.errors.map((text, i) => <p className="notice error" key={i}>{text}</p>)}
   <dl className="detail-grid">{Object.entries(fieldLabels).filter(([key]) => key !== "title" && key !== "ordinal").map(([key, label]) => <div key={key} onDoubleClick={() => start("field", key)}><dt>{label}<button className="inline-edit" aria-label={`Edit ${label.toLowerCase()}`} onClick={() => start("field", key)}>Edit</button></dt><dd>{key === "assignee" && assignees(current).length ? <span className="detail-assignees">{assignees(current).map(person => <span key={person}><AssigneeAvatar name={person} />{person}</span>)}</span> : display(current.fields[key])}</dd></div>)}</dl>
   {parent && <button className="parent-task-link" onClick={() => openRelated(parent)}>Parent task <span>{parent.id}</span> {parent.title}</button>}
   {children.length > 0 && <section className="subtasks-panel" aria-label="Subtasks">
    <header><h3>Subtasks <span>{children.length}</span></h3><div><span>{doneChildren} of {children.length} complete</span><progress aria-label="Subtasks completion" value={doneChildren} max={children.length} /></div></header>
    <div className="subtask-list">{children.map(child => {
     const person = assignees(child)[0]; const done = child.status === statuses.at(-1);
     return <button className="subtask-row" key={child.path} onClick={() => openRelated(child)}>
      <span className={done ? "subtask-check checked" : "subtask-check"} aria-label={done ? "Complete" : "Not complete"}>{done && <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8 3 3 7-7" /></svg>}</span>
      <span className="subtask-identity"><span>{child.id}</span><strong>{child.title}</strong></span>
      <span className="subtask-status" data-done={done}>{child.status || "No status"}</span>
      {person && <AssigneeAvatar name={person} />}
     </button>;
    })}</div>
   </section>}
   <details className="raw-fields"><summary>Identity and additional fields</summary><dl>{Object.entries(current.fields).filter(([key]) => !(key in fieldLabels)).map(([key, value]) => <div key={key}><dt>{key}</dt><dd><pre>{display(value)}</pre></dd></div>)}</dl></details>
   {draft && <section className="field-editor" aria-label="Active edit">
    <div className="editor-heading"><h3>Editing {fieldLabels[draft.key] ?? editableSectionLabels[draft.key] ?? draft.key}</h3><span>Draft stays here until Save or Cancel</span></div>
    {draft.kind === "field" && (draft.key === "status" || draft.key in fieldChoices) ? <select aria-label={`${fieldLabels[draft.key]} draft`} value={draft.text} onChange={e => setDraft({ ...draft, text: e.target.value })}>{draft.key !== "status" && <option value="">Not set</option>}{!(draft.key === "status" ? statuses : fieldChoices[draft.key]).includes(draft.text) && draft.text && <option>{draft.text}</option>}{(draft.key === "status" ? statuses : fieldChoices[draft.key]).map(value => <option key={value}>{value}</option>)}</select> : <textarea ref={editor} aria-label="Draft" rows={draft.kind === "section" ? 10 : listFields.has(draft.key) ? 4 : 2} value={draft.text} onChange={e => setDraft({ ...draft, text: e.target.value })} />}
    {listFields.has(draft.key) && <small>One value per line.</small>}
    {conflict && <div className="conflict"><h4>Current file value</h4><pre>{display(draft.kind === "field" ? current.fields[draft.key] : current.sections[draft.key])}</pre><p>Your draft remains in the editor above.</p><button onClick={rebase}>Use my draft over this value</button></div>}
    <div className="modal-actions"><button className="primary" onClick={() => void save()} disabled={pending || conflict || missing || current.errors.length > 0}>{pending ? "Saving..." : "Save changes"}</button><button disabled={pending} onClick={cancel}>Cancel edit</button></div>
   </section>}
   {error && <p className="notice error" role="alert">{error}</p>}
   <div className="section-tools"><label>Add or edit a section<select aria-label="Edit task section" value="" onChange={e => { if (e.target.value) start("section", e.target.value); }}><option value="">Choose section</option>{[...editableSections, ...Object.keys(current.sections).filter(key => key.startsWith("comment "))].map(key => <option key={key} value={key}>{editableSectionLabels[key] ?? key}</option>)}</select></label></div>
   <div className="modal-body"><Markdown onEditSection={key => start("section", key)} editable={editableSections}>{current.body}</Markdown></div>
  </div>
 </dialog>;
}
