import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterEach, expect, test } from "bun:test";
if (typeof document === "undefined") GlobalRegistrator.register();
const { render, fireEvent, cleanup } = await import("@testing-library/react");
const { default: BoardControls } = await import("../src/BoardControls");
import type { BoardFilters } from "../src/board-controls";
afterEach(cleanup);

test("controls expose active values and keyboard-accessible reset", () => {
 const initial: BoardFilters = { status: ["To Do"], priority: [], assignee: "Alex", labels: ["ui"], sort: "title", direction: "desc" };
 let current = initial;
 const view = render(<BoardControls filters={current} options={{ statuses: ["To Do", "Done"], priorities: ["High"], assignees: ["Alex"], labels: ["ui"] }} setFilters={next => { current = typeof next === "function" ? next(current) : next; view.rerender(<BoardControls filters={current} options={{ statuses: ["To Do", "Done"], priorities: ["High"], assignees: ["Alex"], labels: ["ui"] }} setFilters={nextValue => { current = typeof nextValue === "function" ? nextValue(current) : nextValue; }} />); }} />);
 const reset = view.getByRole("button", { name: "Reset" });
 expect((view.getByLabelText("Status To Do") as HTMLInputElement).checked).toBe(true);
 expect((view.getByLabelText("Sort direction") as HTMLSelectElement).value).toBe("desc");
 reset.focus();
 expect(document.activeElement).toBe(reset);
 fireEvent.keyDown(reset, { key: "Enter" });
 fireEvent.click(reset);
 expect(current).toEqual({ status: [], priority: [], assignee: "", labels: [], sort: "ordinal", direction: "asc" });
});
