import { defineRpcContract } from "@get-bb/plugin-sdk";
import { z } from "zod";
import { projectSchema, boardSchema, taskSchema, editSchema } from "./model";
const projectInput = z.object({ projectId: z.string() });
const recordKind = z.enum(["document", "decision"]);
const recordSummary = z.object({ path: z.string(), title: z.string() });
const recordListItem = recordSummary.extend({ excerpt: z.string() });
const recordSchema = recordSummary.extend({ revision: z.string(), content: z.string() });
export const rpcContract = defineRpcContract({
 projects: { input: z.null(), output: z.array(projectSchema) },
 board: { input: projectInput, output: boardSchema },
 markdownRecords: { input: projectInput, output: z.object({ documents: z.array(recordListItem), decisions: z.array(recordListItem), warnings: z.array(z.string()) }) },
 readMarkdownRecord: { input: projectInput.extend({ kind: recordKind, path: z.string() }), output: recordSchema },
 saveMarkdownRecord: { input: projectInput.extend({ kind: recordKind, path: z.string(), revision: z.string(), content: z.string().max(512 * 1024) }), output: z.object({ record: recordSchema, conflict: z.boolean(), message: z.string() }) },
 settings: { input: z.object({ projectId: z.string(), sourceId: z.string(), folder: z.string().max(16000).nullable() }), output: z.null() },
 browse: { input: z.object({ projectId: z.string(), sourceId: z.string() }), output: z.string().nullable() },
 save: { input: z.object({ projectId: z.string(), sourceId: z.string(), folder: z.string(), path: z.string(), taskId: z.string().min(1), revision: z.string(), edits: z.array(editSchema).min(1).max(30) }), output: z.object({ task: taskSchema, conflict: z.boolean(), message: z.string() }) },
 move: { input: z.object({ projectId: z.string(), sourceId: z.string(), folder: z.string(), path: z.string(), taskId: z.string().min(1), revision: z.string(), status: z.string(), beforePath: z.string().nullable() }), output: z.null() },
 release: { input: projectInput, output: z.null() },
});
