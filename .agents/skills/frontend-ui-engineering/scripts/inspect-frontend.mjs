#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const projectRoot = path.resolve(process.argv[2] || process.cwd());
const ignoredDirectories = new Set([
  ".git",
  ".next",
  ".nuxt",
  ".svelte-kit",
  ".vercel",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
]);
const maxFiles = 8000;
const maxTextBytes = 256 * 1024;

if (!fs.existsSync(projectRoot) || !fs.statSync(projectRoot).isDirectory()) {
  console.error(`Project directory not found: ${projectRoot}`);
  process.exit(1);
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return { __error: error.message };
  }
}

function walk(directory, output = []) {
  if (output.length >= maxFiles) return output;

  let entries;
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch {
    return output;
  }

  for (const entry of entries) {
    if (output.length >= maxFiles) break;
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;

    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(absolutePath, output);
    } else if (entry.isFile()) {
      output.push(absolutePath);
    }
  }

  return output;
}

function detectPackages(definitions, installedPackages, projectFiles) {
  return definitions
    .filter(({ packages = [], files = [] }) =>
      packages.some((packageName) => installedPackages.has(packageName)) ||
      files.some((fileName) => projectFiles.has(fileName)),
    )
    .map(({ label }) => label);
}

function relative(filePath) {
  return path.relative(projectRoot, filePath).replaceAll("\\", "/");
}

const packageJsonPath = path.join(projectRoot, "package.json");
const packageJson = readJson(packageJsonPath);
const packageError = packageJson?.__error;
const packageData = packageJson && !packageError ? packageJson : {};
const dependencies = {
  ...(packageData.dependencies || {}),
  ...(packageData.devDependencies || {}),
  ...(packageData.peerDependencies || {}),
};
const installedPackages = new Set(Object.keys(dependencies));
const files = walk(projectRoot);
const relativeFiles = files.map(relative);
const projectFiles = new Set(relativeFiles);
const rootFileNames = new Set(
  fs.readdirSync(projectRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name),
);

const packageManagers = [
  ["pnpm", "pnpm-lock.yaml"],
  ["yarn", "yarn.lock"],
  ["npm", "package-lock.json"],
  ["bun", "bun.lock"],
  ["bun", "bun.lockb"],
].filter(([, lockfile]) => rootFileNames.has(lockfile));

const frameworks = detectPackages([
  { label: "Next.js", packages: ["next"] },
  { label: "React", packages: ["react", "react-dom"] },
  { label: "Vue", packages: ["vue"] },
  { label: "Nuxt", packages: ["nuxt"] },
  { label: "Svelte", packages: ["svelte"] },
  { label: "SvelteKit", packages: ["@sveltejs/kit"] },
  { label: "Angular", packages: ["@angular/core"] },
  { label: "Astro", packages: ["astro"] },
  { label: "Solid", packages: ["solid-js"] },
  { label: "Qwik", packages: ["@builder.io/qwik"] },
  { label: "Lit", packages: ["lit"] },
], installedPackages, projectFiles);

const buildTools = detectPackages([
  { label: "Vite", packages: ["vite"] },
  { label: "Webpack", packages: ["webpack"] },
  { label: "Rspack", packages: ["@rspack/core"] },
  { label: "Parcel", packages: ["parcel"] },
  { label: "esbuild", packages: ["esbuild"] },
], installedPackages, projectFiles);

const styling = detectPackages([
  { label: "Tailwind CSS", packages: ["tailwindcss", "@tailwindcss/vite"] },
  { label: "Sass/SCSS", packages: ["sass", "node-sass"] },
  { label: "Less", packages: ["less"] },
  { label: "styled-components", packages: ["styled-components"] },
  { label: "Emotion", packages: ["@emotion/react", "@emotion/styled"] },
  { label: "vanilla-extract", packages: ["@vanilla-extract/css"] },
  { label: "UnoCSS", packages: ["unocss"] },
  { label: "CSS Modules", files: relativeFiles.filter((file) => /\.module\.(css|scss|sass|less)$/i.test(file)) },
], installedPackages, projectFiles);

const componentSystems = detectPackages([
  { label: "shadcn/ui", files: ["components.json"] },
  { label: "Radix UI", packages: ["@radix-ui/react-dialog", "@radix-ui/react-slot", "radix-ui"] },
  { label: "Material UI", packages: ["@mui/material"] },
  { label: "Ant Design", packages: ["antd"] },
  { label: "Chakra UI", packages: ["@chakra-ui/react"] },
  { label: "Mantine", packages: ["@mantine/core"] },
  { label: "Headless UI", packages: ["@headlessui/react", "@headlessui/vue"] },
  { label: "React Aria", packages: ["react-aria", "react-aria-components"] },
  { label: "Bootstrap", packages: ["bootstrap", "react-bootstrap"] },
  { label: "Prime", packages: ["primereact", "primevue"] },
  { label: "Vuetify", packages: ["vuetify"] },
], installedPackages, projectFiles);

const capabilities = {
  forms: detectPackages([
    { label: "React Hook Form", packages: ["react-hook-form"] },
    { label: "Formik", packages: ["formik"] },
    { label: "Zod", packages: ["zod"] },
    { label: "Yup", packages: ["yup"] },
  ], installedPackages, projectFiles),
  icons: detectPackages([
    { label: "Lucide", packages: ["lucide-react", "lucide-vue-next", "lucide-svelte"] },
    { label: "Heroicons", packages: ["@heroicons/react", "@heroicons/vue"] },
    { label: "Font Awesome", packages: ["@fortawesome/fontawesome-svg-core"] },
    { label: "React Icons", packages: ["react-icons"] },
  ], installedPackages, projectFiles),
  testing: detectPackages([
    { label: "Vitest", packages: ["vitest"] },
    { label: "Jest", packages: ["jest"] },
    { label: "Testing Library", packages: ["@testing-library/react", "@testing-library/vue", "@testing-library/dom"] },
    { label: "Playwright", packages: ["@playwright/test", "playwright"] },
    { label: "Cypress", packages: ["cypress"] },
    { label: "Storybook", packages: ["storybook", "@storybook/react", "@storybook/vue3"] },
    { label: "axe", packages: ["axe-core", "jest-axe", "@axe-core/playwright"] },
  ], installedPackages, projectFiles),
  visualization: detectPackages([
    { label: "XYFlow", packages: ["@xyflow/react", "@xyflow/svelte"] },
    { label: "D3", packages: ["d3"] },
    { label: "Chart.js", packages: ["chart.js"] },
    { label: "ECharts", packages: ["echarts"] },
    { label: "Recharts", packages: ["recharts"] },
    { label: "Three.js", packages: ["three"] },
  ], installedPackages, projectFiles),
};

const languageCounts = {};
for (const file of relativeFiles) {
  const extension = path.extname(file).toLowerCase() || "[no extension]";
  languageCounts[extension] = (languageCounts[extension] || 0) + 1;
}

const styleFiles = files.filter((file) => /\.(css|scss|sass|less)$/i.test(file));
const tokens = new Set();
for (const file of styleFiles.slice(0, 80)) {
  try {
    if (fs.statSync(file).size > maxTextBytes) continue;
    const content = fs.readFileSync(file, "utf8");
    for (const match of content.matchAll(/--([a-zA-Z0-9_-]+)\s*:/g)) {
      tokens.add(`--${match[1]}`);
      if (tokens.size >= 100) break;
    }
  } catch {
    // Keep the inspector read-only and tolerant of inaccessible generated files.
  }
  if (tokens.size >= 100) break;
}

const sourceRoots = ["src", "app", "pages", "components", "lib", "public", "styles"]
  .filter((directory) => fs.existsSync(path.join(projectRoot, directory)));

const report = {
  projectRoot,
  manifest: packageError
    ? { path: "package.json", error: packageError }
    : fs.existsSync(packageJsonPath)
      ? {
          path: "package.json",
          name: packageData.name || null,
          scripts: packageData.scripts || {},
        }
      : null,
  packageManagers: packageManagers.map(([name, lockfile]) => ({ name, lockfile })),
  frameworks,
  buildTools,
  styling: styling.length ? styling : styleFiles.length ? ["Plain CSS or unclassified styles"] : [],
  componentSystems,
  capabilities,
  sourceRoots,
  designTokens: {
    discoveredCount: tokens.size,
    sample: [...tokens].slice(0, 30),
    styleFileCount: styleFiles.length,
  },
  languageExtensions: Object.fromEntries(
    Object.entries(languageCounts)
      .sort(([, left], [, right]) => right - left)
      .slice(0, 20),
  ),
  scan: {
    filesExamined: files.length,
    truncated: files.length >= maxFiles,
    ignoredDirectories: [...ignoredDirectories],
  },
  cautions: [
    ...(packageError ? ["package.json could not be parsed"] : []),
    ...(!fs.existsSync(packageJsonPath) ? ["No package.json found; inspect other manifests manually"] : []),
    ...(files.length >= maxFiles ? [`File scan stopped at ${maxFiles} files`] : []),
  ],
};

console.log(JSON.stringify(report, null, 2));
