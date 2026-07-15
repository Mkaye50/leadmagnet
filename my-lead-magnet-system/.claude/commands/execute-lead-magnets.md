---
description: Process Notion pipeline items with Status = Execute into landing pages, emails, and PDFs
argument-hint: (no args — processes every pipeline item with Status = Execute)
---

# Execute Lead Magnets from Notion

Query the Notion Lead Magnet Pipeline database for items with status "Execute", then build the marketing assets for each one.

## Brand & Audience (read FIRST)
Read **lead-magnet-system/reference/brand.md** and follow it strictly when
writing every landing page and email:
- Positioning is **Business Coach for Creatives + Event-Based Business Owners** —
  never "mindset coach." Use `{{HOST_TITLE}}` in the trust bar.
- Write to owners who already have clients/revenue but keep **hitting the same
  income ceiling** — never to beginners, hobbyists, or survival-mode readers.
- Use the income-ceiling language and avoid the banned words in brand.md.

## Design System
Read these before building anything:
- lead-magnet-system/reference/conversion-landing-sample.html

## Notion Database Info
- **Data Source ID:** `373f96051aee80ee9634ec39fb0e0038`
- **Database URL:** https://www.notion.so/373f96051aee80ee9634ec39fb0e0038
- **Fields:** `Title ` (NOTE: the property name ends with a trailing space), Status, Format, Slug, Topic, `Notion` (URL property), Landing URL, Segment

(The Data Source ID is a plain database UUID, not a secret. The Notion
integration token is configured in MCP settings and must never be committed.)

---

## Pipeline:

### Step 1: Query Notion for "Execute" Items
Fetch the pipeline database and find all entries where Status = "Execute".

For each item, extract:
- `Title ` (trailing space in the property name), Topic, Slug, Format, `Notion` (URL), Segment, Page ID

When building the landing page, put the Segment value into the form's hidden
`segment` field (it is a Flodesk segment name; the /api/subscribe function
resolves it to the segment ID). If Segment is empty, use "" so the server
falls back to the FLODESK_SEGMENT_ID default.

If no items have status "Execute", inform the user and stop.

### Step 2: Update Status to "In Progress"
For each item, immediately update its status to "In Progress".

### Step 3: Build Assets Based on Format

Landing pages go at **[slug].html in the repo root** (not nested in any
subfolder) — Vercel's cleanUrls setting serves a root-level `[slug].html`
at the clean path `/[slug]` with no rewrite rule needed. Delivery emails
and PDF-source HTML are never served publicly, so they stay nested under
my-lead-magnet-system/website/lead-magnets/.

On a successful form submit, the page also opens the deliverable (the
Notion page, or the PDF for Format = PDF/Both) in a new tab: reserve the
tab with `window.open("", "_blank")` synchronously before the `await` on
the fetch, then set `guideTab.location` once the POST succeeds, so browsers
don't block it as a popup. Add a visible "Open your guide now" fallback
link in the success state pointing to the same URL.

#### Format = "Notion" (default)
The deliverable is the Notion page. Build marketing assets only:
1. Research the topic (for landing page copy)
2. Build the landing page at [slug].html (repo root)
3. Write the delivery email at my-lead-magnet-system/website/lead-magnets/[slug]-email.txt
   - Include the Notion URL as the deliverable link

#### Format = "PDF"
The deliverable is a downloadable PDF:
1. Read content from the linked Notion page
2. Research the topic (for landing page copy)
3. Build a PDF-formatted HTML at my-lead-magnet-system/website/lead-magnets/[slug]-pdf.html
4. Build the landing page at [slug].html (repo root)
5. Generate the PDF via Puppeteer
   (`npm run pdf -- my-lead-magnet-system/website/lead-magnets/[slug]-pdf.html` →
   writes my-lead-magnet-system/website/lead-magnets/[slug]-pdf.pdf)
6. Write the delivery email referencing the attached PDF

#### Format = "Both"
Follow the PDF pipeline, but the email references both the PDF and the Notion page link.

### Step 4: Update Notion
Set Status to "Complete" for each processed item.

### Step 5: Deploy
Stage all new files, commit, and push to deploy.

### Step 6: Summary
For each item: title, format, files created, and the live URL
(https://<vercel-domain>/[slug]). Remind user to:
1. Set the Notion content page to "Publish to web" (Share menu in Notion) --
   without this, the auto-opened tab and the email link both hit a login wall
   instead of the guide. Not needed for Format = PDF, since the PDF file
   itself is what opens.
2. Create a Flodesk segment named exactly like the pipeline's Segment value
3. Create a Flodesk workflow triggered by "subscriber joins segment" for that
   segment, with an email step using the delivery email from Step 3 -- the
   API can create the subscriber and add them to a segment, but sending the
   actual email is a Flodesk workflow you set up once per magnet.
