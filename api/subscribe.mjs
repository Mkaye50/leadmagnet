// Vercel serverless function: receives the landing-page form and creates the
// subscriber in Flodesk via the official API (https://developers.flodesk.com).
//
// Required env var (Vercel project settings):
//   FLODESK_API_KEY     - Flodesk personal API key (Flodesk > Settings > Integrations > API keys)
// Optional env var:
//   FLODESK_SEGMENT_ID  - default segment ID(s), comma-separated, used when the
//                         form does not send its own "segment" value
//
// The form may POST JSON: { first_name, email, lead_magnet, qualifier, segment }
// "segment" (optional) is a Flodesk segment ID, or several separated by commas.

const FLODESK_API = "https://api.flodesk.com/v1";

function isValidEmail(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "A valid email is required" });
  }

  const auth = "Basic " + Buffer.from(`${apiKey}:`).toString("base64");
  const headers = { Authorization: auth, "Content-Type": "application/json" };

  // Create or update the subscriber.
  const subscriberRes = await fetch(`${FLODESK_API}/subscribers`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, first_name: firstName || undefined }),
  });

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
  const segmentIds = (rawSegments || process.env.FLODESK_SEGMENT_ID || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

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
