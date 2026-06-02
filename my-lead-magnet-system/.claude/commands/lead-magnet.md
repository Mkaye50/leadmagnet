---
description: Research a topic and create a lead-magnet content page in Notion + a pipeline entry
argument-hint: <topic, e.g. "email list growth for coaches">
---

# Lead Magnet Generator

Research and create a lead magnet for the topic: **$ARGUMENTS**

This command creates the lead magnet content as a Notion page and enters it into the pipeline. It does NOT generate any HTML files, PDFs, or emails. Those are built later by /execute-lead-magnets after you review and approve.

---

## Pipeline -- Follow these steps in order:

### Step 1: Research the Topic
Use web search to deeply research "$ARGUMENTS". Find:
- 5-7 key insights, stats, or actionable tips
- Common pain points the audience faces
- What makes this topic valuable/urgent right now
- Any relevant data points or case studies

Compile your research into a structured outline with a compelling title and subtitle.

### Step 2: Write the Lead Magnet Content
Based on your research, write the full lead magnet as structured content:

- **Title** -- clear, benefit-driven
- **Subtitle** -- one line expanding on the title
- **Introduction** -- why this matters (1-2 paragraphs)
- **Main content** -- 5-7 sections, each with:
  - Section heading
  - Actionable insight or step
  - Specific examples, stats, or how-to details
- **Summary/Checklist** -- quick reference takeaways
- **CTA** -- next steps + follow @itsmichalkaye on social

Write in YOUR BRAND VOICE: Honest. Funny. Professional but never stiff. Language is simple, grade-5 English.

### Step 3: Create the Notion Content Page
Create a separate Notion page (NOT inside the pipeline database) with the full lead magnet content from Step 2. This page IS the deliverable that subscribers will receive access to.

Use rich Notion formatting:
- Headings for sections
- Bulleted/numbered lists for steps
- Callout blocks for key takeaways
- Dividers between major sections

### Step 4: Create the Pipeline Entry
Add an entry in the Lead Magnet Pipeline Notion database:
- **Data Source ID:** `<YOUR_NOTION_PIPELINE_DATA_SOURCE_ID>`
  (the database/data-source ID — a UUID like `1a2b3c4d-5e6f-...`, NOT a Notion
  API token. The Notion integration token is configured in your MCP server
  settings and must never be committed to this repo.)

Set these properties:
- **Name** -- the lead magnet title
- **Status** -- "Draft"
- **Format** -- "Notion"
- **Slug** -- URL-friendly slug generated from the title
- **Topic** -- "$ARGUMENTS"
- **Notion URL** -- link to the content page created in Step 3

### Step 5: Summary
Output a summary with:
- Lead magnet title and slug
- Link to the Notion content page
- Link to the pipeline entry
- Remind user to:
  1. Review and edit the content page in Notion
  2. Set Format to "Notion", "PDF", or "Both"
  3. Change Status to "Execute" when ready
  4. Run /execute-lead-magnets to generate the landing page and email
