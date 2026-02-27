const allowedFlags = new Set([
  "--dry-run",
  "--help",
  "-h",
  "--version",
  "-v",
  "--force",
  "--all",
  "--keep-nm",
  "--node-modules",
  "--pm-cache",
  "--logs",
  "--editor",
  "--tmp",
]);

const EXIT_INVALID_ARGS = 2;

function isFlagToken(arg) {
  return arg.startsWith("-");
}

function editDistance(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }

  return dp[m][n];
}

function getClosestFlag(input) {
  let best = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const flag of allowedFlags) {
    const dist = editDistance(input, flag);
    if (dist < bestDistance) {
      best = flag;
      bestDistance = dist;
    }
  }

  if (!best) return null;
  if (bestDistance > 3) return null;
  return best;
}

function formatUnknownFlagError(unknownFlags) {
  const unknownList = unknownFlags.join(", ");
  const flagLabel = unknownFlags.length === 1 ? "flag" : "flags";
  const suggestions = unknownFlags
    .map((flag) => {
      const suggestion = getClosestFlag(flag);
      return suggestion ? { flag, suggestion } : null;
    })
    .filter(Boolean);

  let suggestionText = "";
  if (suggestions.length === 1 && unknownFlags.length === 1) {
    suggestionText = ` Did you mean ${suggestions[0].suggestion}?`;
  } else if (suggestions.length > 0) {
    const pairs = suggestions.map(
      (item) => `${item.flag} -> ${item.suggestion}`,
    );
    suggestionText = ` Did you mean: ${pairs.join(", ")}?`;
  }

  return `Unknown ${flagLabel}: ${unknownList}. This looks like a typo.${suggestionText} Run repo-clean --help for valid options.`;
}

function formatPositionalArgError(positionalArgs) {
  const argLabel = positionalArgs.length === 1 ? "argument" : "arguments";
  const list = positionalArgs.join(", ");
  return `Unexpected positional ${argLabel}: ${list}. repo-clean accepts flags only. Run repo-clean --help for usage.`;
}

function parseCliArgs(argv) {
  const args = new Set(argv);

  const unknownFlags = argv.filter(
    (arg) => isFlagToken(arg) && !allowedFlags.has(arg),
  );
  if (unknownFlags.length > 0) {
    return {
      ok: false,
      exitCode: EXIT_INVALID_ARGS,
      error: formatUnknownFlagError(unknownFlags),
    };
  }

  const positionalArgs = argv.filter((arg) => !isFlagToken(arg));
  if (positionalArgs.length > 0) {
    return {
      ok: false,
      exitCode: EXIT_INVALID_ARGS,
      error: formatPositionalArgError(positionalArgs),
    };
  }

  return {
    ok: true,
    options: {
      dryRun: args.has("--dry-run"),
      help: args.has("--help") || args.has("-h"),
      version: args.has("--version") || args.has("-v"),
      force: args.has("--force"),
      flagAll: args.has("--all"),
      keepNm: args.has("--keep-nm"),
      flagNodeModules: args.has("--node-modules"),
      flagPmCache: args.has("--pm-cache"),
      flagLogs: args.has("--logs"),
      flagEditor: args.has("--editor"),
      flagTmp: args.has("--tmp"),
    },
  };
}

module.exports = {
  allowedFlags,
  parseCliArgs,
};
