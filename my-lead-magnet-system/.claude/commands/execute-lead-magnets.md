---
description: Batch-generate multiple lead magnets and their landing pages from a plan
argument-hint: <optional path to a plan file or a comma-separated list of topics>
allowed-tools: Read, Write, Edit, Bash, Glob
---

# /execute-lead-magnets

Run the full lead-magnet pipeline end to end for a batch of topics:

> **$ARGUMENTS**

This command orchestrates `/lead-magnet` and `/landing-page` across many topics
so you can ship a whole library in one pass.

## Input

Resolve the list of magnets to build, in this priority order:

1. If `$ARGUMENTS` is a path to a file (e.g. `lead-magnets.md` or a `.json` /
   `.csv`), read it and parse one entry per line/record. Each entry should
   carry at least a **topic**; optionally a **title**, **audience**, **brand**,
   and **CTA**.
2. If `$ARGUMENTS` is a comma-separated list of topics, use those.
3. If `$ARGUMENTS` is empty, look for a plan file at
   `lead-magnet-system/lead-magnets.md`. If none exists, ask the user for the
   list (or offer to create a starter plan file).

## Process — for each entry

1. Generate the PDF following the **/lead-magnet** instructions (write to
   `lead-magnet-system/output/<slug>.html`, then `npm run pdf -- ...`).
2. Generate the landing page following the **/landing-page** instructions
   (write to `website/lead-magnets/<slug>/index.html`, copy the PDF into its
   `downloads/` folder).
3. Keep branding, colors, and CTA consistent across the pair.

Work through entries one at a time so a single failure doesn't abort the batch;
record which succeeded and which failed.

## Finish

1. Build every PDF in one go as a final safety pass:
   ```bash
   npm run pdf:all
   ```
2. Write/refresh an index at `website/lead-magnets/index.html` linking to each
   landing page (simple list of cards is fine).
3. **Report a summary table**: for each magnet — title, slug, PDF path, landing
   page URL, and status (✓ / ✗ with the reason). Note any form actions that
   still need wiring and remind the user to `git commit` the results.

## Quality bar

- Don't reuse identical copy across magnets — each must be specific.
- Every shipped HTML file must have all `{{TOKENS}}` replaced.
- Verify each PDF and `index.html` actually exists before marking it ✓.
