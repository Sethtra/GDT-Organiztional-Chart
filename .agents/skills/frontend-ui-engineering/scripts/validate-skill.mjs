#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const skillDirectory = path.resolve(scriptDirectory, "..");
const skillPath = path.join(skillDirectory, "SKILL.md");
const errors = [];
const warnings = [];

function parseFrontmatter(content, label) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) {
    errors.push(`${label}: missing frontmatter at the beginning of the file`);
    return null;
  }

  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([a-zA-Z0-9_-]+):\s*(.+)$/);
    if (!field) {
      errors.push(`${label}: invalid frontmatter line: ${line}`);
      continue;
    }
    fields[field[1]] = field[2].trim();
  }

  for (const required of ["name", "description"]) {
    if (!fields[required]) errors.push(`${label}: missing ${required}`);
  }

  return { fields, body: content.slice(match[0].length) };
}

function validateRelativeLinks(body, baseDirectory, label) {
  for (const match of body.matchAll(/\[[^\]]*]\(([^)]+)\)/g)) {
    const target = match[1].split("#")[0];
    if (
      !target ||
      /^(?:https?:|mailto:|#)/i.test(target) ||
      target.includes("<") ||
      target.includes(">")
    ) {
      continue;
    }
    const resolved = path.resolve(baseDirectory, decodeURIComponent(target));
    if (!fs.existsSync(resolved)) {
      errors.push(`${label}: referenced file does not exist: ${target}`);
    }
  }
}

if (!fs.existsSync(skillPath)) {
  console.error(`Missing canonical skill: ${skillPath}`);
  process.exit(1);
}

const content = fs.readFileSync(skillPath, "utf8");
const parsed = parseFrontmatter(content, "canonical skill");
if (parsed) {
  const { fields, body } = parsed;
  if (!/^[a-z0-9-]{1,64}$/.test(fields.name || "")) {
    errors.push("canonical skill: name must use lowercase letters, digits, and hyphens");
  }
  if (fields.name !== path.basename(skillDirectory)) {
    errors.push("canonical skill: name must match its directory");
  }
  const extraFields = Object.keys(fields).filter(
    (field) => !["name", "description"].includes(field),
  );
  if (extraFields.length) {
    warnings.push(`canonical skill: provider-specific frontmatter fields: ${extraFields.join(", ")}`);
  }
  const lines = content.split(/\r?\n/).length;
  if (lines > 500) warnings.push(`canonical skill: ${lines} lines; keep SKILL.md under 500`);
  validateRelativeLinks(body, skillDirectory, "canonical skill");
}

for (const requiredPath of [
  "references/tool-selection.md",
  "references/color-and-visual-system.md",
  "references/verification.md",
  "references/maintenance.md",
  "scripts/inspect-frontend.mjs",
  "scripts/check-contrast.mjs",
  "scripts/validate-skill.mjs",
]) {
  if (!fs.existsSync(path.join(skillDirectory, requiredPath))) {
    errors.push(`canonical skill: missing required resource ${requiredPath}`);
  }
}

const result = {
  valid: errors.length === 0,
  skillDirectory,
  errors,
  warnings,
};

console.log(JSON.stringify(result, null, 2));
process.exitCode = result.valid ? 0 : 1;
