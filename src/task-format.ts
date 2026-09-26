import { isAlias, isMap, isNode, isScalar, parseDocument, visit } from "yaml";
import type { Edit, FieldValue, Task } from "./model";

type Meta = Pick<Task, "path" | "revision" | "storage">;
type Span = { start: number; end: number; value: string };
export const fieldLabels: Record<string, string> = {
 title: "Title", status: "Status", type: "Type", priority: "Priority", assignee: "Assignees", reporter: "Reporter", labels: "Labels", milestone: "Milestone", due_date: "Due date", project: "Project classification", dependencies: "Dependencies", references: "References", documentation: "Documentation", modified_files: "Modified files", ordinal: "Order",
};
export const listFields = new Set(["assignee", "labels", "dependencies", "references", "documentation", "modified_files"]);
const sectionDefinitions: Record<string, { title: string; marker: string }> = {
 description: { title: "Description", marker: "SECTION:DESCRIPTION" },
 "acceptance criteria": { title: "Acceptance Criteria", marker: "AC" },
 "definition of done": { title: "Definition of Done", marker: "DOD" },
 "implementation plan": { title: "Implementation Plan", marker: "SECTION:PLAN" },
 "implementation notes": { title: "Implementation Notes", marker: "SECTION:NOTES" },
 "final summary": { title: "Final Summary", marker: "SECTION:FINAL_SUMMARY" },
};
export const editableSectionLabels = Object.fromEntries(Object.entries(sectionDefinitions).map(([key, def]) => [key, def.title]));
const FRONTMATTER = /^(?:\uFEFF)?---[ \t]*(\r?\n)([\s\S]*?)^---[ \t]*(?:\r?\n|$)/m;
/** Separates a leading YAML block from the Markdown body; `meta` is null when there is none. */
export function splitFrontmatter(raw: string) {
 const match = FRONTMATTER.exec(raw);
 return match && match.index === 0 ? { meta: match[2], body: raw.slice(match[0].length) } : { meta: null, body: raw };
}
/** Plain-text start of the first prose paragraph, skipping front matter, headings, code, tables and HTML. */
export function markdownExcerpt(raw: string, max = 160) {
 for (const block of splitFrontmatter(raw).body.split(/\r?\n[ \t]*\r?\n/)) {
  const prose = block.split(/\r?\n/).filter(line => !/^\s{0,3}#{1,6}(\s|$)/.test(line)).join(" ").trim();
  if (!prose || /^(```|~~~|<|\||---|\*\*\*)/.test(prose)) continue;
  const text = prose.replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/`|\*\*|~~/g, "").replace(/^>\s*/, "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
 }
 return "";
}
function frontmatter(raw: string) {
 const match = FRONTMATTER.exec(raw);
 if (!match || match.index !== 0) throw new Error("Task is missing a YAML frontmatter block.");
 const start = raw.indexOf("\n") + 1;
 const text = match[2];
 const doc = parseDocument(text, { uniqueKeys: true, keepSourceTokens: true });
 if (doc.errors.length) throw new Error(`Malformed YAML: ${doc.errors.map(e => e.message).join("; ")}`);
 if (!isMap(doc.contents)) throw new Error("Task frontmatter must be a mapping.");
 const data = doc.toJS({ maxAliasCount: 50 }) as Record<string, unknown>;
 return { start, end: match[0].length, text, doc, data, newline: match[1] };
}
function validateField(key: string, value: FieldValue) {
 if (!(key in fieldLabels)) throw new Error(`Field ${key} is read-only.`);
 if (key === "ordinal") {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("Order must be a finite number.");
 } else if (listFields.has(key)) {
  if (value !== null && (!Array.isArray(value) || value.some(v => typeof v !== "string" || v.includes("\n")))) throw new Error(`${fieldLabels[key]} must be a list of strings.`);
 } else if (value !== null && typeof value !== "string") throw new Error(`${fieldLabels[key]} must be text.`);
 if (["title", "status"].includes(key) && (typeof value !== "string" || !value.trim())) throw new Error(`${fieldLabels[key]} cannot be empty.`);
 if (key === "due_date" && value && !/^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?)?$/.test(String(value))) throw new Error("Due date must use YYYY-MM-DD or YYYY-MM-DD HH:mm.");
}
function bodySections(body: string) {
 const spans: Record<string, Span> = {};
 const errors: string[] = [];
 const lines: Array<{ text: string; start: number; end: number }> = [];
 const lineRe = /[^\n]*(?:\n|$)/g;
 let fence: { char: string; length: number } | null = null;
 for (const m of body.matchAll(lineRe)) {
  if (!m[0]) continue;
  const text = m[0].replace(/\r?\n$/, "");
  const match = /^ {0,3}(`{3,}|~{3,})/.exec(text);
  if (match) {
   if (!fence) fence = { char: match[1][0], length: match[1].length };
   else if (match[1][0] === fence.char && match[1].length >= fence.length) fence = null;
   continue;
  }
  if (!fence) lines.push({ text, start: m.index!, end: m.index! + m[0].length });
 }
 const markers = lines.flatMap(line => {
  const m = /^<!-- (SECTION:[A-Z][A-Z0-9_]*|AC|DOD|COMMENTS|COMMENT):(BEGIN|END) -->[\t ]*$/.exec(line.text);
  return m ? [{ ...line, marker: m[1], kind: m[2] }] : [];
 });
 const ranges: Array<{ marker: string; start: number; end: number; innerStart: number; innerEnd: number }> = [];
 const stack: typeof markers = [];
 for (const marker of markers) {
  if (marker.kind === "BEGIN") stack.push(marker);
  else {
   const open = stack.pop();
   if (!open || open.marker !== marker.marker) { errors.push(`Ambiguous section marker ${marker.marker}.`); continue; }
   ranges.push({ marker: marker.marker, start: open.start, end: marker.end, innerStart: open.end, innerEnd: marker.start });
  }
 }
 if (stack.length) errors.push("A structured section has no END marker.");
 const add = (key: string, start: number, end: number) => {
  if (spans[key]) { errors.push(`Ambiguous duplicate section: ${key}.`); return; }
  const raw = body.slice(start, end);
  const leading = raw.match(/^(?:[ \t]*\r?\n)*/)?.[0].length ?? 0;
  const trailing = raw.match(/(?:\r?\n[ \t]*)*$/)?.[0].length ?? 0;
  const a = start + leading;
  const b = Math.max(a, end - trailing);
  spans[key] = { start: a, end: b, value: body.slice(a, b) };
 };
 for (const [key, def] of Object.entries(sectionDefinitions)) {
  for (const range of ranges.filter(r => r.marker === def.marker)) add(key, range.innerStart, range.innerEnd);
 }
 const headings = lines.filter(l => /^##\s+/.test(l.text) && !ranges.some(r => l.start >= r.start && l.start < r.end));
 for (let index = 0; index < headings.length; index++) {
  const heading = headings[index];
  const key = heading.text.replace(/^##\s+/, "").replace(/\s+#+\s*$/, "").replace(/\s*\(Optional\)$/i, "").trim().toLowerCase();
  const end = headings[index + 1]?.start ?? body.length;
  if (!(key in sectionDefinitions)) continue;
  if (markers.some(m => m.start >= heading.end && m.start < end)) continue;
  add(key, heading.end, end);
 }
 // Only expose comment bodies as editable ranges. Author, date, index and delimiters stay byte-identical.
 let commentIndex = 0;
 for (const range of ranges.filter(r => r.marker === "COMMENTS")) {
  const block = body.slice(range.innerStart, range.innerEnd);
  const children = ranges.filter(r => r.marker === "COMMENT" && r.start > range.start && r.end < range.end);
  if (children.length) {
   for (const child of children) {
    const text = body.slice(child.innerStart, child.innerEnd);
    const separator = /\r?\n[ \t]*\r?\n/.exec(text);
    if (separator) add(`comment ${++commentIndex}`, child.innerStart + separator.index + separator[0].length, child.innerEnd);
    else errors.push("Comment metadata has no body separator; edit this comment in Markdown.");
   }
  } else {
   const delimiters = [...block.matchAll(/^---[ \t]*\r?$/gm)];
   if (delimiters.length % 2) errors.push("Comment delimiters are unbalanced.");
   for (let i = 0; i + 1 < delimiters.length; i += 2) {
    const a = delimiters[i], b = delimiters[i + 1];
    add(`comment ${++commentIndex}`, range.innerStart + a.index! + a[0].length, range.innerStart + b.index!);
   }
  }
 }
 return { spans, errors };
}
export function parseTask(raw: string, meta: Meta): Task {
 const fallback: Task = { ...meta, id: meta.path.split("/").at(-1) ?? "Invalid task", title: "Unreadable task", status: "Invalid task", ordinal: null, fields: {}, body: raw, sections: {}, errors: [], progress: { done: 0, total: 0 } };
 try {
  const fm = frontmatter(raw);
  const body = raw.slice(fm.end);
  const { spans, errors } = bodySections(body);
  if (typeof fm.data.id !== "string" || !fm.data.id.trim()) errors.push("Task requires a string ID.");
  if (typeof fm.data.title !== "string" || !fm.data.title.trim()) errors.push("Task requires a title.");
  for (const [key, value] of Object.entries(fm.data)) if (key in fieldLabels) {
   // Legacy Backlog permits a single scalar assignee.
   if (key === "assignee" && typeof value === "string") continue;
   try { validateField(key, value as FieldValue); } catch (error) { errors.push((error as Error).message); }
  }
  const checks = Object.entries(spans).filter(([key]) => key === "acceptance criteria" || key === "definition of done").flatMap(([, span]) => [...span.value.matchAll(/^\s*- \[([ xX])\]/gm)]);
  return { ...meta, id: String(fm.data.id ?? fallback.id), title: String(fm.data.title ?? fallback.title), status: String(fm.data.status ?? ""), ordinal: typeof fm.data.ordinal === "number" && Number.isFinite(fm.data.ordinal) ? fm.data.ordinal : null, fields: fm.data, body, sections: Object.fromEntries(Object.entries(spans).map(([key, span]) => [key, span.value])), errors, progress: { done: checks.filter(m => m[1].toLowerCase() === "x").length, total: checks.length } };
 } catch (error) { return { ...fallback, errors: [(error as Error).message] }; }
}
export function patchTask(raw: string, edits: Edit[]): string {
 if (!edits.length) return raw;
 const current = parseTask(raw, { path: "", revision: "", storage: "active" });
 if (current.errors.length) throw new Error(current.errors.join(" "));
 const fm = frontmatter(raw);
 const { spans } = bodySections(current.body);
 const changes: Span[] = [];
 const seen = new Set<string>();
 let additions = "";
 for (const edit of edits) {
  const key = edit.kind === "section" ? edit.key.toLowerCase() : edit.key;
  const unique = `${edit.kind}:${key}`;
  if (seen.has(unique)) throw new Error("Duplicate field edit.");
  seen.add(unique);
  const actual = edit.kind === "field" ? current.fields[key] ?? null : current.sections[key] ?? null;
  if (JSON.stringify(typeof actual === "string" && edit.kind === "section" ? actual.replace(/\r\n/g, "\n") : actual) !== JSON.stringify(typeof edit.before === "string" && edit.kind === "section" ? edit.before.replace(/\r\n/g, "\n") : edit.before)) throw new Error(`Conflict: ${key} changed on disk.`);
  if (edit.kind === "section") {
   if (!(key in sectionDefinitions) && !/^comment \d+$/.test(key)) throw new Error("This section is read-only.");
   if (typeof edit.value !== "string") throw new Error("Section content must be Markdown text.");
   if (/<!--\s*(?:SECTION:|AC:|DOD:|COMMENT)/i.test(edit.value)) throw new Error("Edit section text without adding or removing Backlog markers.");
   if (key.startsWith("comment ") && /^---\s*$/m.test(edit.value)) throw new Error("Comment text cannot contain standalone delimiters.");
   const value = edit.value.replace(/\r\n|\n/g, fm.newline);
   const span = spans[key];
   if (span) changes.push({ start: fm.end + span.start, end: fm.end + span.end, value });
   else {
    const def = sectionDefinitions[key];
    if (!def) throw new Error("Comment no longer exists.");
    changes.push({ start: raw.length, end: raw.length, value: `${fm.newline}${fm.newline}## ${def.title}${fm.newline}${fm.newline}<!-- ${def.marker}:BEGIN -->${fm.newline}${value}${fm.newline}<!-- ${def.marker}:END -->${fm.newline}` });
   }
  } else {
   validateField(key, edit.value);
   if (!isMap(fm.doc.contents)) throw new Error("Invalid YAML mapping.");
   const pair = fm.doc.contents.items.find(p => isScalar(p.key) && p.key.value === key);
   const encoded = JSON.stringify(edit.value);
   if (!pair) { additions += `${key}: ${encoded}${fm.newline}`; continue; }
   const node = pair.value;
   if (!isNode(node) || !node.range) throw new Error(`Cannot safely locate ${key}.`);
   let anchored = false;
   const comments: string[] = [];
   visit(node, (_key, item) => {
    if (!isNode(item)) return;
    if (isAlias(item) || ("anchor" in item && item.anchor)) anchored = true;
    if (item !== node && "comment" in item && item.comment) comments.push(item.comment);
    if ("commentBefore" in item && item.commentBefore) comments.push(item.commentBefore);
   });
   if (anchored) throw new Error(`Edit anchored YAML field ${key} directly in Markdown.`);
   const previous = fm.text.slice(node.range[0], node.range[1]);
   const suffix = previous.endsWith("\n") ? fm.newline : "";
   const retained = comments.length ? fm.newline + comments.flatMap(c => c.split("\n").map(line => `  #${line}`)).join(fm.newline) : "";
   changes.push({ start: fm.start + node.range[0], end: fm.start + node.range[1], value: encoded + retained + suffix });
  }
 }
 if (additions) changes.push({ start: fm.start + fm.text.length, end: fm.start + fm.text.length, value: additions });
 let output = raw;
 for (const change of changes.sort((a, b) => b.start - a.start)) output = output.slice(0, change.start) + change.value + output.slice(change.end);
 const verified = parseTask(output, { path: "", revision: "", storage: "active" });
 if (verified.errors.length) throw new Error(`Patched task is invalid: ${verified.errors.join(" ")}`);
 for (const edit of edits) {
  const actual = edit.kind === "field" ? verified.fields[edit.key] ?? null : verified.sections[edit.key.toLowerCase()] ?? null;
  if (JSON.stringify(typeof actual === "string" && edit.kind === "section" ? actual.replace(/\r\n/g, "\n") : actual) !== JSON.stringify(typeof edit.value === "string" && edit.kind === "section" ? edit.value.replace(/\r\n/g, "\n") : edit.value)) throw new Error(`Cannot safely represent ${edit.key}; edit it in Markdown.`);
 }
 return output;
}
