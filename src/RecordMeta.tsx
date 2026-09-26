import type { ReactNode } from "react";
import { parse } from "yaml";

const icon = (paths: ReactNode) => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths}</svg>;
const calendar = icon(<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>);
const FIELDS: Record<string, { label: string; icon?: ReactNode }> = {
 id: { label: "ID", icon: icon(<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18" />) },
 status: { label: "Status" },
 date: { label: "Date", icon: calendar },
 created_date: { label: "Created", icon: calendar },
 updated_date: { label: "Updated", icon: icon(<><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>) },
};
const text = (value: unknown) => Array.isArray(value) ? value.map(String).join(", ") : typeof value === "object" ? JSON.stringify(value) : String(value);

/** Compact metadata strip for a Markdown record's YAML front matter. The title is shown in the toolbar, so it is skipped. */
export default function RecordMeta({ source }: { source: string }) {
 let data: unknown;
 try { data = parse(source); }
 catch (error) { return <p className="record-meta-error">Front matter is not valid YAML, so it is not shown here. Open Edit to fix it. ({error instanceof Error ? error.message.split("\n")[0] : String(error)})</p>; }
 if (!data || typeof data !== "object" || Array.isArray(data)) return null;
 const entries = Object.entries(data).filter(([key, value]) => key !== "title" && value !== null && value !== "" && !(Array.isArray(value) && !value.length));
 if (!entries.length) return null;
 return <dl className="record-meta">{entries.map(([key, value]) => {
  const field = FIELDS[key] ?? { label: key.replace(/_/g, " ") };
  return <div key={key} className={`record-meta-item${key === "status" ? " status" : ""}`} title={`${field.label}: ${text(value)}`}>
   <dt className={field.icon || key === "status" ? "visually-hidden" : undefined}>{field.label}</dt>{field.icon}<dd>{text(value)}</dd>
  </div>;
 })}</dl>;
}
