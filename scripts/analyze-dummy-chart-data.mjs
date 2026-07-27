import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  analyzeDummyChartData,
  assertCleanupPreservesChartStructure,
  createCleanChartCopy,
  extractCharts,
} from './lib/dummy-data-cleanup.mjs';

function usage() {
  return [
    'Usage:',
    '  node scripts/analyze-dummy-chart-data.mjs <input.json>',
    '  node scripts/analyze-dummy-chart-data.mjs <input.json> --write-clean-copy <output.json>',
    '',
    'The input file is never overwritten.',
  ].join('\n');
}

const args = process.argv.slice(2);
const inputArg = args[0];
const writeIndex = args.indexOf('--write-clean-copy');
const outputArg = writeIndex >= 0 ? args[writeIndex + 1] : null;

if (!inputArg || (writeIndex >= 0 && !outputArg)) {
  throw new Error(usage());
}

const inputPath = resolve(inputArg);
const outputPath = outputArg ? resolve(outputArg) : null;
if (outputPath && inputPath.toLowerCase() === outputPath.toLowerCase()) {
  throw new Error('Refusing to overwrite the input file.');
}

const payload = JSON.parse(await readFile(inputPath, 'utf8'));
const charts = extractCharts(payload);
const report = analyzeDummyChartData(charts);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

if (outputPath) {
  const cleanedCharts = createCleanChartCopy(charts);
  assertCleanupPreservesChartStructure(charts, cleanedCharts);

  let output;
  if (Array.isArray(payload)) {
    output = cleanedCharts;
  } else if (Array.isArray(payload.charts)) {
    output = { ...payload, charts: cleanedCharts };
  } else {
    output = cleanedCharts[0];
  }

  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, {
    flag: 'wx',
  });
  process.stderr.write(`Clean copy written to ${outputPath}\n`);
}
