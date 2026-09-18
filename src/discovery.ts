import { posix as path } from "node:path";
import { parseDocument } from "yaml";

export interface DiscoveryIO {
  exists(paths: string[]): Promise<Record<string, boolean>>;
  read(path: string): Promise<string>;
}
export interface Config {
  statuses: string[];
  priorities: string[];
  types: string[];
  projects: string[];
  [key: string]: unknown;
}
export interface Resolution {
  state: "ready" | "missing" | "ambiguous";
  folder: string | null;
  candidates: string[];
  message: string;
  config: Config;
}
export const defaultConfig: Config = { statuses: ["To Do", "In Progress", "Done"], priorities: ["high", "medium", "low"], types: ["bug", "feature", "enhancement", "task", "chore", "docs", "spike"], projects: [] };
export function absoluteFolder(root: string, value: string): string {
  if (!value.trim() || value.includes("\0") || value.includes("\\")) throw new Error("Enter a valid folder path on the selected host.");
  return path.resolve(root, value.trim());
}
export function parseConfig(raw: string): Record<string, unknown> {
  const doc = parseDocument(raw, { uniqueKeys: true });
  if (doc.errors.length) throw new Error(`Invalid Backlog configuration: ${doc.errors[0].message}`);
  const value: unknown = doc.toJS({ maxAliasCount: 50 });
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Backlog configuration must be a YAML mapping.");
  return value as Record<string, unknown>;
}
function normalizeConfig(data: Record<string, unknown>): Config {
  const choices = (key: string, fallback: string[]) => {
    const value = data[key];
    if (value === undefined || (Array.isArray(value) && value.length === 0)) return fallback;
    if (!Array.isArray(value) || value.some(v => typeof v !== "string" || !v.trim()) || new Set(value).size !== value.length) throw new Error(`Backlog ${key} must be a list of unique non-empty strings.`);
    return value as string[];
  };
  return { ...data, statuses: choices("statuses", defaultConfig.statuses), priorities: choices("priorities", defaultConfig.priorities).map(v => v.toLowerCase()), types: choices("types", defaultConfig.types), projects: choices("projects", []) };
}
export async function discover(io: DiscoveryIO, root: string, override: string | null): Promise<Resolution> {
  const rootConfig = path.join(root, "backlog.config.yml");
  const candidates = [path.join(root, "backlog"), path.join(root, ".backlog")];
  const existence = await io.exists([rootConfig, ...candidates]);
  const rootData = existence[rootConfig] ? parseConfig(await io.read(rootConfig)) : {};
  let folder: string | null = null;
  if (override) folder = absoluteFolder(root, override);
  else if (rootData.backlog_directory !== undefined) {
    if (typeof rootData.backlog_directory !== "string") throw new Error("backlog_directory must be a folder path.");
    folder = absoluteFolder(root, rootData.backlog_directory);
  } else {
    const found = candidates.filter(p => existence[p]);
    if (found.length > 1) return { state: "ambiguous", folder: null, candidates: found, message: "Both backlog/ and .backlog/ exist. Choose a folder in project settings.", config: normalizeConfig(rootData) };
    folder = found[0] ?? null;
  }
  if (!folder || !(await io.exists([folder]))[folder]) return { state: "missing", folder, candidates: [], message: folder ? `Folder not found: ${folder}` : "No Backlog folder found. Choose an existing folder in project settings.", config: normalizeConfig(rootData) };
  const legacyConfig = path.join(folder, "config.yml");
  const legacyExists = (await io.exists([legacyConfig]))[legacyConfig];
  const legacyData = legacyExists ? parseConfig(await io.read(legacyConfig)) : {};
  return { state: "ready", folder, candidates: [], message: "", config: normalizeConfig({ ...legacyData, ...rootData }) };
}
export function confinedTaskPath(folder: string, candidate: string): string {
  const absolute = path.resolve(folder, candidate);
  const relative = path.relative(folder, absolute);
  if (!/^(tasks|completed|archive\/tasks)\/.+\.md$/i.test(relative) || relative.split("/").includes("..")) throw new Error("Task path is outside the selected task directories.");
  return absolute;
}
