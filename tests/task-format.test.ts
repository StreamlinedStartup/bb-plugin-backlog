import { describe, expect, test } from "bun:test";
import { parseTask, patchTask } from "../src/task-format";
const meta = { path: "task-1.md", revision: "r", storage: "active" as const };
const sample = "---\r\nid: T-1\r\ntitle: Keep me\r\nstatus: To Do # state\r\nlabels: [one]\r\nunknown: value # retain\r\n---\r\n## Description\r\n\r\n<!-- SECTION:DESCRIPTION:BEGIN -->\r\nHello\r\n<!-- SECTION:DESCRIPTION:END -->\r\n\r\n## Acceptance Criteria\r\n<!-- AC:BEGIN -->\r\n- [ ] #1 first\r\n- [x] #2 done\r\n<!-- AC:END -->\r\n";
describe("bounded task edits", () => {
 test("parses fields, marked sections, progress, CRLF", () => {
  const task = parseTask(sample, meta);
  expect(task.errors).toEqual([]); expect(task.sections.description).toBe("Hello");
  expect(task.progress).toEqual({ done: 1, total: 2 });
 });
 test("preserves every byte except edited scalar", () => {
  const output = patchTask(sample, [{ kind: "field", key: "status", before: "To Do", value: "Done" }]);
  expect(output).toBe(sample.replace("To Do", "\"Done\""));
 });
 test("replaces section content without touching markers or unknown content", () => {
  expect(patchTask(sample, [{ kind: "section", key: "description", before: "Hello", value: "New\n\nText" }])).toBe(sample.replace("Hello", "New\r\n\r\nText"));
 });
 test("block arrays patch safely, retain item comments, and preserve unknown nodes", () => {
  const raw = sample.replace("labels: [one]", "labels:\r\n  - one # useful label\r\n  - two");
  const output = patchTask(raw, [{ kind: "field", key: "labels", before: ["one", "two"], value: ["three"] }]);
  expect(parseTask(output, meta).fields.labels).toEqual(["three"]);
  expect(output).toContain("# useful label"); expect(output).toContain("unknown: value # retain\r\n");
 });
 test("missing ordinal and optional fields can be added", () => {
  const output = patchTask(sample, [{ kind: "field", key: "ordinal", before: null, value: 1024 }, { kind: "field", key: "reporter", before: null, value: "true" }]);
  const task = parseTask(output, meta); expect(task.ordinal).toBe(1024); expect(task.fields.reporter).toBe("true");
 });
 test("missing structured section can be added", () => {
  const output = patchTask(sample, [{ kind: "section", key: "implementation plan", before: null, value: "1. Build\n2. Verify" }]);
  expect(output).toContain("<!-- SECTION:PLAN:BEGIN -->"); expect(parseTask(output, meta).sections["implementation plan"]).toBe("1. Build\r\n2. Verify");
 });
 test("disjoint edits merge while overlapping edits reject", () => {
  const agent = sample.replace("Hello", "Agent text");
  expect(patchTask(agent, [{ kind: "field", key: "title", before: "Keep me", value: "New" }])).toContain("Agent text");
  expect(() => patchTask(agent, [{ kind: "section", key: "description", before: "Hello", value: "Mine" }])).toThrow("Conflict");
 });
 test("malformed and duplicate YAML remains readable but uneditable", () => {
  const raw = sample.replace("title: Keep me", "title: Keep me\r\ntitle: Duplicate");
  expect(parseTask(raw, meta).errors.length).toBeGreaterThan(0);
  expect(parseTask(raw, meta).body).toBe(raw);
  expect(() => patchTask(raw, [{ kind: "field", key: "title", before: "Duplicate", value: "New" }])).toThrow();
 });
 test("section marker examples in code fences do not confuse parsing", () => {
  const raw = sample.replace("Hello", "Hello\r\n```md\r\n<!-- SECTION:DESCRIPTION:END -->\r\n```");
  expect(parseTask(raw, meta).errors).toEqual([]);
 });
 test("ambiguous section markers block edits", () => {
  const raw = sample.replace("<!-- SECTION:DESCRIPTION:END -->", "");
  expect(parseTask(raw, meta).errors.length).toBeGreaterThan(0);
 });
 test("comments keep author and timestamps intact", () => {
  const raw = sample + "\r\n## Comments\r\n<!-- COMMENTS:BEGIN -->\r\nauthor: @someone\r\ncreated: 2026-09-17 10:00\r\n---\r\nOriginal comment\r\n---\r\n<!-- COMMENTS:END -->\r\n";
  expect(patchTask(raw, [{ kind: "section", key: "comment 1", before: "Original comment", value: "Updated comment" }])).toBe(raw.replace("Original comment", "Updated comment"));
 });
 test("unknown fields and identity cannot be modified through mutations", () => {
  expect(() => patchTask(sample, [{ kind: "field", key: "id", before: "T-1", value: "T-2" }])).toThrow("read-only");
 });
});

test("duplicate legacy sections are ambiguous and cannot be edited", () => {
 const task = parseTask("---\nid: T-9\ntitle: Duplicate\nstatus: To Do\n---\n## Description\nFirst\n## Description\nSecond\n", { path: "t.md", revision: "r", storage: "active" });
 expect(task.errors.join(" ")).toContain("Ambiguous duplicate section");
});
