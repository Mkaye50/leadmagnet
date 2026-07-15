---
description: Generate a conversion-optimized opt-in landing page (self-contained HTML) for a topic
argument-hint: <topic, e.g. "30-day content calendar for coaches">
---

# Landing Page Generator

Generate a conversion-optimized opt-in landing page for: **$ARGUMENTS**

## Brand & Audience (read FIRST)
Read **lead-magnet-system/reference/brand.md** and follow it strictly:
- Positioning is **Business Coach for Creatives + Event-Based Business Owners** —
  never "mindset coach." Use `{{HOST_TITLE}}` in the trust bar.
- Write to owners who already have clients/revenue but keep **hitting the same
  income ceiling** — never to beginners, hobbyists, or survival-mode readers.
- Use the income-ceiling language and avoid the banned words in brand.md.

## Design System
Read these before building anything:
- lead-magnet-system/reference/conversion-landing-sample.html

The reference file is the exact visual pattern to match.

---

## Pipeline:

### Step 1: Research the Topic
Use web search to research "$ARGUMENTS". Find:
- Core value proposition and what makes this topic compelling
- 3-5 specific pain points the audience faces
- Concrete outcomes/benefits to feature in copy
- Any relevant stats or social proof angles

### Step 2: Build the Landing Page
Create the landing page at [slug].html **in the repo root** (not nested in
any subfolder). Vercel's cleanUrls setting serves a root-level `[slug].html`
at the clean path `/[slug]` with no rewrite rule needed — this is what makes
every new lead magnet work immediately after deploy.

Requirements:
- Pure CSS with variables (no Tailwind CDN)
- DM Serif Display (titles/headings, single 400 weight) + Inter (body, nav, buttons), via Google Fonts
- Full light/dark theme support with localStorage persistence
- Accessible: contrast ratios, alt text, focus states

Important:
Do not hardcode webhook keys or segment IDs into this command.
Use placeholders so each lead magnet can route to the correct Flodesk segment at generation time.

Sections in order:
1. **Nav Bar** -- fixed, blur backdrop, logo + theme toggle
2. **Hero** -- trust bar (your photo + name + follower count), eyebrow "FREE DOWNLOAD", H1 headline, subhead, value pills, benefits list
3. **Form Card** -- name input, email input, optional qualifying dropdown, submit button, micro-trust icons (no spam, unsubscribe anytime, instant delivery)
4. **FAQ Section** -- 3-4 questions specific to the topic
5. **Final CTA Card** -- inverted card with heading + button
6. **Footer** -- copyright line

Form Integration:
- Endpoint: POST JSON to the same-origin `/api/subscribe` (the Vercel function
  in `api/subscribe.mjs`, which forwards the lead to the Flodesk API).
- Hidden fields: `lead_magnet` (the magnet's name) and `segment` (this magnet's
  Flodesk segment NAME from the pipeline's Segment field - the server resolves
  names to IDs - or empty "" to use the server's FLODESK_SEGMENT_ID default).
- JavaScript: validate fields, POST JSON with lead_magnet, segment, first_name,
  email, and the dropdown answer; check `res.ok` before showing the success state.
- On success, also open the guide's Notion content page in a new tab (reserve
  the tab with `window.open("", "_blank")` synchronously before the `await`,
  then set `guideTab.location` once the POST succeeds, so browsers don't
  block it as a popup). Add a visible "Open your guide now" fallback link in
  the success state pointing to the same URL, in case the popup was blocked.

### Step 3: Write Delivery Email
Write the plain text delivery email. Save to
my-lead-magnet-system/website/lead-magnets/[slug]-email.txt (this file is
never served publicly, so it can stay nested).

Structure:
- Subject line (short, specific to the topic)
- Hey {{contact.first_name}},
- Opening: 1-2 sentences about what they are getting
- Middle: why this content is valuable
- Closing: tell them to follow you for more content
- Sign off with your name
- PS: invite them to reply with questions

### Step 4: Deploy
1. git add [slug].html my-lead-magnet-system/website/lead-magnets/[slug]-email.txt
2. git commit -m "Add [title] lead magnet landing page"
3. git push

### Step 5: Summary
Output: page title, slug, files created, and the live URL (https://<vercel-domain>/[slug]).
Remind user to:
1. Set the Notion content page to "Publish to web" (Share menu in Notion) --
   without this, the auto-opened tab and the email link both hit a login wall
   instead of the guide.
2. Create a Flodesk segment named exactly like the segment value used in the form
3. Create a Flodesk workflow triggered by "subscriber joins segment" for that
   segment, with an email step using the delivery email from Step 3 -- the
   API can create the subscriber and add them to a segment, but sending the
   actual email is a Flodesk workflow you set up once per magnet.
