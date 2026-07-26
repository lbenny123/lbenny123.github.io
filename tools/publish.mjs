import { spawn } from "node:child_process";

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      ...options,
    });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
      process.stdout.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
      process.stderr.write(chunk);
    });
    child.on("close", (code) => {
      if (code === 0) resolve(output);
      else reject(new Error(`${command} ${args.join(" ")} failed with code ${code}\n${output}`));
    });
  });
}

async function hasStagedChanges() {
  try {
    await run("git", ["diff", "--cached", "--quiet"]);
    return false;
  } catch {
    return true;
  }
}

async function main() {
  const branch = (await run("git", ["rev-parse", "--abbrev-ref", "HEAD"])).trim();
  if (branch !== "source") {
    throw new Error(`Please publish from the source branch, current branch is ${branch}.`);
  }

  await run("git", ["add", "."]);
  if (await hasStagedChanges()) {
    const title = process.env.BLOG_POST_TITLE || "blog source";
    await run("git", ["commit", "-m", `Update ${title}`]);
  }

  await run("git", ["push", "-u", "origin", "source"]);
  await run("npx", ["hexo", "clean"]);
  await run("npx", ["hexo", "generate"]);
  await run("npx", ["hexo", "deploy"]);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
