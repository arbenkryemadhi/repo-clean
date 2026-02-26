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

## Issues and Support

- Bug reports: https://github.com/arbenkryemadhi/repo-clean/issues/new
- Feature requests: https://github.com/arbenkryemadhi/repo-clean/issues/new
- General issues: https://github.com/arbenkryemadhi/repo-clean/issues

When opening an issue, include:

- Your OS and Node.js version
- The exact command you ran
- The output you expected vs the output you got
- A minimal repo structure that reproduces the behavior (if possible)

## Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a branch for your change.
3. Make focused changes and update docs when behavior changes.
4. Test with `--dry-run` and relevant flags.
5. Open a pull request with a clear description.

### Local development

```bash
git clone https://github.com/arbenkryemadhi/repo-clean.git
cd repo-clean
node ./bin/repo-clean.js --help
node ./bin/repo-clean.js --dry-run
```

### Pull request checklist

- Keep scope small and focused.
- Preserve existing CLI behavior unless intentionally changing it.
- Update README for any user-facing flag or behavior changes.
- Add reproducible steps in the PR description.
