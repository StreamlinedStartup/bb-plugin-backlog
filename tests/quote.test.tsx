import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterEach, expect, test } from "bun:test";
if (typeof document === "undefined") GlobalRegistrator.register();
const { installTestPluginRuntime, renderSlot } = await import("@get-bb/plugin-sdk/testing/app");
installTestPluginRuntime();
const { cleanup, fireEvent, waitFor } = await import("@testing-library/react");
const { PendingQuoteReceiver, latestThread, quoteWithSource, useSendQuote } = await import("../src/quote");
afterEach(() => { cleanup(); sessionStorage.clear(); });

const thread = (id: string, updatedAt: number, extra: Partial<{ archivedAt: number | null; parentThreadId: string | null }> = {}) => ({ id, updatedAt, archivedAt: null, parentThreadId: null, ...extra });
// The fake only needs the fields the plugin reads.
const threadList = (threads: ReturnType<typeof thread>[]) => ({ threads: { list: async () => threads as never } });
function Sender({ projectId }: { projectId: string }) {
 const send = useSendQuote();
 return <button onClick={() => void send(projectId, "Chosen text\n\nSource: docs/a.md")}>send</button>;
}

test("quotes name their source relative to the checkout", () => {
 expect(quoteWithSource("Text", "/repo/backlog/docs/a.md", "/repo/")).toBe("Text\n\nSource: backlog/docs/a.md");
 expect(quoteWithSource("Text", "/elsewhere/a.md", "/repo")).toBe("Text\n\nSource: /elsewhere/a.md");
});

test("the latest thread is the newest root thread that is not archived", () => {
 expect(latestThread([thread("old", 1), thread("archived", 9, { archivedAt: 9 }), thread("child", 8, { parentThreadId: "old" }), thread("new", 5)])?.id).toBe("new");
 expect(latestThread([])).toBeUndefined();
});

test("a quote goes to the project's latest thread draft without sending", async () => {
 const view = renderSlot({ component: Sender }, { projectId: "p" }, { sdk: threadList([thread("t1", 1), thread("t2", 2)]) });
 fireEvent.click(view.getByText("send"));
 await waitFor(() => expect(view.inspection.navigateCalls).toEqual([{ method: "toThread", threadId: "t2" }]));
 expect(view.inspection.composer.text).toBe("");
 const receiver = renderSlot({ component: PendingQuoteReceiver }, { threadId: "t2" });
 expect(receiver.inspection.composer.text).toContain("> Chosen text");
 expect(receiver.inspection.composer.text).toContain("> Source: docs/a.md");
 expect(sessionStorage.getItem("bb-backlog-pending-quote:t2")).toBeNull();
});

test("a project without threads gets a new-thread draft and opens the project", async () => {
 const view = renderSlot({ component: Sender }, { projectId: "p" }, { sdk: threadList([]) });
 fireEvent.click(view.getByText("send"));
 await waitFor(() => expect(view.inspection.navigateCalls).toEqual([{ method: "toProject", projectId: "p" }]));
 expect(view.inspection.composer.text).toContain("> Chosen text");
});
