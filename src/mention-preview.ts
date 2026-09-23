// ponytail: BB 0.5.9 row markup is not a versioned API; replace this selector with a native preview slot when BB exposes one.
const rows = 'button[title^="Backlog tasks: "]';
const titlePrefix = "Backlog tasks: ";
export function mountMentionPreview() {
 let row: HTMLButtonElement | null = null;
 let content = "", previousDescription: string | null = null;
 let preview: HTMLDivElement | null = null;
 let timer: ReturnType<typeof setTimeout> | undefined;
 let leaving: ReturnType<typeof setTimeout> | undefined;
 let keyboard = false;
 const controller = new AbortController();
 const options = { signal: controller.signal, capture: true };
 const targetRow = (target: EventTarget | null) => target instanceof Element ? target.closest<HTMLButtonElement>(rows) : null;
 const text = (button: HTMLButtonElement) => button.querySelectorAll("span")[1]?.textContent ?? "";
 function clear() {
  clearTimeout(timer); clearTimeout(leaving);
  if (row && preview) {
   if (previousDescription === null) row.removeAttribute("aria-describedby");
   else row.setAttribute("aria-describedby", previousDescription);
  }
  preview?.remove(); preview = null; row = null;
 }
 function show(button: HTMLButtonElement) {
  if (!button.isConnected) return clear();
  preview = document.createElement("div");
  preview.id = "backlog-mention-preview";
  preview.className = "backlog-mention-preview";
  preview.setAttribute("role", "tooltip");
  const title = document.createElement("strong"), body = document.createElement("p");
  title.textContent = button.title.slice(titlePrefix.length);
  body.textContent = text(button);
  preview.append(title, body); document.body.append(preview);
  previousDescription = button.getAttribute("aria-describedby");
  button.setAttribute("aria-describedby", [previousDescription, preview.id].filter(Boolean).join(" "));
  const anchor = button.getBoundingClientRect(), box = preview.getBoundingClientRect();
  const gap = 8, margin = 12;
  const right = anchor.right + gap, left = anchor.left - box.width - gap;
  const side = right + box.width <= innerWidth - margin ? right : left >= margin ? left : null;
  preview.style.left = `${Math.max(margin, Math.min(side ?? anchor.left, innerWidth - box.width - margin))}px`;
  preview.style.top = `${Math.max(margin, Math.min(side === null ? anchor.bottom + gap : anchor.top, innerHeight - box.height - margin))}px`;
 }
 function schedule(next: HTMLButtonElement | null) {
  const nextContent = next ? next.title + text(next) : "";
  if (row === next && content === nextContent) return;
  clear(); row = next; content = nextContent;
  if (next) timer = setTimeout(() => show(next), 1500);
 }
 function keyboardRow() {
  const focused = targetRow(document.activeElement);
  const highlighted = document.querySelectorAll<HTMLButtonElement>(`${rows}.bg-state-active`);
  schedule(focused ?? (highlighted.length === 1 ? highlighted[0] : null));
 }
 document.addEventListener("pointerover", event => {
  if (preview?.contains(event.target as Node)) { clearTimeout(leaving); return; }
  const next = targetRow(event.target);
  if (next) { keyboard = false; clearTimeout(leaving); schedule(next); }
 }, options);
 document.addEventListener("pointerout", event => {
  if (!row || keyboard) return;
  const related = event.relatedTarget;
  if (related instanceof Node && (row.contains(related) || preview?.contains(related))) return;
  if (row.contains(event.target as Node) || preview?.contains(event.target as Node)) {
   if (!preview) return clear();
   leaving = setTimeout(clear, 150);
  }
 }, options);
 document.addEventListener("focusin", event => {
  const next = targetRow(event.target);
  if (next) { keyboard = true; schedule(next); }
  else { keyboard = false; clear(); }
 }, options);
 document.addEventListener("keydown", event => {
  if (["Meta", "Shift", "Control", "Alt"].includes(event.key) ||
      (event.metaKey && event.shiftKey && ["Digit3", "Digit4", "Digit5"].includes(event.code))) return;
  if ((event.key === "ArrowDown" || event.key === "ArrowUp") && (targetRow(event.target) || (event.target instanceof Element && event.target.matches('[role="textbox"]')))) {
   keyboard = true;
   // The native picker updates its highlighted class after this capture listener.
   queueMicrotask(() => { if (!controller.signal.aborted && keyboard) keyboardRow(); });
  } else if (!(preview?.contains(event.target as Node))) { keyboard = false; clear(); }
 }, options);
 document.addEventListener("pointerdown", event => {
  if (!preview?.contains(event.target as Node)) { keyboard = false; clear(); }
 }, options);
 document.addEventListener("scroll", event => {
  if (!preview?.contains(event.target as Node)) { keyboard = false; clear(); }
 }, options);
 window.addEventListener("resize", () => { keyboard = false; clear(); }, options);
 const observer = new MutationObserver(() => {
  if (keyboard) keyboardRow();
  else if (row && (!row.isConnected || content !== row.title + text(row))) clear();
 });
 observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["class", "title"] });
 return () => { controller.abort(); observer.disconnect(); clear(); };
}
