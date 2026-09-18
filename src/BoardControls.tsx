import type { Dispatch, SetStateAction } from "react";
import type { BoardFilters, SortMode } from "./board-controls";

type Props = { filters: BoardFilters; options: { statuses: string[]; priorities: string[]; assignees: string[]; labels: string[] }; setFilters: Dispatch<SetStateAction<BoardFilters>> };
type MultiKey = "status" | "priority" | "labels";

function FilterMenu({ label, values, selected, onChange }: { label: string; values: string[]; selected: string[]; onChange: (value: string, checked: boolean) => void }) {
 return <details className="filter-menu"><summary className="filter-trigger">{label}{selected.length > 0 && <span className="filter-count">{selected.length}</span>}</summary><div className="filter-popover">{values.length ? values.map(value => <label className="filter-option" key={value}><input type="checkbox" aria-label={`${label} ${value || "No status"}`} checked={selected.includes(value)} onChange={event => onChange(value, event.target.checked)} />{value || "No status"}</label>) : <span className="filter-empty">No options</span>}</div></details>;
}

export default function BoardControls({ filters, options, setFilters }: Props) {
 const toggle = (key: MultiKey, value: string, checked: boolean) => setFilters(current => ({ ...current, [key]: checked ? [...current[key], value] : current[key].filter(item => item !== value) }));
 const clearBoardFilters = () => setFilters({ status: [], priority: [], assignee: "", labels: [], sort: "ordinal", direction: "asc" });
 const hasActiveBoardFilters = filters.status.length > 0 || filters.priority.length > 0 || filters.assignee.length > 0 || filters.labels.length > 0 || filters.sort !== "ordinal" || filters.direction !== "asc";
 return <div className="board-filters" role="group" aria-label="Board filters"><span className="board-filters-label">Filter by</span>
  <FilterMenu label="Status" values={options.statuses} selected={filters.status} onChange={(value, checked) => toggle("status", value, checked)} />
  <FilterMenu label="Priority" values={options.priorities} selected={filters.priority} onChange={(value, checked) => toggle("priority", value, checked)} />
  <FilterMenu label="Assignee" values={options.assignees} selected={filters.assignee ? [filters.assignee] : []} onChange={(value, checked) => setFilters(current => ({ ...current, assignee: checked ? value : "" }))} />
  <FilterMenu label="Labels" values={options.labels} selected={filters.labels} onChange={(value, checked) => toggle("labels", value, checked)} />
  <label className="sort-control">Sort by<select aria-label="Sort tasks" value={filters.sort} onChange={event => setFilters(current => ({ ...current, sort: event.target.value as SortMode }))}><option value="ordinal">Ordinal</option><option value="title">Title</option><option value="priority">Priority</option><option value="due_date">Due date</option><option value="created_date">Date created</option><option value="updated_date">Date updated</option></select><select aria-label="Sort direction" value={filters.direction} onChange={event => setFilters(current => ({ ...current, direction: event.target.value as "asc" | "desc" }))}><option value="asc">Ascending</option><option value="desc">Descending</option></select></label>
  <button className="reset-filters" type="button" onClick={clearBoardFilters} disabled={!hasActiveBoardFilters}>Reset</button>
 </div>;
}
