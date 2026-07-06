# My Lead Magnet System

A Claude Code–driven system for producing **lead magnets** (free PDF resources
offered in exchange for an email) and the **landing pages** that capture those
emails — fast and consistently on-brand.

You describe a topic; Claude writes the content, designs it from a shared
reference, renders a print-ready PDF, and builds a matching responsive landing
page.

## Structure

```
my-lead-magnet-system/
  .claude/
    commands/                      # Slash commands
      lead-magnet.md               # /lead-magnet  → generate a PDF magnet
      landing-page.md              # /landing-page → generate a capture page
      execute-lead-magnets.md      # /execute-lead-magnets → batch the whole pipeline
  lead-magnet-system/
    reference/                        # Design baselines Claude copies from
      conversion-landing-sample.html  #   ★ active landing-page pattern (light/dark, Flodesk)
      lead-magnet-template.html       #   print-optimized PDF baseline
      landing-page-template.html      #   older generic landing-page template (legacy)
    scripts/
      generate-pdf.js                 # HTML → PDF (Puppeteer)
      serve.js                        # zero-dep static preview server
    output/                           # Generated PDF-source HTML + PDFs
  website/
    lead-magnets/                     # Generated landing pages: [slug].html + [slug]-email.txt
  package.json
```

## Setup

```bash
cd my-lead-magnet-system
npm install        # installs Puppeteer (downloads a headless Chromium)
```

## Usage

Run these as slash commands inside Claude Code from the `my-lead-magnet-system/`
directory:

| Command | What it does |
| --- | --- |
| `/lead-magnet <topic>` | Researches the topic, writes the content as a **Notion page**, and adds a **Lead Magnet Pipeline** DB entry (Status = Draft). No HTML/PDF yet. |
| `/landing-page <topic>` | Builds a self-contained conversion landing page (`[slug].html`) + delivery email (`[slug]-email.txt`) from the design sample. |
| `/execute-lead-magnets` | Processes pipeline entries with Status = **Execute** → builds landing page + email (+ PDF when Format = PDF/Both) → sets Status = Complete. |

The workflow: `/lead-magnet` → review/edit the Notion page → set **Format**
(Notion / PDF / Both) and flip **Status** to `Execute` → `/execute-lead-magnets`.

### Manual PDF / preview commands

```bash
npm run pdf -- lead-magnet-system/output/<slug>.html   # render one PDF
npm run pdf:all                                         # render every magnet
npm run serve                                           # preview landing pages
```

## How it fits together

1. **`/lead-magnet`** researches the topic and creates a Notion content page +
   a Lead Magnet Pipeline DB entry (Status = Draft, Format = Notion).
2. You review/edit the Notion page, choose **Format**, and set **Status =
   Execute** when it's ready to ship.
3. **`/execute-lead-magnets`** reads every `Execute` entry, builds the landing
   page (`[slug].html`, in the repo root so Vercel's cleanUrls serves it at
   `/[slug]` with no rewrite needed) and delivery email (`[slug]-email.txt`)
   from `reference/conversion-landing-sample.html`, generates a PDF when
   Format is PDF/Both, and sets Status = Complete.
4. **`/landing-page`** is the standalone version of the page-build step for
   one-off pages straight from a topic.

The Notion pipeline DB is `373f96051aee80ee9634ec39fb0e0038` (a plain database
ID, not a secret). The Notion integration token lives in your MCP settings and
is never committed.

## Wiring up email capture

Each landing page posts JSON to the same-origin `/api/subscribe` (a Vercel
serverless function, `api/subscribe.mjs` at the repo root) with the
lead-magnet name, a Flodesk segment name, first name, email, and the
qualifying dropdown answer. The function looks up the segment by name via
the Flodesk API and adds the subscriber to it — no webhook key or segment ID
is ever hardcoded into a page.

Requires one Vercel environment variable: `FLODESK_API_KEY` (from Flodesk >
Settings > Integrations > API keys). Optionally set `FLODESK_SEGMENT_ID` as a
fallback segment for pages that don't specify one.

## Notes

- Generated PDFs are git-ignored by default (see `.gitignore`) — commit the
  source HTML and regenerate, or un-ignore them if you'd rather track binaries.
- Theme is light/dark via CSS variables + `data-theme`, persisted in
  `localStorage`. Fonts: Cormorant Garamond (titles), Manrope (body), DM Sans
  (nav/buttons).
