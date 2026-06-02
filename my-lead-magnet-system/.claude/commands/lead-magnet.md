---
description: Generate a complete lead-magnet PDF (content + design) from a topic
argument-hint: <topic or angle, e.g. "SEO checklist for local restaurants">
allowed-tools: Read, Write, Edit, Bash, Glob
---

# /lead-magnet

Create a polished, ready-to-print lead-magnet PDF for the following topic:

> **$ARGUMENTS**

If `$ARGUMENTS` is empty, ask the user for the topic, target audience, and the
brand/website before doing anything else.

## Goal

A lead magnet is a valuable, skimmable free resource (guide, checklist,
playbook, template) offered in exchange for an email address. Your job is to
produce both the **copy** and a **designed HTML file** that converts cleanly to
PDF.

## Process

1. **Clarify the brief.** From the topic, determine:
   - Target audience and the single painful problem this solves.
   - The promise / outcome (what they'll be able to do after reading).
   - Brand name, website, and CTA (where you'll ask them to go next).
   - A short, benefit-driven title and subtitle.
   Make reasonable assumptions and state them — don't stall on missing details.

2. **Study the reference design.** Read
   `lead-magnet-system/reference/lead-magnet-template.html`. This is the visual
   baseline. Preserve its structure: cover page, intro page, a numbered "steps"
   page, and a checklist + CTA page. Keep the `@page`, `.page`, and `.cover`
   CSS intact so PDF output stays correct.

3. **Write genuinely useful content.** No filler. Each step should be concrete
   and actionable. The checklist should be a true "do this" list. Aim for
   tight, confident, plain language. Replace every `{{TOKEN}}` in the template
   with real copy (or remove sections you don't need).

4. **Pick a slug.** Kebab-case from the title, e.g. `local-seo-checklist`.

5. **Write the file** to:
   `lead-magnet-system/output/<slug>.html`
   (Create the `output/` directory if it doesn't exist.)

6. **Generate the PDF:**
   ```bash
   npm run pdf -- lead-magnet-system/output/<slug>.html
   ```
   This writes `lead-magnet-system/output/<slug>.pdf`.

7. **Report back** with: the title, the slug, the file paths created, the
   assumptions you made, and a one-line suggestion for the matching landing
   page (the user can run `/landing-page <slug>` next).

## Quality bar

- The cover must look like a designed product, not a wall of text.
- Tailor the color (`--brand`) to the brand if one is known.
- Content must be accurate and specific to the audience — avoid generic advice.
- Verify the PDF was created (check the file exists); if Puppeteer fails,
  surface the error and the fix (often `npm install`).
