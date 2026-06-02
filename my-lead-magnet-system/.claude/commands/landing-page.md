---
description: Generate a landing page for one Lead Magnet Pipeline entry (from its Notion content)
argument-hint: <slug or lead-magnet name from the pipeline>
---

# /landing-page

Build a responsive email-capture landing page for a single lead magnet that
already exists in the **Lead Magnet Pipeline** Notion database.

> **$ARGUMENTS**

This is the standalone, single-entry version of the landing-page step that
`/execute-lead-magnets` runs in batch. Use it to (re)build one page.

## Pipeline database

- **Database ID:** `373f96051aee80ee9634ec39fb0e0038`
- **Database URL:** https://www.notion.so/373f96051aee80ee9634ec39fb0e0038
- **Fields:** `Name`, `Status`, `Format`, `Slug`, `Topic`, `Notion URL`

(The database ID above is a plain UUID, not a secret. The Notion integration
token is configured in MCP settings and must never be committed.)

## Process — follow in order

### Step 1: Find the pipeline entry
Query the Lead Magnet Pipeline database via the Notion MCP tools. Match
`$ARGUMENTS` against `Slug` first, then `Name`. If `$ARGUMENTS` is empty or no
match is found, list the available entries (Name + Slug + Status) and ask the
user which one to build.

### Step 2: Read the content page
Open the page referenced by the entry's **Notion URL** and read its full
content (title, subtitle, intro, sections, checklist, CTA). This copy is the
source of truth for the landing page — do not invent new claims.

### Step 3: Generate the landing page HTML
Read the reference design at
`lead-magnet-system/reference/landing-page-template.html` and keep its
structure (hero + cover mockup, email-capture form card, three benefit cards,
footer CTA) and its responsive `@media (max-width: 760px)` rules.

Fill every `{{TOKEN}}` with conversion-focused copy derived from the Notion
content:
- Headline + subheadline from the title/subtitle.
- Three concrete benefits (outcomes, not features) from the main sections.
- `{{TITLE}}`, `{{BADGE}}`, `{{COVER_DESCRIPTION}}` for the cover mockup.
- Keep the brand voice: honest, a little funny, plain grade-5 English.
- Leave NO `{{TOKEN}}` unresolved.

### Step 4: Wire delivery based on Format
Read the entry's **Format** field and set the form's delivery accordingly:
- **Notion** → after submit, deliver the public Notion page URL (the page is
  the asset). Set `{{FORM_ACTION}}` to your ESP endpoint and note that the
  success/thank-you step links to the Notion URL.
- **PDF** → deliver `downloads/<slug>.pdf` from this page's folder.
- **Both** → offer the Notion page as the primary read and the PDF as a
  downloadable copy.
Leave a clear HTML comment at `{{FORM_ACTION}}` telling the user where to plug
in ConvertKit / Mailchimp / Beehiiv / a serverless endpoint.

### Step 5: Write the files
Write the page to:
`website/lead-magnets/<slug>/index.html`

If Format is PDF or Both and a PDF exists at
`lead-magnet-system/output/<slug>.pdf`, copy it to
`website/lead-magnets/<slug>/downloads/<slug>.pdf` so the page is
self-contained. (If no PDF exists yet, note that `/execute-lead-magnets` will
generate it.)

### Step 6: Report back
Output: the slug, the page path, the public URL it should live at
(`/lead-magnets/<slug>/`), the Format used, and the `{{FORM_ACTION}}` that
still needs wiring.

## Notes
- This command does NOT change the pipeline `Status`; that's owned by
  `/execute-lead-magnets`. It only (re)builds the landing-page file.
- Preview locally with `npm run serve` →
  `http://localhost:4321/website/lead-magnets/<slug>/`.
