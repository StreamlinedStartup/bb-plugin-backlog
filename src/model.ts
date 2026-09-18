import { z } from "zod";
export const valueSchema = z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(z.string())]);
export type FieldValue = z.infer<typeof valueSchema>;
export const taskSchema = z.object({
  path: z.string(), revision: z.string(), storage: z.enum(["active", "completed", "archived"]),
  id: z.string(), title: z.string(), status: z.string(), ordinal: z.number().nullable(),
  fields: z.record(z.string(), z.unknown()), body: z.string(),
  sections: z.record(z.string(), z.string()), errors: z.array(z.string()),
  progress: z.object({ done: z.number(), total: z.number() }),
});
export type Task = z.infer<typeof taskSchema>;
export const sourceSchema = z.object({ id: z.string(), hostId: z.string(), path: z.string() });
export const projectSchema = z.object({ id: z.string(), name: z.string(), sources: z.array(sourceSchema), selectedSourceId: z.string().nullable(), folder: z.string().nullable() });
export type Project = z.infer<typeof projectSchema>;
export const boardSchema = z.object({
 projectId: z.string(), sourceId: z.string().nullable(), folder: z.string().nullable(),
 state: z.enum(["ready", "missing", "ambiguous", "unavailable", "select-source"]),
 choices: z.record(z.string(), z.array(z.string())), message: z.string(), candidates: z.array(z.string()), statuses: z.array(z.string()),
 lastChangeAt: z.number().nullable(), tasks: z.array(taskSchema), warnings: z.array(z.string()),
});
export type Board = z.infer<typeof boardSchema>;
export const editSchema = z.object({ kind: z.enum(["field", "section"]), key: z.string().max(100), before: valueSchema, value: valueSchema });
export type Edit = z.infer<typeof editSchema>;
