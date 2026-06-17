#!/usr/bin/env python3
"""Sync Instagram saved posts into a Notion database.

Reads credentials and settings from config.json (same directory), pulls the
authenticated user's saved posts from Instagram's private web API (mimicking the
desktop web client), de-duplicates against state.json, and creates one Notion
page per new saved post.

Run:  python sync.py
"""

from __future__ import annotations

import json
import logging
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

try:
    from notion_client import Client as NotionClient
    from notion_client.errors import APIResponseError
except ImportError:  # pragma: no cover - dependency guard
    print("Missing dependency 'notion-client'. Run: pip install -r requirements.txt")
    sys.exit(1)


# --------------------------------------------------------------------------- #
# Paths & constants
# --------------------------------------------------------------------------- #

HERE = Path(__file__).resolve().parent
CONFIG_PATH = HERE / "config.json"
STATE_PATH = HERE / "state.json"
LOG_PATH = HERE / "sync.log"

IG_BASE = "https://www.instagram.com"
IG_APP_ID = "936619743392459"
DESKTOP_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

# Instagram media_type values
MEDIA_TYPE_PHOTO = 1
MEDIA_TYPE_VIDEO = 2
MEDIA_TYPE_CAROUSEL = 8

CAPTION_MAX = 1900
PAGE_COUNT = 50
PAGE_SLEEP_SECONDS = 1.0

REQUIRED_CONFIG_KEYS = (
    "ig_session_id",
    "ig_csrftoken",
    "ig_user_id",
    "notion_token",
    "notion_database_id",
)

log = logging.getLogger("ig_saves_sync")


# --------------------------------------------------------------------------- #
# Setup helpers
# --------------------------------------------------------------------------- #

def setup_logging() -> None:
    """Log to both stdout and sync.log in this directory."""
    log.setLevel(logging.INFO)
    log.handlers.clear()
    fmt = logging.Formatter("%(asctime)s %(levelname)s %(message)s")

    stream = logging.StreamHandler(sys.stdout)
    stream.setFormatter(fmt)
    log.addHandler(stream)

    file_handler = logging.FileHandler(LOG_PATH, encoding="utf-8")
    file_handler.setFormatter(fmt)
    log.addHandler(file_handler)


def load_config() -> dict:
    if not CONFIG_PATH.exists():
        log.error("config.json not found. Copy config.example.json to config.json and fill it in.")
        sys.exit(1)
    try:
        config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        log.error("config.json is not valid JSON: %s", exc)
        sys.exit(1)

    missing = [k for k in REQUIRED_CONFIG_KEYS if not config.get(k)]
    if missing:
        log.error("config.json is missing required keys: %s", ", ".join(missing))
        sys.exit(1)
    return config


def load_state() -> set[str]:
    """Return the set of already-synced media IDs from state.json."""
    if not STATE_PATH.exists():
        return set()
    try:
        data = json.loads(STATE_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as exc:
        log.warning("Could not read state.json (%s); starting with empty state.", exc)
        return set()
    if isinstance(data, dict):  # tolerate {"synced_ids": [...]}
        data = data.get("synced_ids", [])
    return {str(x) for x in data}


def save_state(synced_ids: set[str]) -> None:
    """Persist synced IDs (sorted for stable diffs)."""
    payload = {"synced_ids": sorted(synced_ids)}
    STATE_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")


# --------------------------------------------------------------------------- #
# Instagram client
# --------------------------------------------------------------------------- #

class InstagramClient:
    """Thin wrapper over Instagram's private web API using web-session cookies."""

    def __init__(self, session_id: str, csrftoken: str, user_id: str) -> None:
        self.csrftoken = csrftoken
        self.session = requests.Session()
        self.session.headers.update(
            {
                "User-Agent": DESKTOP_UA,
                "X-IG-App-ID": IG_APP_ID,
                "X-CSRFToken": csrftoken,
                "X-Requested-With": "XMLHttpRequest",
                "Referer": f"{IG_BASE}/",
                "Accept": "*/*",
                "Accept-Language": "en-US,en;q=0.9",
            }
        )
        self.session.cookies.set("sessionid", session_id, domain=".instagram.com")
        self.session.cookies.set("csrftoken", csrftoken, domain=".instagram.com")
        self.session.cookies.set("ds_user_id", user_id, domain=".instagram.com")

    def _get(self, path: str, params: dict | None = None) -> requests.Response:
        return self.session.get(f"{IG_BASE}{path}", params=params, timeout=30)

    def validate_session(self) -> None:
        """Confirm cookies are still valid; exit immediately if not."""
        try:
            resp = self._get("/api/v1/accounts/edit/web_form_data/")
        except requests.RequestException as exc:
            log.error("Network error while validating Instagram session: %s", exc)
            sys.exit(1)

        if resp.status_code in (401, 403):
            log.error(
                "Instagram session is invalid or expired (HTTP %s). "
                "Refresh ig_session_id / ig_csrftoken / ig_user_id in config.json.",
                resp.status_code,
            )
            sys.exit(1)

        # A logged-out request often returns a redirect to /accounts/login or HTML.
        ctype = resp.headers.get("Content-Type", "")
        if resp.status_code != 200 or "application/json" not in ctype:
            log.error(
                "Instagram session check did not return JSON (HTTP %s, %s). "
                "Refresh your Instagram cookies in config.json.",
                resp.status_code,
                ctype or "no content-type",
            )
            sys.exit(1)
        log.info("Instagram session validated.")

    def fetch_collections(self) -> list[dict]:
        """Return the list of saved collections (id + name)."""
        collection_types = ["ALL_MEDIA_AUTO_COLLECTION", "PRODUCT_AUTO_COLLECTION", "MEDIA"]
        try:
            resp = self._get(
                "/api/v1/collections/list/",
                params={"collection_types": json.dumps(collection_types)},
            )
            resp.raise_for_status()
            data = resp.json()
        except (requests.RequestException, ValueError) as exc:
            log.warning("Could not fetch collections list: %s", exc)
            return []
        return data.get("items", [])

    def _paginate(self, path: str, base_params: dict) -> list[dict]:
        """Fetch all media items from a paginated saved/collection feed."""
        items: list[dict] = []
        next_max_id: str | None = None
        page = 0
        while True:
            page += 1
            params = dict(base_params)
            if next_max_id:
                params["max_id"] = next_max_id
            try:
                resp = self._get(path, params=params)
                resp.raise_for_status()
                data = resp.json()
            except (requests.RequestException, ValueError) as exc:
                log.warning("Failed fetching page %s of %s: %s", page, path, exc)
                break

            items.extend(data.get("items", []))
            next_max_id = data.get("next_max_id")
            more = data.get("more_available", False)
            if not more or not next_max_id:
                break
            time.sleep(PAGE_SLEEP_SECONDS)
        return items

    def fetch_saved_posts(self) -> list[dict]:
        """All saved posts from the default 'All Posts' saved feed."""
        return self._paginate("/api/v1/feed/saved/posts/", {"count": PAGE_COUNT})

    def fetch_collection_posts(self, collection_id: str) -> list[dict]:
        """All saved posts within a specific collection."""
        return self._paginate(
            f"/api/v1/feed/collection/{collection_id}/posts/", {"count": PAGE_COUNT}
        )


# --------------------------------------------------------------------------- #
# Media parsing
# --------------------------------------------------------------------------- #

def unwrap_media(item: dict) -> dict:
    """Saved/collection feed items wrap the media under a 'media' key."""
    return item.get("media", item)


def classify_type(media: dict) -> str:
    """Map media_type / product_type to a Notion select value."""
    media_type = media.get("media_type")
    product_type = (media.get("product_type") or "").lower()

    if media_type == MEDIA_TYPE_CAROUSEL:
        return "Carousel"
    if product_type == "clips":
        return "Reel"
    if product_type == "igtv":
        return "IGTV"
    return "Post"


def build_url(code: str, post_type: str) -> str:
    if post_type == "Reel":
        return f"https://instagram.com/reel/{code}/"
    return f"https://instagram.com/p/{code}/"


def extract_caption(media: dict) -> str:
    caption = media.get("caption")
    text = caption.get("text", "") if isinstance(caption, dict) else (caption or "")
    return text[:CAPTION_MAX]


def extract_author(media: dict) -> str:
    user = media.get("user") or {}
    return user.get("username", "unknown")


# --------------------------------------------------------------------------- #
# Notion writer
# --------------------------------------------------------------------------- #

class NotionWriter:
    def __init__(self, token: str, database_id: str) -> None:
        self.client = NotionClient(auth=token)
        self.database_id = database_id

    def create_post_page(self, media: dict, collection_name: str | None) -> None:
        pk = str(media.get("pk") or media.get("id") or "")
        code = media.get("code", "")
        author = extract_author(media)
        post_type = classify_type(media)
        url = build_url(code, post_type)
        caption = extract_caption(media)
        now_iso = datetime.now(timezone.utc).isoformat()

        properties: dict = {
            "Name": {"title": [{"text": {"content": f"@{author}/{code}"}}]},
            "URL": {"url": url},
            "Type": {"select": {"name": post_type}},
            "Author": {"rich_text": [{"text": {"content": author}}]},
            "Status": {"select": {"name": "New"}},
            "Media ID": {"rich_text": [{"text": {"content": pk}}]},
            "Saved": {"date": {"start": now_iso}},
            "Caption": {"rich_text": [{"text": {"content": caption}}]},
        }
        if collection_name:
            properties["Collection"] = {"select": {"name": collection_name}}

        self.client.pages.create(
            parent={"database_id": self.database_id}, properties=properties
        )


# --------------------------------------------------------------------------- #
# Sync orchestration
# --------------------------------------------------------------------------- #

def gather_posts(ig: InstagramClient, collections_filter: list[str]) -> list[tuple[dict, str | None]]:
    """Return (media, collection_name) pairs to consider for syncing.

    When a collections_filter is set we fetch each named collection's posts so
    every post can be tagged with its collection name. Otherwise we fetch the
    default saved feed and leave Collection unset.
    """
    if not collections_filter:
        posts = ig.fetch_saved_posts()
        log.info("Fetched %s saved post(s) from the default saved feed.", len(posts))
        return [(unwrap_media(item), None) for item in posts]

    collections = ig.fetch_collections()
    by_name = {c.get("collection_name", "").lower(): c for c in collections}

    pairs: list[tuple[dict, str | None]] = []
    for name in collections_filter:
        match = by_name.get(name.lower())
        if not match:
            log.warning("Collection %r not found in your Instagram collections; skipping.", name)
            continue
        collection_id = match.get("collection_id")
        canonical_name = match.get("collection_name", name)
        items = ig.fetch_collection_posts(str(collection_id))
        log.info("Fetched %s post(s) from collection %r.", len(items), canonical_name)
        pairs.extend((unwrap_media(item), canonical_name) for item in items)
    return pairs


def run() -> int:
    setup_logging()
    log.info("Starting Instagram saves sync.")

    config = load_config()
    collections_filter = config.get("collections_filter") or []

    ig = InstagramClient(
        config["ig_session_id"], config["ig_csrftoken"], config["ig_user_id"]
    )
    ig.validate_session()

    notion = NotionWriter(config["notion_token"], config["notion_database_id"])

    synced_ids = load_state()
    pairs = gather_posts(ig, collections_filter)

    new = skipped = errors = 0
    total = len(pairs)

    for media, collection_name in pairs:
        pk = str(media.get("pk") or media.get("id") or "")
        if not pk:
            log.warning("Encountered a post with no media id; skipping.")
            skipped += 1
            continue

        if pk in synced_ids:
            skipped += 1
            continue

        try:
            notion.create_post_page(media, collection_name)
        except Exception as exc:  # keep the run alive on any per-post failure
            errors += 1
            detail = exc.body if isinstance(exc, APIResponseError) else exc
            log.error("Failed to write post %s to Notion: %s", pk, detail)
            continue  # do NOT record in state so it retries next run

        synced_ids.add(pk)
        save_state(synced_ids)  # persist after each successful write
        new += 1
        log.info("Added post %s (@%s) to Notion.", pk, extract_author(media))

    log.info(
        "Sync complete: %s new | %s skipped | %s total | %s errors",
        new, skipped, total, errors,
    )
    return 0


if __name__ == "__main__":
    try:
        sys.exit(run())
    except KeyboardInterrupt:
        log.warning("Interrupted by user.")
        sys.exit(130)
