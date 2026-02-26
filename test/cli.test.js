const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const cliPath = path.resolve(__dirname, "../bin/repo-clean.js");
const pkg = require("../package.json");

function mkRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "repo-clean-test-"));
}

function makePath(repo, rel, asFile = false) {
  const abs = path.join(repo, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  if (asFile) {
    fs.writeFileSync(abs, "x");
  } else {
    fs.mkdirSync(abs, { recursive: true });
  }
  return abs;
}

function exists(repo, rel) {
  return fs.existsSync(path.join(repo, rel));
}

function runCli({ repo, args = [], input } = {}) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repo,
    input,
    encoding: "utf8",
  });
}

test("prints help and exits 0", () => {
  const repo = mkRepo();
  const result = runCli({ repo, args: ["--help"] });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage:/);
  assert.match(result.stdout, /--dry-run/);
});

test("prints version with --version and -v", () => {
  const repo = mkRepo();

  const longFlag = runCli({ repo, args: ["--version"] });
  assert.equal(longFlag.status, 0);
  assert.equal(longFlag.stdout.trim(), pkg.version);

  const shortFlag = runCli({ repo, args: ["-v"] });
  assert.equal(shortFlag.status, 0);
  assert.equal(shortFlag.stdout.trim(), pkg.version);
});

test("unknown flag exits 2 and suggests closest valid flag", () => {
  const repo = mkRepo();
  const result = runCli({ repo, args: ["--dr-run"] });

  assert.equal(result.status, 2);
  assert.match(result.stderr, /Unknown flag: --dr-run/);
  assert.match(result.stderr, /Did you mean --dry-run\?/);
});

test("default cleanup removes default targets that exist", () => {
  const repo = mkRepo();
  makePath(repo, "dist");
  makePath(repo, "build");
  makePath(repo, ".cache");

  const result = runCli({ repo });

  assert.equal(result.status, 0);
  assert.equal(exists(repo, "dist"), false);
  assert.equal(exists(repo, "build"), false);
  assert.equal(exists(repo, ".cache"), false);
  assert.match(result.stdout, /removed 3 item\(s\)\./);
});

test("dry-run does not remove files", () => {
  const repo = mkRepo();
  makePath(repo, "dist");

  const result = runCli({ repo, args: ["--dry-run"] });

  assert.equal(result.status, 0);
  assert.equal(exists(repo, "dist"), true);
  assert.match(result.stdout, /\[dry-run\] would remove:/);
  assert.match(result.stdout, /done \(dry-run\)\. would remove 1 item\(s\)\./);
});

test("--node-modules --force removes node_modules", () => {
  const repo = mkRepo();
  makePath(repo, "node_modules");

  const result = runCli({ repo, args: ["--node-modules", "--force"] });

  assert.equal(result.status, 0);
  assert.equal(exists(repo, "node_modules"), false);
  assert.match(result.stdout, /includes node_modules/);
});

test("--all --keep-nm removes optional sets but keeps node_modules", () => {
  const repo = mkRepo();
  makePath(repo, "node_modules");
  makePath(repo, ".vscode");
  makePath(repo, "tmp");
  makePath(repo, ".pnpm-store");
  makePath(repo, "npm-debug.log.123", true);

  const result = runCli({ repo, args: ["--all", "--keep-nm"] });

  assert.equal(result.status, 0);
  assert.equal(exists(repo, "node_modules"), true);
  assert.equal(exists(repo, ".vscode"), false);
  assert.equal(exists(repo, "tmp"), false);
  assert.equal(exists(repo, ".pnpm-store"), false);
  assert.equal(exists(repo, "npm-debug.log.123"), false);
  assert.match(result.stdout, /\(kept node_modules\)/);
});

test("--node-modules prompt aborts on non-yes input", () => {
  const repo = mkRepo();
  makePath(repo, "node_modules");

  const result = runCli({
    repo,
    args: ["--node-modules"],
    input: "n\n",
  });

  assert.equal(result.status, 1);
  assert.equal(exists(repo, "node_modules"), true);
  assert.match(result.stdout, /Aborted\. No files were removed\./);
});

test("--node-modules prompt accepts yes input in non-tty mode", () => {
  const repo = mkRepo();
  makePath(repo, "node_modules");

  const result = runCli({
    repo,
    args: ["--node-modules"],
    input: "yes\n",
  });

  assert.equal(result.status, 0);
  assert.equal(exists(repo, "node_modules"), false);
});

test("empty repo succeeds and reports zero removed", () => {
  const repo = mkRepo();
  const result = runCli({ repo });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /removed 0 item\(s\)\./);
});

test(
  "reports error and exits 1 when deletion fails",
  { skip: process.platform === "win32" },
  () => {
    const repo = mkRepo();
    makePath(repo, "dist");

    fs.chmodSync(repo, 0o555);
    const result = runCli({ repo });
    fs.chmodSync(repo, 0o755);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /^Error:/m);
  },
);

test("unknown far-away flag does not include suggestion", () => {
  const repo = mkRepo();
  const result = runCli({ repo, args: ["--totally-unrelated"] });

  assert.equal(result.status, 2);
  assert.match(result.stderr, /Unknown flag: --totally-unrelated/);
  assert.doesNotMatch(result.stderr, /Did you mean/);
});

test("multiple unknown flags are reported together with suggestions", () => {
  const repo = mkRepo();
  const result = runCli({ repo, args: ["--dr-run", "--node-moduls"] });

  assert.equal(result.status, 2);
  assert.match(result.stderr, /Unknown flags: --dr-run, --node-moduls/);
  assert.match(result.stderr, /Did you mean:/);
  assert.match(result.stderr, /--dr-run -> --dry-run/);
  assert.match(result.stderr, /--node-moduls -> --node-modules/);
});

test("unknown flag wins over help", () => {
  const repo = mkRepo();
  const result = runCli({ repo, args: ["--help", "--dr-run"] });

  assert.equal(result.status, 2);
  assert.match(result.stderr, /Unknown flag/);
  assert.equal(result.stdout, "");
});

test("unknown flag wins over version", () => {
  const repo = mkRepo();
  const result = runCli({ repo, args: ["--version", "--dr-run"] });

  assert.equal(result.status, 2);
  assert.match(result.stderr, /Unknown flag/);
  assert.notEqual(result.stdout.trim(), pkg.version);
});

test("--keep-nm alone does not include node_modules", () => {
  const repo = mkRepo();
  makePath(repo, "node_modules");
  makePath(repo, "dist");

  const result = runCli({ repo, args: ["--keep-nm"] });

  assert.equal(result.status, 0);
  assert.equal(exists(repo, "node_modules"), true);
  assert.equal(exists(repo, "dist"), false);
  assert.doesNotMatch(result.stdout, /node_modules/);
});

test("--all with explicit --node-modules and --keep-nm still keeps node_modules", () => {
  const repo = mkRepo();
  makePath(repo, "node_modules");

  const result = runCli({
    repo,
    args: ["--all", "--node-modules", "--keep-nm"],
  });

  assert.equal(result.status, 0);
  assert.equal(exists(repo, "node_modules"), true);
  assert.match(result.stdout, /\(kept node_modules\)/);
});

test("--all with --force removes node_modules without prompt", () => {
  const repo = mkRepo();
  makePath(repo, "node_modules");

  const result = runCli({
    repo,
    args: ["--all", "--force"],
  });

  assert.equal(result.status, 0);
  assert.equal(exists(repo, "node_modules"), false);
  assert.match(result.stdout, /includes node_modules/);
});

test("--all prompt abort keeps all targets intact", () => {
  const repo = mkRepo();
  makePath(repo, "node_modules");
  makePath(repo, "dist");
  makePath(repo, ".vscode");

  const result = runCli({
    repo,
    args: ["--all"],
    input: "no\n",
  });

  assert.equal(result.status, 1);
  assert.equal(exists(repo, "node_modules"), true);
  assert.equal(exists(repo, "dist"), true);
  assert.equal(exists(repo, ".vscode"), true);
});

test("--dry-run with node_modules does not require prompt and keeps files", () => {
  const repo = mkRepo();
  makePath(repo, "node_modules");

  const result = runCli({ repo, args: ["--node-modules", "--dry-run"] });

  assert.equal(result.status, 0);
  assert.equal(exists(repo, "node_modules"), true);
  assert.match(result.stdout, /\[dry-run\] would remove:/);
});

test("prompt accepts uppercase and surrounding whitespace", () => {
  const repo = mkRepo();
  makePath(repo, "node_modules");

  const result = runCli({
    repo,
    args: ["--node-modules"],
    input: "   YES   \n",
  });

  assert.equal(result.status, 0);
  assert.equal(exists(repo, "node_modules"), false);
});

test("empty stdin in non-tty mode aborts node_modules removal", () => {
  const repo = mkRepo();
  makePath(repo, "node_modules");

  const result = runCli({
    repo,
    args: ["--node-modules"],
    input: "",
  });

  assert.equal(result.status, 1);
  assert.equal(exists(repo, "node_modules"), true);
  assert.match(result.stdout, /Aborted\. No files were removed\./);
});

test("--pm-cache removes both directories and files", () => {
  const repo = mkRepo();
  makePath(repo, ".yarn/cache");
  makePath(repo, ".yarn/unplugged");
  makePath(repo, ".yarn/install-state.gz", true);
  makePath(repo, ".pnp.cjs", true);
  makePath(repo, ".pnp.loader.mjs", true);
  makePath(repo, ".pnpm-store");

  const result = runCli({ repo, args: ["--pm-cache"] });

  assert.equal(result.status, 0);
  assert.equal(exists(repo, ".yarn/cache"), false);
  assert.equal(exists(repo, ".yarn/unplugged"), false);
  assert.equal(exists(repo, ".yarn/install-state.gz"), false);
  assert.equal(exists(repo, ".pnp.cjs"), false);
  assert.equal(exists(repo, ".pnp.loader.mjs"), false);
  assert.equal(exists(repo, ".pnpm-store"), false);
  assert.match(result.stdout, /removed 6 item\(s\)\./);
});

test("--logs removes matching root files but not directories", () => {
  const repo = mkRepo();
  makePath(repo, "npm-debug.log", true);
  makePath(repo, "npm-debug.log.999", true);
  makePath(repo, "yarn-error.log-more", true);
  makePath(repo, "pnpm-debug.log", true);
  makePath(repo, "lerna-debug.log.1", true);
  makePath(repo, "npm-debug.log.dir");

  const result = runCli({ repo, args: ["--logs"] });

  assert.equal(result.status, 0);
  assert.equal(exists(repo, "npm-debug.log"), false);
  assert.equal(exists(repo, "npm-debug.log.999"), false);
  assert.equal(exists(repo, "yarn-error.log-more"), false);
  assert.equal(exists(repo, "pnpm-debug.log"), false);
  assert.equal(exists(repo, "lerna-debug.log.1"), false);
  assert.equal(exists(repo, "npm-debug.log.dir"), true);
});

test("log cleanup only considers repo root", () => {
  const repo = mkRepo();
  makePath(repo, "npm-debug.log", true);
  makePath(repo, "nested/npm-debug.log", true);

  const result = runCli({ repo, args: ["--logs"] });

  assert.equal(result.status, 0);
  assert.equal(exists(repo, "npm-debug.log"), false);
  assert.equal(exists(repo, "nested/npm-debug.log"), true);
});

test("duplicate flags do not change behavior", () => {
  const repo = mkRepo();
  makePath(repo, "dist");

  const result = runCli({
    repo,
    args: ["--dry-run", "--dry-run", "--dry-run"],
  });

  assert.equal(result.status, 0);
  assert.equal(exists(repo, "dist"), true);
  assert.match(result.stdout, /done \(dry-run\)/);
});

test("non-flag argument is ignored", () => {
  const repo = mkRepo();
  makePath(repo, "dist");

  const result = runCli({ repo, args: ["some-positional-arg"] });

  assert.equal(result.status, 0);
  assert.equal(exists(repo, "dist"), false);
});
