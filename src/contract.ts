import { defineRpcContract } from "@get-bb/plugin-sdk";
import { z } from "zod";
import { projectSchema, boardSchema, taskSchema, editSchema } from "./model";
const projectInput = z.object({ projectId: z.string() });
export const rpcContract = defineRpcContract({
 projects: { input: z.null(), output: z.array(projectSchema) },
 board: { input: projectInput, output: boardSchema },
 settings: { input: z.object({ projectId: z.string(), sourceId: z.string(), folder: z.string().max(16000).nullable() }), output: z.null() },
 browse: { input: z.object({ projectId: z.string(), sourceId: z.string() }), output: z.string().nullable() },
 save: { input: z.object({ projectId: z.string(), sourceId: z.string(), folder: z.string(), path: z.string(), taskId: z.string().min(1), revision: z.string(), edits: z.array(editSchema).min(1).max(30) }), output: z.object({ task: taskSchema, conflict: z.boolean(), message: z.string() }) },
 move: { input: z.object({ projectId: z.string(), sourceId: z.string(), folder: z.string(), path: z.string(), taskId: z.string().min(1), revision: z.string(), status: z.string(), beforePath: z.string().nullable() }), output: z.null() },
 release: { input: projectInput, output: z.null() },
});
