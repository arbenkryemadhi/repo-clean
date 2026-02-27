const test = require("node:test");
const assert = require("node:assert/strict");

const { parseCliArgs } = require("../lib/args");
const { buildCleanupPlan } = require("../lib/targets");

test("parseCliArgs returns positional argument error", () => {
  const parsed = parseCliArgs(["my-folder"]);

  assert.equal(parsed.ok, false);
  assert.equal(parsed.exitCode, 2);
  assert.match(parsed.error, /Unexpected positional argument: my-folder/);
});

test("parseCliArgs returns unknown flag error with suggestion", () => {
  const parsed = parseCliArgs(["--dr-run"]);

  assert.equal(parsed.ok, false);
  assert.equal(parsed.exitCode, 2);
  assert.match(parsed.error, /Unknown flag: --dr-run/);
  assert.match(parsed.error, /Did you mean --dry-run/);
});

test("buildCleanupPlan keeps node_modules when --all and --keep-nm are set", () => {
  const plan = buildCleanupPlan({
    flagAll: true,
    keepNm: true,
    flagNodeModules: false,
    flagPmCache: false,
    flagLogs: false,
    flagEditor: false,
    flagTmp: false,
  });

  assert.equal(plan.includeNodeModules, false);
  assert.equal(plan.targets.has("node_modules"), false);
  assert.equal(plan.includeLogs, true);
});
