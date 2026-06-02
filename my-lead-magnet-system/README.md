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
    reference/                     # Design baselines Claude copies from
      lead-magnet-template.html    #   print-optimized PDF template
      landing-page-template.html   #   responsive landing-page template
    scripts/
      generate-pdf.js              # HTML → PDF (Puppeteer)
      serve.js                     # zero-dep static preview server
    output/                        # Generated magnet HTML + PDFs
  website/
    lead-magnets/                  # Generated landing pages (one folder per magnet)
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
| `/lead-magnet <topic>` | Writes content + designed HTML and renders a PDF. |
| `/landing-page <slug>` | Builds a responsive email-capture page for a magnet. |
| `/execute-lead-magnets <plan>` | Runs the full pipeline across many topics. |

### Manual PDF / preview commands

```bash
npm run pdf -- lead-magnet-system/output/<slug>.html   # render one PDF
npm run pdf:all                                         # render every magnet
npm run serve                                           # preview landing pages
```

## How it fits together

1. **`/lead-magnet`** copies `reference/lead-magnet-template.html`, fills in
   real copy, writes `output/<slug>.html`, then runs `generate-pdf.js`.
2. **`/landing-page`** copies `reference/landing-page-template.html`, reuses the
   magnet's title/brand/CTA, and writes `website/lead-magnets/<slug>/index.html`
   (with the PDF dropped into its `downloads/` folder).
3. **`/execute-lead-magnets`** loops both steps over a plan and writes an index.

## Wiring up email capture

The landing-page form posts to a `{{FORM_ACTION}}` placeholder. Point it at your
email service provider (ConvertKit, Mailchimp, Beehiiv) or a serverless endpoint,
and deliver the PDF from the page's `downloads/` folder after submit.

## Notes

- Generated PDFs are git-ignored by default (see `.gitignore`) — commit the
  source HTML and regenerate, or un-ignore them if you'd rather track binaries.
- The shared `--brand` CSS variable keeps magnets and pages visually consistent;
  override it per brand.
