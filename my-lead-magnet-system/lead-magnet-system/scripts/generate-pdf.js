#!/usr/bin/env node
/**
 * generate-pdf.js
 *
 * Converts a lead-magnet HTML file into a print-ready PDF using Puppeteer.
 *
 * Usage:
 *   node lead-magnet-system/scripts/generate-pdf.js <input.html> [output.pdf]
 *   node lead-magnet-system/scripts/generate-pdf.js --all
 *
 * Examples:
 *   npm run pdf -- lead-magnet-system/output/seo-checklist.html
 *   npm run pdf:all
 *
 * --all converts every *.html file found in lead-magnet-system/output/ into a
 * matching PDF alongside it.
 */

import { readdir, mkdir, access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const OUTPUT_DIR = path.join(ROOT, "lead-magnet-system", "output");

/** Default PDF options tuned for letter-size marketing PDFs. */
const PDF_OPTIONS = {
  format: "Letter",
  printBackground: true,
  preferCSSPageSize: true,
  margin: { top: "0", right: "0", bottom: "0", left: "0" },
};

async function exists(p) {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function renderToPdf(browser, inputPath, outputPath) {
  const page = await browser.newPage();
  try {
    const url = pathToFileURL(path.resolve(inputPath)).href;
    await page.goto(url, { waitUntil: "networkidle0" });
    // Honor any @media print styles the template defines.
    await page.emulateMediaType("print");
    await page.pdf({ path: outputPath, ...PDF_OPTIONS });
    console.log(`✓ ${path.relative(ROOT, inputPath)} → ${path.relative(ROOT, outputPath)}`);
  } finally {
    await page.close();
  }
}

async function collectHtmlFiles(dir) {
  if (!(await exists(dir))) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".html"))
    .map((e) => path.join(dir, e.name));
}

async function main() {
  const args = process.argv.slice(2);
  const all = args.includes("--all");

  let jobs = [];

  if (all) {
    const files = await collectHtmlFiles(OUTPUT_DIR);
    if (files.length === 0) {
      console.error(`No .html files found in ${path.relative(ROOT, OUTPUT_DIR)}/`);
      process.exit(1);
    }
    jobs = files.map((input) => ({
      input,
      output: input.replace(/\.html$/i, ".pdf"),
    }));
  } else {
    const input = args[0];
    if (!input) {
      console.error("Usage: generate-pdf.js <input.html> [output.pdf]  |  --all");
      process.exit(1);
    }
    if (!(await exists(input))) {
      console.error(`Input file not found: ${input}`);
      process.exit(1);
    }
    const output = args[1] || input.replace(/\.html$/i, ".pdf");
    jobs = [{ input, output }];
  }

  // Ensure output directories exist.
  for (const job of jobs) {
    await mkdir(path.dirname(job.output), { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    for (const job of jobs) {
      await renderToPdf(browser, job.input, job.output);
    }
  } finally {
    await browser.close();
  }

  console.log(`\nDone. Generated ${jobs.length} PDF${jobs.length === 1 ? "" : "s"}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
