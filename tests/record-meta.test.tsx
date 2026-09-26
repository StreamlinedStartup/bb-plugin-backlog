import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterEach, expect, test } from "bun:test";
if (typeof document === "undefined") GlobalRegistrator.register();
const { cleanup, render } = await import("@testing-library/react");
afterEach(cleanup);
const renderToStaticMarkup = (node: Parameters<typeof render>[0]) => render(node).container.innerHTML;
import RecordMeta from "../src/RecordMeta";
import { markdownExcerpt, splitFrontmatter } from "../src/task-format";

test("front matter is separated from the Markdown body", () => {
 expect(splitFrontmatter("---\r\nid: decision-001\r\n---\r\n## Context\r\n")).toEqual({ meta: "id: decision-001\r\n", body: "## Context\r\n" });
 expect(splitFrontmatter("# Plain\n\n---\nnot: meta\n---\n")).toEqual({ meta: null, body: "# Plain\n\n---\nnot: meta\n---\n" });
});

test("metadata strip shows values, skips the title and empty fields", () => {
 const html = renderToStaticMarkup(<RecordMeta source={"id: decision-001\ntitle: Offline play\ndate: '2026-09-26 03:17'\nstatus: accepted\nlabels: []\nowner: vincent\n"} />);
 expect(html).toContain("decision-001");
 expect(html).toContain("2026-09-26 03:17");
 expect(html).toContain('record-meta-item status');
 expect(html).toContain("owner");
 expect(html).not.toContain("Offline play");
 expect(html).not.toContain("labels");
});

test("invalid front matter explains itself instead of disappearing", () => {
 expect(renderToStaticMarkup(<RecordMeta source={"id: [unclosed\n"} />)).toContain("not valid YAML");
});

test("card excerpt is the first prose paragraph as plain text", () => {
 const doc = "---\nid: doc-003\n---\n# Vertical slice delivery plan\n\n```sh\nbun x\n```\n\nBacklog is the **sole** [maintained plan](doc.md). The `previous` 13 layer-oriented drafts.\n\n## Rule\n";
 expect(markdownExcerpt(doc)).toBe("Backlog is the sole maintained plan. The previous 13 layer-oriented drafts.");
 expect(markdownExcerpt("# Only a heading\n")).toBe("");
 expect(markdownExcerpt("# T\n\n" + "word ".repeat(60), 40)).toHaveLength(40);
});
