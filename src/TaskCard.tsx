import AssigneeAvatar from "./AssigneeAvatar";
import type { DragEvent } from "react";
import type { Task } from "./model";
import { assignees, descriptionPreview } from "./task-relations";
export default function TaskCard({ task, statuses, open, start, move, before, after, subtaskCount = 0 }: {
 task: Task; statuses: string[]; open: () => void; start: (event: DragEvent) => void;
 move: (status: string, before: string | null) => void; before: string | null; after: string | null; subtaskCount?: number;
}) {
 const people = assignees(task);
 const preview = descriptionPreview(task);
 const percent = task.progress.total ? Math.round(task.progress.done / task.progress.total * 100) : 0;
 const priority = String(task.fields.priority ?? "");
 return <article className="task-card" draggable onDragStart={start} tabIndex={0} aria-describedby="backlog-keyboard-help" aria-label={`${task.id}: ${task.title}`} onClick={open} onKeyDown={event => {
  if (event.target !== event.currentTarget) return;
  if (event.altKey && event.key.startsWith("Arrow")) {
   event.preventDefault();
   const index = statuses.indexOf(task.status);
   if (event.key === "ArrowLeft" && index > 0) move(statuses[index - 1], null);
   if (event.key === "ArrowRight" && index < statuses.length - 1) move(statuses[index + 1], null);
   if (event.key === "ArrowUp" && before) move(task.status, before);
   if (event.key === "ArrowDown" && after !== task.path) move(task.status, after);
  } else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); }
 }}>
  <div className="card-top"><span className="task-id">{task.id}</span>{priority && <span className="priority-badge" data-priority={priority.toLowerCase()}>{priority}</span>}</div>
  <h3>{task.title}</h3>
  {preview && <p className="card-description">{preview}</p>}
  {Array.isArray(task.fields.labels) && task.fields.labels.length > 0 && <div className="card-tags">{task.fields.labels.map((label, index) => <span key={index}>{String(label)}</span>)}</div>}
  <div className="card-progress"><div><span>{task.progress.total ? "Checklist" : "No checklist"}</span><span>{task.progress.total ? `${task.progress.done}/${task.progress.total} (${percent}%)` : ""}</span></div><progress aria-label={`${task.id} checklist progress`} value={task.progress.done} max={task.progress.total || 1} /></div>
  <div className="card-footer"><div className="card-people" title={people.join(", ")}>{people.length ? <><span className="avatar-stack">{people.slice(0, 2).map(person => <AssigneeAvatar key={person} name={person} />)}</span><span className="assignee-name">{people.length === 1 ? people[0] : `${people.length} assignees`}</span></> : <span>Unassigned</span>}</div>{subtaskCount > 0 && <span className="subtask-count">{subtaskCount} {subtaskCount === 1 ? "subtask" : "subtasks"}</span>}</div>
  {task.errors.length > 0 && <div className="card-issue" title={task.errors.join(" ")}>Needs attention</div>}
 </article>;
}
