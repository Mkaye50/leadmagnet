---
description: Process approved Lead Magnet Pipeline entries into landing pages, emails, and PDFs
argument-hint: (no args — processes every pipeline entry with Status = Execute)
---

# /execute-lead-magnets

Process every approved entry in the **Lead Magnet Pipeline** Notion database
into its delivery assets: a landing page, a delivery email, and (when the
format calls for it) a PDF. Then mark each entry Complete.

> $ARGUMENTS

If `$ARGUMENTS` names a specific slug or lead-magnet name, process only that
entry (it must still be Status = Execute). Otherwise process all Execute
entries.

## Pipeline database

- **Database ID:** `373f96051aee80ee9634ec39fb0e0038`
- **Database URL:** https://www.notion.so/373f96051aee80ee9634ec39fb0e0038
- **Fields:** `Name`, `Status`, `Format`, `Slug`, `Topic`, `Notion URL`

(The database ID is a plain UUID, not a secret. The Notion integration token is
configured in MCP settings and must never be committed to this repo.)

## Process — follow in order

### Step 1: Query the pipeline
Query the Lead Magnet Pipeline database via the Notion MCP tools.

### Step 2: Find approved entries
Filter to entries where **Status = "Execute"**. If there are none, report that
and stop. List the entries you will process (Name, Slug, Format).

For each entry, run Steps 3–9 one at a time so a single failure doesn't abort
the batch. Track success/failure per entry.

### Step 3: Read the content page
Open the entry's **Notion URL** and read the full content page (title,
subtitle, intro, sections, checklist, CTA). This copy is the source of truth —
do not invent new claims.

### Step 4: Generate the landing page HTML
Using `lead-magnet-system/reference/landing-page-template.html` as the design
baseline (keep its structure and responsive rules), produce a landing page from
the Notion content. Fill every `{{TOKEN}}` — headline/subhead from the
title/subtitle, three benefit cards from the main sections, cover-mockup fields,
brand voice (honest, a little funny, plain grade-5 English). Leave no token
unresolved.

Write it to: `website/lead-magnets/<slug>/index.html`
(The live URL will be `/lead-magnets/<slug>/`.)

### Step 5: Generate the delivery email
Write the email a subscriber receives after opting in. Plain, warm, on-brand;
short subject line + preheader + body that hands over the asset and points to
the next step / `@itsmichalkaye`. Write it to:
`website/lead-magnets/<slug>/email.md`
(Include the subject line at the top as front matter or a bold first line.)

### Step 6: If Format = PDF — create a PDF
Render the Notion content into the print template
`lead-magnet-system/reference/lead-magnet-template.html` → write
`lead-magnet-system/output/<slug>.html`, then:
```bash
npm run pdf -- lead-magnet-system/output/<slug>.html
```
Copy the resulting `lead-magnet-system/output/<slug>.pdf` to
`website/lead-magnets/<slug>/downloads/<slug>.pdf`. The PDF is the delivery
asset; the landing page links to it.

### Step 7: If Format = Notion — use the Notion page
No PDF. The **Notion URL** (its public/shared version) is the delivery asset.
The landing page and email hand the subscriber the Notion link.

### Step 8: If Format = Both — Notion page + PDF
Do Step 6 (create the PDF) AND keep the Notion page as the primary read. The
landing page offers the Notion page to read online and the PDF to download; the
email links to both.

### Step 9: Update the pipeline entry
Write back to the entry in the pipeline database:
- **Landing page file:** `website/lead-magnets/<slug>/index.html`
- **Email file:** `website/lead-magnets/<slug>/email.md`
- **Live URL:** `/lead-magnets/<slug>/`
- **PDF URL:** `website/lead-magnets/<slug>/downloads/<slug>.pdf` (only if a PDF
  was created in Step 6/8; otherwise leave blank)
- **Status:** "Complete"

If the database has dedicated properties for these (e.g. Landing Page, Email,
Live URL, PDF URL), set them. If not, append the file paths/URLs to the entry's
content/notes and note that those properties don't exist yet.

## Finish

1. Safety pass — rebuild all PDFs:
   ```bash
   npm run pdf:all
   ```
2. Refresh `website/lead-magnets/index.html` with a card linking to every
   landing page.
3. Report a summary table: for each entry — Name, Slug, Format, landing-page
   URL, PDF URL (if any), and status (✓ Complete / ✗ with the reason). Flag any
   `{{FORM_ACTION}}` endpoints still needing wiring, and remind the user to
   `git commit` the generated files.

## Quality bar
- Every shipped HTML file must have all `{{TOKENS}}` replaced.
- Verify each `index.html` (and PDF, when applicable) actually exists before
  marking an entry ✓ Complete.
- Only flip Status to Complete after the assets are confirmed written.
