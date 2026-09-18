import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterEach, expect, test } from "bun:test";
import type { PluginProvidersState } from "@get-bb/plugin-sdk/app";
import { assigneeProvider, initials } from "../src/task-relations";
if (typeof document === "undefined") GlobalRegistrator.register();
const { installTestPluginRuntime, renderSlot } = await import("@get-bb/plugin-sdk/testing/app");
installTestPluginRuntime();
const { cleanup } = await import("@testing-library/react");
const { default: AssigneeAvatar } = await import("../src/AssigneeAvatar");
afterEach(cleanup);
test("recognizes only Codex and Claude aliases", () => {
 for (const name of ["codex", "@Codex", " CODEX "]) expect(assigneeProvider(name)).toBe("codex");
 for (const name of ["Claude", "@claude-code", "Claude Code", "claude_code"]) expect(assigneeProvider(name)).toBe("claude-code");
 for (const name of ["Claude Smith", "codex-user", "Gemini"]) expect(assigneeProvider(name)).toBeNull();
 expect(initials("@developer")).toBe("DE");
 expect(initials("Jane Doe")).toBe("JA");
});
test("uses SDK provider metadata for both agent logos", () => {
 for (const [name, id] of [["@codex", "codex"], ["Claude", "claude-code"]]) {
  const providers = [{ id, logoUrl: `/logos/${id}.svg` }] as unknown as PluginProvidersState["providers"];
  const view = renderSlot({ component: AssigneeAvatar }, { name }, { providers: { providers } });
  const icon = view.container.querySelector("[data-provider-id]");
  expect(icon?.getAttribute("data-provider-id")).toBe(id);
  expect(icon?.getAttribute("data-provider-logo")).toBe(`/logos/${id}.svg`);
  view.unmount();
 }
});
test("unavailable providers and other names use two-letter circles", () => {
 for (const [name, letters] of [["@Codex", "CO"], ["Gemini", "GE"]]) {
  const view = renderSlot({ component: AssigneeAvatar }, { name });
  expect(view.getByLabelText(name).textContent).toBe(letters);
  view.unmount();
 }
});
