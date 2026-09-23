# Dependency management

Use pnpm 12.4.2, pinned in `package.json` and `mise.toml`.
`pnpm-lock.yaml` is the repository's only dependency lockfile.

- Install the locked dependencies with `mise run install` or `pnpm install --frozen-lockfile`.
- Add runtime packages with `pnpm add <package>` and development packages with `pnpm add -D <package>`.
- Commit `package.json` and `pnpm-lock.yaml` together when dependencies change.
- After `bb plugin types` updates SDK dependencies, run `pnpm install` to update the lockfile.

Bun runs tests and TypeScript scripts through mise; use pnpm to install dependencies.
Host-shimmed frontend packages belong in `devDependencies`; bundled runtime
packages such as `zod` belong in `dependencies`.
