import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterEach, expect, test } from "bun:test";
if (typeof document === "undefined") GlobalRegistrator.register();
const { installTestPluginRuntime, renderSlot } = await import("@get-bb/plugin-sdk/testing/app");
installTestPluginRuntime();
// Happy DOM does not implement the native top-layer dialog API.
HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
const { render, fireEvent, cleanup, waitFor } = await import("@testing-library/react");
const { default: TaskModal } = await import("../src/TaskModal");
const { parseTask } = await import("../src/task-format");
import type { Edit } from "../src/model";
const task = parseTask("---\nid: T-1\ntitle: Original\nstatus: To Do\ncreated_date: 2026-09-16 08:30\nupdated_date: 2026-09-17 14:45\n---\n## Description\nHello **world**\n", { path: "task.md", revision: "r", storage: "active" });
afterEach(() => { cleanup(); sessionStorage.clear(); });
test("fields start in preview and double-click enables explicit editing", () => {
 const view = render(<TaskModal task={task} statuses={["To Do", "Done"]} onClose={() => undefined} onSave={async () => ({ task, conflict: false, message: "" })} />);
 expect(view.queryByLabelText("Draft")).toBeNull();
 fireEvent.doubleClick(view.getByText("Original"));
 expect((view.getByLabelText("Draft") as HTMLTextAreaElement).value).toBe("Original");
 fireEvent.click(view.getByText("Cancel edit")); expect(view.queryByLabelText("Draft")).toBeNull();
});
test("task identity is concise and timestamps are read-only properties", () => {
 const view = render(<TaskModal task={task} statuses={["To Do", "Done"]} onClose={() => undefined} onSave={async () => ({ task, conflict: false, message: "" })} />);
 expect(view.getByText("T-1 / active")).toBeTruthy();
 expect(view.container.querySelectorAll(".task-id")).toHaveLength(1);
 expect(view.container.textContent?.match(/T-1/g)).toHaveLength(1);
 expect(view.getByText("Created")).toBeTruthy();
 expect(view.getByText("2026-09-16 08:30")).toBeTruthy();
 expect(view.getByText("Updated")).toBeTruthy();
 expect(view.getByText("2026-09-17 14:45")).toBeTruthy();
 expect(view.queryByText("Identity and additional fields")).toBeNull();
 expect(view.queryByLabelText("Edit created date")).toBeNull();
 expect(view.queryByLabelText("Edit updated date")).toBeNull();
 expect(view.container.querySelector(".property-icon")).toBeTruthy();
});
test("editing is discoverable without repeating visible Edit controls", () => {
 const view = render(<TaskModal task={task} statuses={["To Do", "Done"]} onClose={() => undefined} onSave={async () => ({ task, conflict: false, message: "" })} />);
 expect(view.queryAllByText("Edit")).toHaveLength(0);
 fireEvent.keyDown(view.getByRole("button", { name: "Edit title" }), { key: "Enter" });
 expect((view.getByLabelText("Draft") as HTMLTextAreaElement).value).toBe("Original");
});
test("list values become compact chips and long paths keep their full value on hover", () => {
 const structured = { ...task, fields: { ...task.fields, labels: ["frontend", "enhancement"], references: ["/Users/vulture/projects/a/very/long/reference/file.md"] } };
 const view = render(<TaskModal task={structured} statuses={["To Do", "Done"]} onClose={() => undefined} onSave={async () => ({ task: structured, conflict: false, message: "" })} />);
 expect(view.getByText("frontend")).toBeTruthy();
 const path = view.container.querySelector(".property-chip[title='/Users/vulture/projects/a/very/long/reference/file.md']");
 expect(path).toBeTruthy();
 expect(path?.textContent).not.toBe("/Users/vulture/projects/a/very/long/reference/file.md");
 expect(path?.getAttribute("aria-label")).toBe("/Users/vulture/projects/a/very/long/reference/file.md");
});
test("external snapshots update previews without discarding the active draft", () => {
 const props = { statuses: ["To Do", "Done"], onClose: () => undefined, onSave: async () => ({ task, conflict: false, message: "" }) };
 const view = render(<TaskModal {...props} task={task} />);
 fireEvent.doubleClick(view.getByText("Original")); fireEvent.change(view.getByLabelText("Draft"), { target: { value: "User draft" } });
 view.rerender(<TaskModal {...props} task={{ ...task, title: "Agent title", fields: { ...task.fields, title: "Agent title", status: "Done" } }} />);
 expect((view.getByLabelText("Draft") as HTMLTextAreaElement).value).toBe("User draft"); expect(view.getByText("Done")).toBeTruthy();
});
test("property editing stays in place and due dates use a date picker", async () => {
 const dueTask = { ...task, fields: { ...task.fields, due_date: "2026-10-01" } };
 let edits: Edit[] = [];
 const view = render(<TaskModal task={dueTask} statuses={["To Do", "Done"]} onClose={() => undefined} onSave={async next => { edits = next; return { task: dueTask, conflict: false, message: "" }; }} />);
 fireEvent.doubleClick(view.getByText("2026-10-01"));
 const editor = view.getByLabelText("Due date draft") as HTMLInputElement;
 expect(editor.type).toBe("date");
 expect(view.container.querySelector(".detail-property.editing")?.contains(editor)).toBe(true);
 fireEvent.change(editor, { target: { value: "2026-10-15" } });
 fireEvent.click(view.getByText("Save changes"));
 await waitFor(() => expect(edits[0]?.value).toBe("2026-10-15"));
});
test("save conflict preserves draft and requires explicit resolution", async () => {
 const current = { ...task, title: "Agent title", fields: { ...task.fields, title: "Agent title" } };
 const view = render(<TaskModal task={task} statuses={["To Do", "Done"]} onClose={() => undefined} onSave={async () => ({ task: current, conflict: true, message: "Conflict: title changed on disk." })} />);
 fireEvent.doubleClick(view.getByText("Original")); fireEvent.change(view.getByLabelText("Draft"), { target: { value: "User draft" } }); fireEvent.click(view.getByText("Save changes"));
 await waitFor(() => expect(view.getByText("Current file value")).toBeTruthy());
 expect((view.getByLabelText("Draft") as HTMLTextAreaElement).value).toBe("User draft");
 expect((view.getByText("Save changes") as HTMLButtonElement).disabled).toBe(true);
 fireEvent.click(view.getByText("Use my draft over this value")); expect((view.getByText("Save changes") as HTMLButtonElement).disabled).toBe(false);
});
test("Escape cancels the active edit before closing; close button never discards draft", () => {
 let closes = 0;
 const view = render(<TaskModal task={task} statuses={["To Do"]} onClose={() => { closes++; }} onSave={async () => ({ task, conflict: false, message: "" })} />);
 fireEvent.doubleClick(view.getByText("Original")); fireEvent.click(view.getByLabelText("Close task")); expect(closes).toBe(0);
 fireEvent(view.container.querySelector("dialog")!, new Event("cancel", { bubbles: false, cancelable: true }));
 expect(view.queryByLabelText("Draft")).toBeNull(); expect(closes).toBe(0);
 fireEvent(view.container.querySelector("dialog")!, new Event("cancel", { bubbles: false, cancelable: true })); expect(closes).toBe(1);
});
test("Markdown is rendered once and unsafe HTML does not execute", () => {
 const view = render(<TaskModal task={{ ...task, body: "## Description\n**Bold**\n<script>alert(1)</script>\n[x](javascript:alert(1))" }} statuses={["To Do"]} onClose={() => undefined} onSave={async () => ({ task, conflict: false, message: "" })} />);
 expect(view.container.querySelectorAll("strong")).toHaveLength(1); expect(view.container.querySelector("script")).toBeNull(); expect(view.container.querySelector("a")?.getAttribute("href")).not.toContain("javascript:");
});

test("Backlog markers and HTML comments are hidden in rendered task prose", () => {
 const body = "## Description\n<!-- SECTION:DESCRIPTION:BEGIN -->\nVisible prose\n<!-- private note -->\n<!-- SECTION:DESCRIPTION:END -->";
 const view = render(<TaskModal task={{ ...task, body }} statuses={["To Do"]} onClose={() => undefined} onSave={async () => ({ task, conflict: false, message: "" })} />);
 expect(view.getByText("Visible prose")).toBeTruthy();
 expect(view.container.textContent).not.toContain("<!--");
 expect(view.container.textContent).not.toContain("private note");
});

test("unsaved drafts survive unmount and reopening in the same session", () => {
 const props = { task, statuses: ["To Do"], onClose: () => undefined, onSave: async () => ({ task, conflict: false, message: "" }) };
 const view = render(<TaskModal {...props} />);
 fireEvent.doubleClick(view.getByText("Original")); fireEvent.change(view.getByLabelText("Draft"), { target: { value: "Keep this draft" } });
 view.unmount();
 const next = render(<TaskModal {...props} />);
 expect((next.getByLabelText("Draft") as HTMLTextAreaElement).value).toBe("Keep this draft");
});

test("related subtasks render structured linked rows", () => {
 const child = { ...task, id: "T-1.1", title: "Verify child task", path: "child.md", status: "Done", fields: { ...task.fields, assignee: ["developer"] } };
 let opened = "";
 const view = render(<TaskModal task={task} relatedTasks={[task, child]} onOpenTask={selected => { opened = selected.id; }} statuses={["To Do", "Done"]} onClose={() => undefined} onSave={async () => ({ task, conflict: false, message: "" })} />);
 expect(view.getByLabelText("Subtasks")).toBeTruthy();
 expect(view.getByText("1 of 1 complete")).toBeTruthy();
 fireEvent.click(view.getByText("Verify child task"));
 expect(opened).toBe("T-1.1");
});
