import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
export default function Markdown({ children, onEditSection, editable = [] }: { children: string; onEditSection?: (key: string) => void; editable?: string[] }) {
 return <div className="markdown"><ReactMarkdown skipHtml remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={{
  a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
  img: ({ alt }) => <span className="image-placeholder">Image: {alt || "Untitled"}</span>,
  h2: ({ children }) => {
   const key = String(children).replace(/\s*\(Optional\)$/i, "").toLowerCase();
   const canEdit = onEditSection && editable.includes(key);
   return <h2 role={canEdit ? "button" : undefined} tabIndex={canEdit ? 0 : undefined} aria-label={canEdit ? `Edit ${key}` : undefined} onKeyDown={event => { if (canEdit && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onEditSection(key); } }} onDoubleClick={() => canEdit && onEditSection(key)}>{children}</h2>;
  },
 }}>{children || "_No content yet._"}</ReactMarkdown></div>;
}
