import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterEach, expect, test } from "bun:test";
if (typeof document === "undefined") GlobalRegistrator.register();
const { installTestPluginRuntime, renderSlot } = await import("@get-bb/plugin-sdk/testing/app");
installTestPluginRuntime();
const { render, fireEvent, cleanup } = await import("@testing-library/react");
const { default: TaskCard } = await import("../src/TaskCard");
const { parseTask } = await import("../src/task-format");
const { childTasks } = await import("../src/task-relations");
const task = parseTask("---\nid: TASK-1\ntitle: Rich task\nstatus: To Do\nlabels: [ui, backlog]\nassignee: [developer]\n---\n## Description\nA **readable** description.\n\n## Acceptance Criteria\n- [x] #1 Complete\n- [ ] #2 Pending\n", { path: "t.md", revision: "r", storage: "active" });
afterEach(cleanup);
test("card contains plain description, labels, progress and no move menu", () => {
 const view = render(<TaskCard task={task} statuses={["To Do", "Done"]} open={() => undefined} start={() => undefined} move={() => undefined} before={null} after={task.path} />);
 expect(view.getByText("A readable description.")).toBeTruthy();
 expect(view.getByText("ui")).toBeTruthy();
 expect((view.getByLabelText("TASK-1 checklist progress") as HTMLProgressElement).value).toBe(1);
 expect((view.getByLabelText("TASK-1 checklist progress") as HTMLProgressElement).max).toBe(2);
 expect(view.queryByText("Move task")).toBeNull();
 expect(view.container.querySelector("article")?.getAttribute("draggable")).toBe("true");
});
test("focused card keeps keyboard movement without visible controls", () => {
 const moves: unknown[] = [];
 const view = render(<TaskCard task={task} statuses={["To Do", "Done"]} open={() => undefined} start={() => undefined} move={(...args) => moves.push(args)} before={null} after={task.path} />);
 fireEvent.keyDown(view.getByLabelText("TASK-1: Rich task"), { altKey: true, key: "ArrowRight" });
 expect(moves).toEqual([["Done", null]]);
});
test("children resolve numbered, explicit parent and declared relationships only once", () => {
 const numbered = { ...task, id: "TASK-1.1", path: "a.md" };
 const nested = { ...task, id: "TASK-1.1.1", path: "b.md" };
 const explicit = { ...task, id: "CUSTOM-9", path: "c.md", fields: { parent_task_id: "TASK-1" } };
 expect(childTasks(task, [task, numbered, nested, explicit]).map(child => child.id)).toEqual(["TASK-1.1", "CUSTOM-9"]);
});
