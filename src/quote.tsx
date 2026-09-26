import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useBbNavigate, useComposer, useSdk } from "@get-bb/plugin-sdk/app";

const PENDING = "bb-backlog-pending-quote:";
const DELIVER = "bb-backlog-quote";

/** Selected text followed by where it came from, shown relative to the project checkout when possible. */
export function quoteWithSource(text: string, file: string, root?: string) {
 const source = root && file.startsWith(`${root.replace(/\/+$/, "")}/`) ? file.slice(root.replace(/\/+$/, "").length + 1) : file;
 return `${text}\n\nSource: ${source}`;
}

/** Picks the project's most recently updated root thread that is not archived. */
export function latestThread<T extends { updatedAt: number; archivedAt: number | null; parentThreadId: string | null }>(threads: T[]) {
 return threads.filter(thread => !thread.archivedAt && !thread.parentThreadId).sort((a, b) => b.updatedAt - a.updatedAt)[0];
}

/**
 * Puts a quote in the draft of the project's latest thread, or in a new-thread
 * draft for that project when it has none. It never submits the message.
 */
export function useSendQuote() {
 const sdk = useSdk();
 const navigate = useBbNavigate();
 const composer = useComposer();
 return async (projectId: string, text: string) => {
  const latest = latestThread(await sdk.threads.list({ projectId, archived: false, hasParent: false }));
  if (!latest) {
   // From a nav panel, useComposer writes to the new-thread draft.
   composer.addQuote(text);
   navigate.toProject(projectId);
   return;
  }
  sessionStorage.setItem(PENDING + latest.id, text);
  window.dispatchEvent(new CustomEvent(DELIVER, { detail: latest.id }));
  navigate.toThread(latest.id);
 };
}

/** Thread header slot with no UI: moves a pending quote into this thread's own draft. */
export function PendingQuoteReceiver({ threadId }: { threadId: string }) {
 const composer = useComposer();
 useEffect(() => {
  const deliver = () => {
   const text = sessionStorage.getItem(PENDING + threadId);
   if (text === null) return;
   sessionStorage.removeItem(PENDING + threadId);
   composer.addQuote(text);
  };
  deliver();
  const onDeliver = (event: Event) => { if ((event as CustomEvent<string>).detail === threadId) deliver(); };
  window.addEventListener(DELIVER, onDeliver);
  return () => window.removeEventListener(DELIVER, onDeliver);
 }, [threadId, composer]);
 return null;
}

/** Rendered Markdown whose selected text can be added to chat with a floating + button. */
export function Quotable({ className, onQuote, children }: { className?: string; onQuote: (text: string) => void; children: ReactNode }) {
 const area = useRef<HTMLElement>(null);
 const [selection, setSelection] = useState<{ text: string; x: number; y: number } | null>(null);
 useEffect(() => {
  // Any scroll moves the text away from the fixed-position button.
  const clear = () => setSelection(null);
  window.addEventListener("scroll", clear, true);
  return () => window.removeEventListener("scroll", clear, true);
 }, []);
 const read = () => {
  const selected = window.getSelection();
  const text = selected?.toString().trim();
  if (!selected || !text || !selected.rangeCount || !area.current?.contains(selected.anchorNode)) { setSelection(null); return; }
  const rect = selected.getRangeAt(0).getBoundingClientRect();
  setSelection({ text, x: Math.min(window.innerWidth - 42, Math.max(8, rect.left + rect.width / 2)), y: Math.max(8, rect.top - 38) });
 };
 return <>
  <article ref={area} className={className} onMouseUp={read} onPointerUp={read} onKeyUp={read}>{children}</article>
  {selection && <button className="quote-selection" style={{ left: selection.x, top: selection.y }} aria-label="Add selected text to the project's chat" title="Add selected text to the project's chat" onMouseDown={event => event.preventDefault()} onClick={() => { onQuote(selection.text); setSelection(null); window.getSelection()?.removeAllRanges(); }}>+</button>}
 </>;
}
