// Vercel serverless function: receives the landing-page form and creates the
// subscriber in Flodesk via the official API (https://developers.flodesk.com).
//
// Required env var (Vercel project settings):
//   FLODESK_API_KEY     - Flodesk personal API key (Flodesk > Settings > Integrations > API keys)
// Optional env var:
//   FLODESK_SEGMENT_ID  - default segment ID(s) or name(s), comma-separated,
//                         used when the form does not send its own "segment"
//
// The form may POST JSON: { first_name, email, lead_magnet, qualifier, segment, leak_result }
// "segment" (optional) accepts Flodesk segment IDs OR segment names (matched
// case-insensitively against your Flodesk segments), several separated by commas.
// Each landing page carries its own value, so every lead magnet can route to a
// different segment without touching this file.
//
// "leak_result" (optional, used by the Money Leak Calculator) is written to a
// Flodesk custom field labeled "Leak Result" so the delivery workflow can
// merge it into the email. The custom field must already exist in Flodesk
// (Audience -> a subscriber -> Segments and data -> Add custom field) -- the
// API can set a field's value but cannot create the field itself. Flodesk's
// custom_fields payload is keyed by the field's internal "key", not its
// display label, so this looks the key up via GET /custom-fields first. If
// the field doesn't exist yet or the lookup fails, this is a no-op: the
// subscriber still gets created normally, just without that value set.

const FLODESK_API = "https://api.flodesk.com/v1";

function isValidEmail(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// Turn a mix of segment IDs and segment names into IDs. Names are looked up
// against the account's segments; unknown names are logged and skipped.
async function resolveSegmentIds(raw, headers) {
  const wanted = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const ids = wanted.filter((s) => /^[0-9a-f]{24}$/i.test(s));
  const names = wanted.filter((s) => !/^[0-9a-f]{24}$/i.test(s));

  if (names.length > 0) {
    const res = await fetch(`${FLODESK_API}/segments?per_page=100`, { headers });
    if (res.ok) {
      const data = await res.json();
      const segments = data.data || data.segments || [];
      for (const name of names) {
        const match = segments.find(
          (s) => (s.name || "").trim().toLowerCase() === name.toLowerCase()
        );
        if (match) ids.push(match.id);
        else console.error(`Flodesk segment not found by name: "${name}"`);
      }
    } else {
      console.error("Flodesk segment list failed:", res.status);
    }
  }
  return ids;
}

// Custom fields are set by their internal "key", not the display label shown
// in the Flodesk UI. Look the key up by label (case-insensitive) via
// GET /custom-fields. Returns null if not found or the lookup fails.
async function resolveCustomFieldKey(label, headers) {
  const res = await fetch(`${FLODESK_API}/custom-fields?per_page=100`, { headers });
  if (!res.ok) {
    console.error("Flodesk custom-fields list failed:", res.status);
    return null;
  }
  const data = await res.json();
  const fields = data.data || data.custom_fields || [];
  const match = fields.find(
    (f) => (f.label || "").trim().toLowerCase() === label.toLowerCase()
  );
  if (!match) {
    console.error(`Flodesk custom field not found by label: "${label}"`);
    return null;
  }
  return match.key;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.FLODESK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "FLODESK_API_KEY is not configured" });
  }

  const body = req.body || {};
  const email = (body.email || "").trim();
  const firstName = (body.first_name || "").trim();
  const leakResult = String(body.leak_result || "").trim();

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "A valid email is required" });
  }

  const auth = "Basic " + Buffer.from(`${apiKey}:`).toString("base64");
  const headers = { Authorization: auth, "Content-Type": "application/json" };

  // Create or update the subscriber. custom_fields is best-effort: if the
  // "Leak Result" field's key can't be resolved, we just skip it rather than
  // block the signup.
  const subscriberBody = { email, first_name: firstName || undefined };
  if (leakResult) {
    const fieldKey = await resolveCustomFieldKey("Leak Result", headers);
    if (fieldKey) {
      subscriberBody.custom_fields = { [fieldKey]: leakResult };
    } else {
      console.error("Skipping leak_result: could not resolve 'Leak Result' custom field key");
    }
  }

  let subscriberRes = await fetch(`${FLODESK_API}/subscribers`, {
    method: "POST",
    headers,
    body: JSON.stringify(subscriberBody),
  });

  // If sending custom_fields caused the whole request to fail (unconfirmed
  // field format, field doesn't exist, etc.), retry without it so the actual
  // signup never breaks because of this best-effort extra.
  if (!subscriberRes.ok && subscriberBody.custom_fields) {
    const detail = await subscriberRes.text().catch(() => "");
    console.error("Flodesk subscriber create with custom_fields failed, retrying without:", subscriberRes.status, detail);
    subscriberRes = await fetch(`${FLODESK_API}/subscribers`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email, first_name: firstName || undefined }),
    });
  }

  if (!subscriberRes.ok) {
    const detail = await subscriberRes.text().catch(() => "");
    console.error("Flodesk subscriber create failed:", subscriberRes.status, detail);
    return res.status(502).json({ error: "Could not subscribe right now" });
  }

  // Add to segment(s): the form's value wins, else the env default.
  // Ignore unfilled "{{...}}" template placeholders.
  const rawSegments = String(body.segment || "").includes("{{")
    ? ""
    : String(body.segment || "");
  const segmentIds = await resolveSegmentIds(
    rawSegments || process.env.FLODESK_SEGMENT_ID || "",
    headers
  );

  if (segmentIds.length > 0) {
    const segmentRes = await fetch(
      `${FLODESK_API}/subscribers/${encodeURIComponent(email)}/segments`,
      { method: "POST", headers, body: JSON.stringify({ segment_ids: segmentIds }) }
    );
    if (!segmentRes.ok) {
      const detail = await segmentRes.text().catch(() => "");
      // Subscriber exists even if segmenting failed - report success but log it.
      console.error("Flodesk segment add failed:", segmentRes.status, detail);
    }
  }

  return res.status(200).json({ ok: true });
}
