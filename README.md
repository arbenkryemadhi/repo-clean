# repo-clean

Clean common build outputs and cache folders from a repository.

## Usage

```bash
repo-clean [--dry-run] [--node-modules] [--pm-cache] [--logs] [--editor] [--tmp]
repo-clean --all [--keep-nm] [--dry-run]
```

### Default behavior (no flags)

Removes:

- `dist`
- `build`
- `coverage`
- `.next`
- `.turbo`
- `.vite`
- `.parcel-cache`
- `.cache`

### Flags

- `--dry-run` Print what would be removed without deleting anything.
- `--node-modules` Also remove `node_modules`.
- `--pm-cache` Also remove package manager caches/stores:
  - `.yarn/cache`
  - `.yarn/unplugged`
  - `.yarn/install-state.gz`
  - `.pnp.cjs`
  - `.pnp.loader.mjs`
  - `.pnpm-store`
- `--logs` Also remove common root log files:
  - `npm-debug.log*`
  - `yarn-error.log*`
  - `pnpm-debug.log*`
  - `lerna-debug.log*`
- `--editor` Also remove editor folders (`.vscode`, `.idea`).
- `--tmp` Also remove `tmp` and `temp`.
- `--all` Include all optional cleanup categories above.
- `--keep-nm` With `--all`, keep `node_modules`.

## Examples

```bash
# Dry-run default cleanup
npx repo-clean --dry-run

# Remove default targets + node_modules
npx repo-clean --node-modules

# Full cleanup except node_modules
npx repo-clean --all --keep-nm
```

## Install

```bash
npm i -g repo-clean
repo-clean --help
```
