const fs = require("node:fs");
const readline = require("node:readline/promises");

async function confirmNodeModulesRemoval() {
  if (!process.stdin.isTTY) {
    let input = "";
    try {
      input = fs.readFileSync(0, "utf8");
    } catch {
      input = "";
    }
    const answer = input.trim().toLowerCase();
    return answer === "y" || answer === "yes";
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = (
      await rl.question(
        "Safety check: this will remove node_modules. Are you sure? [y/N]: ",
      )
    )
      .trim()
      .toLowerCase();
    return answer === "y" || answer === "yes";
  } finally {
    rl.close();
  }
}

module.exports = {
  confirmNodeModulesRemoval,
};
