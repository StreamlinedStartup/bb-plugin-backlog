import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterEach, expect, test } from "bun:test";
import { mountMentionPreview } from "./mention-preview";
if (typeof document === "undefined") GlobalRegistrator.register();
let dispose: (() => void) | undefined;
afterEach(() => { dispose?.(); document.body.replaceChildren(); });
function row(title = "CUSTOM-1 Login fix", description = "Ready · Priority: high · Password reset details") {
 const button = document.createElement("button"); button.title = `Backlog tasks: ${title}`;
 const name = document.createElement("span"), subtitle = document.createElement("span");
 name.textContent = title; subtitle.textContent = description; button.append(name, subtitle); document.body.append(button); return button;
}
const hover = (node: Element) => node.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
const leave = (node: Element, relatedTarget: EventTarget | null = null) => node.dispatchEvent(new PointerEvent("pointerout", { bubbles: true, relatedTarget }));
const shown = () => document.querySelector<HTMLElement>('[role="tooltip"]');
const dwell = () => Bun.sleep(1550);
test("preview waits 1.5 seconds, renders safe row text, persists on hover and restores ARIA", async () => {
 const button = row("CUSTOM-1 <img src=x>"); button.setAttribute("aria-describedby", "existing");
 dispose = mountMentionPreview(); hover(button);
 await Bun.sleep(1400); expect(shown()).toBeNull();
 await Bun.sleep(200); const preview = shown()!;
 expect(preview.textContent).toContain("CUSTOM-1 <img src=x>"); expect(preview.querySelector("img")).toBeNull();
 expect(preview.textContent).toContain("Password reset details"); expect(button.getAttribute("aria-describedby")).toBe("existing backlog-mention-preview");
 leave(button, preview); hover(preview); await Bun.sleep(200); expect(shown()).not.toBeNull();
 leave(preview); await Bun.sleep(200); expect(shown()).toBeNull(); expect(button.getAttribute("aria-describedby")).toBe("existing");
 hover(button); window.dispatchEvent(new Event("resize")); await dwell(); expect(shown()).toBeNull();
});
test("changing rows restarts the delay; Escape dismisses without consuming keyboard input", async () => {
 const first = row(), second = row("OTHER-2 Second", "Second description");
 dispose = mountMentionPreview(); hover(first); await Bun.sleep(100); hover(second); await dwell();
 expect(shown()?.textContent).toContain("Second description"); expect(first.hasAttribute("aria-describedby")).toBe(false);
 for (const init of [
  ...["Meta", "Shift", "Control", "Alt"].map(key => ({ key })),
  ...["Digit3", "Digit4", "Digit5"].map(code => ({ code, metaKey: true, shiftKey: true })),
 ]) {
  const key = new KeyboardEvent("keydown", { ...init, bubbles: true, cancelable: true });
  second.dispatchEvent(key); expect(shown()).not.toBeNull(); expect(key.defaultPrevented).toBe(false);
 }
 const escape = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }); second.dispatchEvent(escape);
 expect(shown()).toBeNull(); expect(escape.defaultPrevented).toBe(false); expect(second.hasAttribute("aria-describedby")).toBe(false);
});
test("keyboard highlighting and focus show previews; menu removal cancels them", async () => {
 const button = row(), editor = document.createElement("div"); editor.setAttribute("role", "textbox"); document.body.append(editor);
 dispose = mountMentionPreview();
 button.classList.add("bg-state-active"); await Bun.sleep(0);
 editor.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
 await dwell(); expect(shown()).not.toBeNull();
 button.remove(); await Bun.sleep(0); expect(shown()).toBeNull();
 const focused = row("OTHER-2 Focused"); focused.focus(); await dwell(); expect(shown()?.textContent).toContain("OTHER-2 Focused");
});
test("row changes, selection, scrolling and disposal remove stale previews", async () => {
 const button = row(); dispose = mountMentionPreview(); hover(button); await dwell();
 button.lastElementChild!.textContent = "Updated"; await Bun.sleep(0); expect(shown()).toBeNull();
 hover(button); button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); await dwell(); expect(shown()).toBeNull();
 hover(button); document.dispatchEvent(new Event("scroll")); await dwell(); expect(shown()).toBeNull();
 hover(button); dispose(); await dwell(); expect(shown()).toBeNull();
}, 10000);
test("unrelated rows and brief hover do not show previews", async () => {
 const other = row(); other.title = "Other provider: CUSTOM-1";
 dispose = mountMentionPreview(); hover(other); await dwell(); expect(shown()).toBeNull();
 const button = row(); hover(button); leave(button); await dwell(); expect(shown()).toBeNull();
 hover(button); leave(button); hover(button); await dwell(); expect(shown()).not.toBeNull();
});
