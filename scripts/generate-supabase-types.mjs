import { spawn } from "node:child_process";
import { readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import dotenv from "dotenv";

const workspace = resolve(import.meta.dirname, "..");
dotenv.config({ path: resolve(workspace, ".env.local") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
if (!supabaseUrl) {
  throw new Error("VITE_SUPABASE_URL is missing from .env.local.");
}
if (!process.env.SUPABASE_ACCESS_TOKEN) {
  throw new Error(
    "SUPABASE_ACCESS_TOKEN is required to generate remote database types.",
  );
}

const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
if (!projectRef) {
  throw new Error("Unable to determine the Supabase project reference.");
}

const executable = process.platform === "win32" ? "npx.cmd" : "npx";
const child = spawn(
  executable,
  [
    "supabase",
    "gen",
    "types",
    "typescript",
    "--project-id",
    projectRef,
    "--schema",
    "public",
  ],
  {
    cwd: workspace,
    env: process.env,
    stdio: ["ignore", "pipe", "inherit"],
    shell: false,
  },
);

let generated = "";
child.stdout.setEncoding("utf8");
child.stdout.on("data", (chunk) => {
  generated += chunk;
});

const exitCode = await new Promise((resolveExit, reject) => {
  child.once("error", reject);
  child.once("exit", resolveExit);
});

if (exitCode !== 0) {
  throw new Error(`Supabase type generation failed with exit code ${exitCode}.`);
}
if (!generated.includes("export type Database")) {
  throw new Error("Generated output did not contain a Database type.");
}

const target = resolve(workspace, "src", "types", "database.types.ts");
const temporary = `${target}.next`;
await writeFile(temporary, generated, { encoding: "utf8", flag: "wx" });
await readFile(temporary, "utf8");
await rename(temporary, target);

console.log("Updated src/types/database.types.ts from the Supabase schema.");
