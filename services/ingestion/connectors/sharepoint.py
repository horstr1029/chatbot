"""
SharePoint / OneDrive connector.
Auth: Azure AD app registration with Files.Read.All permission.
Sync: MS Graph delta queries + subscription webhooks.
"""
import os
import httpx

GRAPH_BASE = "https://graph.microsoft.com/v1.0"
SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".xlsx", ".pptx", ".txt"}


def _get_token() -> str:
    tenant_id = os.environ["AZURE_TENANT_ID"]
    client_id = os.environ["AZURE_CLIENT_ID"]
    client_secret = os.environ["AZURE_CLIENT_SECRET"]

    resp = httpx.post(
        f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token",
        data={
            "grant_type": "client_credentials",
            "client_id": client_id,
            "client_secret": client_secret,
            "scope": "https://graph.microsoft.com/.default",
        },
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


def list_delta_files(site_id: str, delta_link: str | None = None) -> tuple[list[dict], str]:
    """
    Returns (changed_files, next_delta_link).
    Pass delta_link=None for a full initial sync.
    """
    token = _get_token()
    headers = {"Authorization": f"Bearer {token}"}

    url = delta_link or f"{GRAPH_BASE}/sites/{site_id}/drive/root/delta"
    files = []
    next_delta = None

    with httpx.Client() as client:
        while url:
            resp = client.get(url, headers=headers)
            resp.raise_for_status()
            data = resp.json()

            for item in data.get("value", []):
                if "file" not in item:
                    continue
                name = item.get("name", "")
                ext = "." + name.rsplit(".", 1)[-1].lower() if "." in name else ""
                if ext in SUPPORTED_EXTENSIONS and not item.get("deleted"):
                    files.append(item)

            url = data.get("@odata.nextLink")
            next_delta = data.get("@odata.deltaLink", next_delta)

    return files, next_delta or ""


def download_file(site_id: str, item_id: str) -> bytes:
    token = _get_token()
    url = f"{GRAPH_BASE}/sites/{site_id}/drive/items/{item_id}/content"
    resp = httpx.get(url, headers={"Authorization": f"Bearer {token}"}, follow_redirects=True)
    resp.raise_for_status()
    return resp.content


def register_subscription(site_id: str, webhook_url: str, client_state: str) -> dict:
    token = _get_token()
    from datetime import datetime, timedelta, timezone

    expiry = (datetime.now(timezone.utc) + timedelta(days=2)).strftime("%Y-%m-%dT%H:%M:%SZ")
    payload = {
        "changeType": "created,updated,deleted",
        "notificationUrl": webhook_url,
        "resource": f"/sites/{site_id}/drive/root",
        "expirationDateTime": expiry,
        "clientState": client_state,
    }
    resp = httpx.post(
        f"{GRAPH_BASE}/subscriptions",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json=payload,
    )
    resp.raise_for_status()
    return resp.json()
