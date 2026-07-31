#!/usr/bin/env node

import process from "node:process";

const [foregroundInput, backgroundInput, usageInput = "normal"] = process.argv.slice(2);
const thresholds = {
  normal: 4.5,
  large: 3,
  ui: 3,
};

function usage() {
  console.error(
    'Usage: node check-contrast.mjs <foreground> <background> [normal|large|ui]\n' +
    'Examples: "#111827" "#ffffff" normal | "rgb(17,24,39)" "#fff" ui',
  );
}

function parseColor(input) {
  if (!input) return null;
  const value = input.trim();

  const hexMatch = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    const hex = hexMatch[1].length === 3
      ? [...hexMatch[1]].map((character) => character + character).join("")
      : hexMatch[1];
    return [
      Number.parseInt(hex.slice(0, 2), 16),
      Number.parseInt(hex.slice(2, 4), 16),
      Number.parseInt(hex.slice(4, 6), 16),
    ];
  }

  const rgbMatch = value.match(
    /^rgb\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*\)$/i,
  );
  if (rgbMatch) {
    const channels = rgbMatch.slice(1).map(Number);
    if (channels.every((channel) => channel >= 0 && channel <= 255)) {
      return channels;
    }
  }

  return null;
}

function linearize(channel) {
  const value = channel / 255;
  return value <= 0.04045
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance([red, green, blue]) {
  return (
    0.2126 * linearize(red) +
    0.7152 * linearize(green) +
    0.0722 * linearize(blue)
  );
}

if (!foregroundInput || !backgroundInput || !(usageInput in thresholds)) {
  usage();
  process.exit(1);
}

const foreground = parseColor(foregroundInput);
const background = parseColor(backgroundInput);
if (!foreground || !background) {
  console.error("Colors must use #rgb, #rrggbb, or rgb(r,g,b) without alpha.");
  process.exit(1);
}

const foregroundLuminance = luminance(foreground);
const backgroundLuminance = luminance(background);
const ratio =
  (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
  (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
const threshold = thresholds[usageInput];
const passes = ratio >= threshold;

console.log(JSON.stringify({
  foreground: foregroundInput,
  background: backgroundInput,
  usage: usageInput,
  ratio: Number(ratio.toFixed(2)),
  requiredRatio: threshold,
  passes,
  note: "Rendered gradients, transparency, images, and dynamic states require browser inspection.",
}, null, 2));

process.exitCode = passes ? 0 : 2;
