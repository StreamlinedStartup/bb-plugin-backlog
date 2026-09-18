import AssigneeAvatar from "./AssigneeAvatar";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { editSchema, type Edit, type FieldValue, type Task } from "./model";
import { editableSectionLabels, fieldLabels, listFields } from "./task-format";
import Markdown from "./Markdown";
import { childTasks, parentTask, assignees } from "./task-relations";
export type SaveResult = { task: Task; conflict: boolean; message: string };
const display = (value: unknown) => {
 if (value === null || value === undefined || value === "") return "Not set";
 if (Array.isArray(value)) return value.join(", ") || "Not set";
 if (typeof value === "object") return JSON.stringify(value, null, 2);
 return String(value);
};
const inputValue = (value: unknown) => {
 if (Array.isArray(value)) return value.join("\n");
 if (value === null || value === undefined) return "";
 return String(value);
};
const pathKeys = new Set(["references", "documentation", "modified_files"]);
const valueList = (value: unknown): string[] => {
 if (Array.isArray(value)) return value.map(String).filter(Boolean);
 if (value === null || value === undefined || value === "") return [];
 return [String(value)];
};
const shortenPath = (value: string) => {
 if (value.length <= 44 || !value.includes("/")) return value;
 const parts = value.split("/").filter(Boolean);
 return parts.length > 1 ? `…/${parts.slice(-2).join("/")}` : `…${value.slice(-41)}`;
};
const stateValue = (value: unknown) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
function PropertyList({ name, value }: { name: string; value: unknown }) {
 const values = valueList(value);
 if (!values.length) return <>Not set</>;
 return <span className="property-list">{values.map((item, index) => {
  const path = pathKeys.has(name) || item.includes("/");
  const label = path ? shortenPath(item) : item;
  const pathProps = path ? { title: item, "aria-label": item } : {};
  return <span className="property-chip" key={`${item}-${index}`} {...pathProps}>{label}</span>;
 })}</span>;
}
const propertyIcons: Record<string, string> = {
 status: "M4 7h16M4 12h10M4 17h16",
 type: "M4 5h16v14H4z",
 priority: "M12 4l2.2 4.7 5.2.8-3.7 3.7.9 5.2-4.6-2.5-4.6 2.5.9-5.2-3.7-3.7 5.2-.8z",
 assignee: "M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 7a6 6 0 0 1 12 0",
 reporter: "M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 7a6 6 0 0 1 12 0",
 labels: "M4 5h8l8 7-8 7H4z",
 milestone: "M5 19V5m0 0h12l-2 4 2 4H5",
 due_date: "M5 7h14v12H5zM8 4v6m8-6v6M5 11h14",
 project: "M4 7h6l2 2h8v10H4z",
 dependencies: "M8 12h8M10 8h2a4 4 0 0 1 0 8h-2M14 8h-2a4 4 0 0 0 0 8h2",
 references: "M5 5h14v14H5zM8 9h8M8 13h5",
 documentation: "M5 4h14v16H5zM8 8h8M8 12h8M8 16h5",
 modified_files: "M5 4h14v16H5zM8 8h8M8 12h5",
 created_date: "M5 5h14v14H5zM8 3v4m8-4v4M5 10h14",
 updated_date: "M5 5h14v14H5zM8 3v4m8-4v4M5 10h14M12 13v3l2 1",
};
function PropertyIcon({ name }: { name: string }) {
 return <svg className="property-icon" viewBox="0 0 24 24" aria-hidden="true"><path d={propertyIcons[name] ?? propertyIcons.documentation} /></svg>;
}
interface Draft { kind: "field" | "section"; key: string; before: FieldValue; text: string; revision?: string }
function restoreDraft(key: string): { draft: Draft | null; recovery: string | null; message: string } {
 let stored: string | null = null;
 try {
  stored = sessionStorage.getItem(key);
  if (!stored) return { draft: null, recovery: null, message: "" };
  const candidate = JSON.parse(stored);
  const valid = editSchema.safeParse({ ...candidate, value: candidate.text });
  if (!valid.success || typeof candidate.text !== "string") throw new Error("Unrecognized draft format");
  let revision: string | undefined;
  if (typeof candidate.revision === "string") revision = candidate.revision;
  const draft = { kind: valid.data.kind, key: valid.data.key, before: valid.data.before, text: candidate.text, revision };
  return { draft, recovery: null, message: "Recovered your unsaved draft from this browser session." };
 } catch {
  return { draft: null, recovery: stored, message: "Saved draft storage could not be read. Any stored text is retained below for recovery." };
 }
}
interface TaskModalProps {
 task: Task;
 draftStorageKey?: string;
 statuses: string[];
 relatedTasks?: Task[];
 onOpenTask?: (task: Task) => void;
 fieldChoices?: Record<string, string[]>;
 missing?: boolean;
 onClose: () => void;
 onSave: (edits: Edit[], baseRevision?: string) => Promise<SaveResult>;
}
export default function TaskModal({ task, statuses, relatedTasks = [], onOpenTask, fieldChoices = {}, draftStorageKey = task.path, missing = false, onClose, onSave }: TaskModalProps) {
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
  const activeDraft = draft;
  if (!activeDraft || pending) return;
  setPending(true); setError("");
  try {
   let value: FieldValue;
   if (activeDraft.kind === "section") value = activeDraft.text;
   else if (listFields.has(activeDraft.key)) value = activeDraft.text.split("\n").map(s => s.trim()).filter(Boolean);
   else value = activeDraft.text || null;
   const result = await onSave([{ kind: activeDraft.kind, key: activeDraft.key, before: activeDraft.before, value }], activeDraft.revision);
   setCurrent(result.task);
   if (result.conflict) { setConflict(true); setError(result.message); }
   else { setDraft(null); setConflict(false); }
  } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  finally { setPending(false); }
 };
 const rebase = () => {
  setDraft(activeDraft => {
   if (!activeDraft) return activeDraft;
   const value = activeDraft.kind === "field" ? current.fields[activeDraft.key] ?? null : current.sections[activeDraft.key] ?? null;
   return { ...activeDraft, before: value as FieldValue, revision: current.revision };
  });
  setConflict(false); setError("Draft kept. Save changes to replace the current value shown above.");
 };
 const editableSections = Object.keys(editableSectionLabels);
 const missingSections = editableSections.filter(key => !(key in current.sections));
 const children = childTasks(current, relatedTasks);
 const parent = parentTask(current, relatedTasks);
 const doneChildren = children.filter(child => child.status === statuses.at(-1)).length;
 const properties = [...Object.entries(fieldLabels).filter(([key]) => key !== "title" && key !== "ordinal"), ["created_date", "Created"], ["updated_date", "Updated"]] as Array<[string, string]>;
 const primaryKeys = new Set(["status", "priority", "assignee", "due_date"]);
 const primaryProperties = properties.filter(([key]) => primaryKeys.has(key));
 const secondaryProperties = properties.filter(([key]) => !primaryKeys.has(key) && valueList(current.fields[key]).length > 0);
 const isReadOnlyProperty = (key: string) => key === "created_date" || key === "updated_date";
 const openRelated = (task: Task) => {
  if (draft || pending || recovery) { setError("Save or cancel your edit before opening another task."); return; }
  onOpenTask?.(task);
 };
 const activateEdit = (event: KeyboardEvent, key: string) => {
  if (event.key === "Enter" || event.key === " ") { event.preventDefault(); start("field", key); }
 };
 const renderFieldEditor = (key: string, label: string) => {
  if (!draft || draft.kind !== "field" || draft.key !== key) return null;
  const choices = key === "status" ? statuses : fieldChoices[key];
  const update = (text: string) => setDraft({ ...draft, text });
  let control: React.ReactNode;
  if (choices) {
   control = <select aria-label={`${label} draft`} value={draft.text} onChange={event => update(event.target.value)}>{key !== "status" && <option value="">Not set</option>}{!choices.includes(draft.text) && draft.text && <option>{draft.text}</option>}{choices.map(value => <option key={value}>{value}</option>)}</select>;
  } else if (key === "due_date") {
   control = <input type="date" aria-label="Due date draft" value={draft.text.slice(0, 10)} onChange={event => update(event.target.value)} />;
  } else {
   control = <textarea ref={editor} aria-label="Draft" rows={listFields.has(key) ? 4 : 2} value={draft.text} onChange={event => update(event.target.value)} />;
  }
  return <div className="inline-field-editor" aria-label={`Editing ${label.toLowerCase()}`}>
   {control}
   {listFields.has(key) && <small>One value per line.</small>}
   {conflict && <div className="conflict"><h4>Current file value</h4><pre>{display(current.fields[key])}</pre><p>Your draft remains in the editor above.</p><button onClick={rebase}>Use my draft over this value</button></div>}
   <div className="modal-actions"><button className="primary" onClick={() => void save()} disabled={pending || conflict || missing || current.errors.length > 0}>{pending ? "Saving..." : "Save changes"}</button><button disabled={pending} onClick={cancel}>Cancel edit</button></div>
  </div>;
 };
 const renderProperty = ([key, label]: [string, string]) => {
  const readOnly = isReadOnlyProperty(key);
  const value = current.fields[key];
  const stateClass = key === "status" || key === "priority" ? `property-value-${key}` : "";
  const editable = !readOnly;
  let renderedValue: React.ReactNode = display(value);
  if (key === "assignee" && assignees(current).length) renderedValue = <span className="detail-assignees">{assignees(current).map(person => <span key={person}><AssigneeAvatar name={person} />{person}</span>)}</span>;
  else if (listFields.has(key)) renderedValue = <PropertyList name={key} value={value} />;
  else if (key === "status" || key === "priority") renderedValue = <span className={`property-badge ${stateClass}`} data-state={stateValue(value)}>{display(value)}</span>;
  const editing = draft?.kind === "field" && draft.key === key;
  return <div className={`detail-property${readOnly ? " read-only" : ""}${editing ? " editing" : ""}`} data-editable={editable ? "true" : undefined} key={key} role={editable && !editing ? "button" : undefined} tabIndex={editable && !editing ? 0 : undefined} aria-label={editable && !editing ? `Edit ${label.toLowerCase()}` : undefined} onKeyDown={editable && !editing ? event => activateEdit(event, key) : undefined} onDoubleClick={editable && !editing ? () => start("field", key) : undefined}><dt><PropertyIcon name={key} /><span>{label}</span></dt><dd className="property-value">{editing ? renderFieldEditor(key, label) : renderedValue}</dd></div>;
 };
 return <dialog ref={dialog} className="backlog-modal" aria-labelledby="task-modal-title" onCancel={event => { event.preventDefault(); if (pending) return; if (draft) cancel(); else onClose(); }}>
  <div className="task-modal">
   <header className="modal-header"><div><span className="task-id">{current.id} / {current.storage}</span><h2 id="task-modal-title" role={draft?.kind === "field" && draft.key === "title" ? undefined : "button"} tabIndex={draft?.kind === "field" && draft.key === "title" ? undefined : 0} aria-label={draft?.kind === "field" && draft.key === "title" ? undefined : "Edit title"} onKeyDown={event => activateEdit(event, "title")} onDoubleClick={() => start("field", "title")}>{draft?.kind === "field" && draft.key === "title" ? renderFieldEditor("title", "Title") : current.title}</h2></div><button onClick={close} aria-label="Close task">Close</button></header>
   {recovery && <section className="notice error"><h3>Saved draft recovery</h3><pre>{recovery}</pre><button onClick={() => setRecovery(null)}>Discard unreadable saved draft</button></section>}
   {missing && <p role="alert" className="notice error">This task is no longer in the current snapshot. Your draft is still here. Check whether the file moved or the source is unavailable.</p>}
   {current.errors.map((text, i) => <p className="notice error" key={i}>{text}</p>)}
   <div className="task-layout">
    <main className="task-content-column">
     {draft?.kind === "section" && <section className="field-editor" aria-label="Active edit">
      <div className="editor-heading"><h3>Editing {fieldLabels[draft.key] ?? editableSectionLabels[draft.key] ?? draft.key}</h3><span>Draft stays here until Save or Cancel</span></div>
      <textarea ref={editor} aria-label="Draft" rows={10} value={draft.text} onChange={e => setDraft({ ...draft, text: e.target.value })} />
      {conflict && <div className="conflict"><h4>Current file value</h4><pre>{display(current.sections[draft.key])}</pre><p>Your draft remains in the editor above.</p><button onClick={rebase}>Use my draft over this value</button></div>}
      <div className="modal-actions"><button className="primary" onClick={() => void save()} disabled={pending || conflict || missing || current.errors.length > 0}>{pending ? "Saving..." : "Save changes"}</button><button disabled={pending} onClick={cancel}>Cancel edit</button></div>
     </section>}
     {error && <p className="notice error" role="alert">{error}</p>}
     <section className="modal-content" aria-label="Task content"><Markdown onEditSection={key => start("section", key)} editable={editableSections}>{current.body}</Markdown></section>
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
     {missingSections.length > 0 && <div className="section-tools"><label>Add section<select aria-label="Add task section" value="" onChange={e => { if (e.target.value) start("section", e.target.value); }}><option value="">Choose section</option>{missingSections.map(key => <option key={key} value={key}>{editableSectionLabels[key] ?? key}</option>)}</select></label></div>}
    </main>
    <aside className="task-properties" aria-label="Task properties">
     <dl className="primary-summary" aria-label="Task summary">{primaryProperties.map(renderProperty)}</dl>
     {secondaryProperties.length > 0 && <section className="task-details" aria-labelledby="task-details-heading">
      <div className="task-details-heading"><h3 id="task-details-heading">Task details</h3><span>Additional context</span></div>
      <dl className="detail-grid">{secondaryProperties.map(renderProperty)}</dl>
     </section>}
    </aside>
   </div>
  </div>
 </dialog>;
}
