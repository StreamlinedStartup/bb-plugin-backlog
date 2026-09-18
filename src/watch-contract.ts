import { defineRpcContract, type ExperimentalHostSignals } from "@get-bb/plugin-sdk";
import { z } from "zod";
export const watchContract = defineRpcContract({
  watch: { input: z.object({ key: z.string().min(1), rootPath: z.string().min(1), folder: z.string().min(1) }).strict(), output: z.null() },
  unwatch: { input: z.object({ key: z.string().min(1) }).strict(), output: z.null() },
  inventory: { input: z.object({ folder: z.string().min(1) }).strict(), output: z.object({ files: z.array(z.object({ path: z.string(), storage: z.enum(["active", "completed", "archived"]) })), warnings: z.array(z.string()) }).strict() },
});
export const watchSignals = { changed: { payload: z.object({ key: z.string(), error: z.string().optional() }).strict() } } satisfies ExperimentalHostSignals;
