import { useCallback, useEffect, useRef, useState } from "react";
import type { rpcContract } from "./contract";
import type { useRpc } from "@get-bb/plugin-sdk/app";
import Markdown from "./Markdown";
import RecordMeta from "./RecordMeta";
import { Quotable } from "./quote";
import { splitFrontmatter } from "./task-format";

type Kind = "document" | "decision";
type RecordSummary = { path: string; title: string };
type RecordFile = RecordSummary & { revision: string; content: string };
type Rpc = ReturnType<typeof useRpc<typeof rpcContract>>;

export default function MarkdownRecordPanel({ projectId, kind, records, warnings, rpc, addQuote, listHidden, onToggleList, error: recordsError }: {
 projectId: string; kind: Kind; records: Array<RecordSummary & { excerpt: string }>; warnings: string[]; rpc: Rpc; addQuote: (text: string, file: string) => void; listHidden: boolean; onToggleList: () => void; error: string;
}) {
 const [selectedPath, setSelectedPath] = useState("");
 const [record, setRecord] = useState<RecordFile | null>(null);
 const [draft, setDraft] = useState("");
 const [editing, setEditing] = useState(false);
 const [loading, setLoading] = useState(false);
 const [saving, setSaving] = useState(false);
 const [error, setError] = useState("");
 const [conflict, setConflict] = useState<RecordFile | null>(null);
 const [query, setQuery] = useState("");
 const token = useRef(0);
 const storageKey = record ? `bb-backlog-markdown-draft:${projectId}:${record.path}` : "";
 useEffect(() => { setSelectedPath(""); setRecord(null); setDraft(""); setEditing(false); setError(""); setConflict(null); }, [projectId, kind]);
 useEffect(() => { if (selectedPath && !records.some(item => item.path === selectedPath)) setSelectedPath(""); }, [records, selectedPath]);
 useEffect(() => {
  if (!selectedPath) { setRecord(null); setDraft(""); setEditing(false); setConflict(null); return; }
  const current = ++token.current;
  setLoading(true); setError(""); setConflict(null);
  void rpc.call("readMarkdownRecord", { projectId, kind, path: selectedPath }).then(value => {
   if (current !== token.current) return;
   setRecord(value);
   let saved: { content?: unknown; revision?: unknown } | null = null;
   try { saved = JSON.parse(sessionStorage.getItem(`bb-backlog-markdown-draft:${projectId}:${value.path}`) ?? "null"); } catch { /* Ignore damaged local drafts; the file remains untouched. */ }
   const hasDraft = typeof saved?.content === "string" && typeof saved?.revision === "string";
   setDraft(hasDraft ? saved!.content as string : value.content);
   setEditing(hasDraft);
   if (hasDraft && saved!.revision !== value.revision) { setConflict(value); setError("This file changed after the draft was saved. Review the current version before saving your draft."); }
  }).catch(cause => { if (current === token.current) setError(cause instanceof Error ? cause.message : String(cause)); })
   .finally(() => { if (current === token.current) setLoading(false); });
  return () => { token.current++; };
 }, [projectId, kind, selectedPath, rpc]);
 useEffect(() => {
  if (!storageKey || !record) return;
  try {
   if (draft !== record.content) sessionStorage.setItem(storageKey, JSON.stringify({ content: draft, revision: conflict ? conflict.revision : record.revision }));
   else sessionStorage.removeItem(storageKey);
  } catch { setError("This browser could not keep a local copy of your draft. Keep this file open until you save it."); }
 }, [draft, storageKey, record, conflict]);
 useEffect(() => {
  const warn = (event: BeforeUnloadEvent) => { if (record && draft !== record.content) { event.preventDefault(); event.returnValue = ""; } };
  window.addEventListener("beforeunload", warn);
  return () => window.removeEventListener("beforeunload", warn);
 }, [draft, record]);
 const save = async () => {
  if (!record || saving || conflict) return;
  setSaving(true); setError("");
  try {
   const result = await rpc.call("saveMarkdownRecord", { projectId, kind, path: record.path, revision: record.revision, content: draft });
   setRecord(result.record);
   if (result.conflict) { setConflict(result.record); setError(result.message); }
   else { setDraft(result.record.content); setEditing(false); setConflict(null); }
  } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  finally { setSaving(false); }
 };
 const rebase = () => { if (conflict) { setRecord(conflict); setConflict(null); setError("Your draft is kept. Save again to replace the current file content."); } };
 const cancel = () => { if (record) { setDraft(record.content); setConflict(null); setEditing(false); setError(""); } };
 const visibleRecords = records.filter(item => `${item.title} ${item.path} ${item.excerpt}`.toLowerCase().includes(query.toLowerCase()));
 const label = kind === "document" ? "Documents" : "Decisions";
 // At narrow widths the list becomes a single row; let a vertical wheel scroll it sideways.
 const sidewaysWheel = useCallback((rows: HTMLDivElement | null) => {
  if (!rows) return;
  const onWheel = (event: WheelEvent) => {
   if (getComputedStyle(rows).display !== "flex" || rows.scrollWidth <= rows.clientWidth || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
   event.preventDefault();
   rows.scrollLeft += event.deltaY;
  };
  rows.addEventListener("wheel", onWheel, { passive: false });
  return () => rows.removeEventListener("wheel", onWheel);
 }, []);
 const { meta, body } = splitFrontmatter(draft);
 const toggle = <button className="list-toggle" aria-label={listHidden ? `Show ${label.toLowerCase()} list` : `Hide ${label.toLowerCase()} list`} title={listHidden ? "Show list" : "Hide list"} aria-expanded={!listHidden} onClick={onToggleList}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" /><path d={listHidden ? "m14 9 3 3-3 3" : "m16 15-3-3 3-3"} /></svg></button>;
 return <div className={`markdown-workspace${listHidden ? " list-hidden" : ""}`}>
  <aside className="records-list" aria-label={`${kind === "document" ? "Documents" : "Decisions"} list`}>
   {listHidden ? toggle : <>
   <header><h2>{label}</h2><span>{records.length}</span>{toggle}</header>
   {records.length > 0 && <input className="record-search" aria-label={`Search ${kind === "document" ? "documents" : "decisions"}`} placeholder="Search Markdown files" value={query} onChange={event => setQuery(event.target.value)} />}
   {visibleRecords.length ? <div className="record-rows" ref={sidewaysWheel}>{visibleRecords.map(item => <button key={item.path} className={item.path === selectedPath ? "record-row selected" : "record-row"} aria-current={item.path === selectedPath ? "page" : undefined} title={item.path} onClick={() => setSelectedPath(item.path)}><strong>{item.title}</strong><small>{item.excerpt || item.path.split("/").slice(-2).join("/")}</small></button>)}</div> : <p className="record-empty">{records.length ? "No files match your search." : `No ${kind === "document" ? "documents" : "decisions"} found in this Backlog folder.`}</p>}
   </>}
  </aside>
  <main className="record-reader">
   {recordsError && <p role="alert" className="notice error">{recordsError}</p>}
   {warnings.map((warning, index) => <p className="notice" key={`${index}:${warning}`}>{warning}</p>)}
   {loading ? <div className="record-placeholder">Loading Markdown…</div> : !record ? <div className="record-placeholder"><h2>Choose a {kind}</h2><p>Select a Markdown file from the list to preview it here.</p></div> : <>
    <header className="record-toolbar"><div><h2>{record.title}</h2><p title={record.path}>{record.path.split("/").slice(-2).join("/")}</p></div><div className="record-actions"><button aria-pressed={!editing} onClick={() => setEditing(false)}>Preview</button><button aria-pressed={editing} onClick={() => setEditing(true)}>Edit</button>{(editing || draft !== record.content) && <><button className="primary" disabled={saving || Boolean(conflict) || draft === record.content} onClick={() => void save()}>{saving ? "Saving…" : "Save"}</button><button disabled={saving} onClick={cancel}>Cancel</button></>}</div></header>
    {error && <p role="alert" className="notice error">{error}</p>}
    {conflict && <div className="record-conflict"><strong>Current file content</strong><pre>{conflict.content}</pre><button onClick={rebase}>Keep my draft and save over this version</button></div>}
    {editing ? <textarea className="record-editor" aria-label={`Edit ${record.title}`} value={draft} onChange={event => setDraft(event.target.value)} spellCheck={false} /> : <Quotable className="markdown-record" onQuote={text => addQuote(text, record.path)}>{meta !== null && <RecordMeta source={meta} />}<Markdown>{body}</Markdown></Quotable>}
   </>}
  </main>
 </div>;
}
