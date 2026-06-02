---
description: Build a responsive landing page that captures emails for a lead magnet
argument-hint: <slug or topic, e.g. "local-seo-checklist">
allowed-tools: Read, Write, Edit, Bash, Glob
---

# /landing-page

Build a high-converting, responsive landing page for the lead magnet:

> **$ARGUMENTS**

If `$ARGUMENTS` is empty, ask which lead magnet to build a page for (offer to
list the files in `lead-magnet-system/output/`).

## Process

1. **Locate the magnet.** If `$ARGUMENTS` matches a file in
   `lead-magnet-system/output/<slug>.html`, read it to reuse the title,
   subtitle, brand, color, and CTA so the page and PDF stay consistent. If no
   matching magnet exists, treat `$ARGUMENTS` as the topic and define the offer
   yourself.

2. **Study the reference design.** Read
   `lead-magnet-system/reference/landing-page-template.html`. Keep its
   structure: hero + cover mockup, email-capture form card, three benefit
   cards, and a footer CTA. Keep it responsive (the mobile breakpoint matters).

3. **Write conversion-focused copy.** A specific, benefit-led headline; a
   one-sentence subheadline naming the outcome; three concrete benefits (not
   features); a short privacy reassurance. Match `--brand` to the magnet.

4. **Wire the form.** Set `{{FORM_ACTION}}` to a placeholder ESP endpoint and
   leave a clear comment telling the user where to plug in ConvertKit /
   Mailchimp / Beehiiv / a serverless function. The download should be
   delivered after submit (note where the PDF lives).

5. **Write the page** to:
   `website/lead-magnets/<slug>/index.html`
   Copy the matching PDF (if it exists) to
   `website/lead-magnets/<slug>/downloads/<slug>.pdf` so the page is
   self-contained.

6. **Preview (optional):**
   ```bash
   npm run serve
   ```
   then open `http://localhost:4321/website/lead-magnets/<slug>/`.

7. **Report back** with the page path, the form action that needs wiring, and
   the public URL it should live at.

## Quality bar

- Above-the-fold must communicate the offer + value in under 5 seconds.
- One primary action only: capture the email.
- Mobile layout must not break (test the `@media (max-width: 760px)` rules).
- Replace every `{{TOKEN}}` — no placeholders left in shipped HTML.
