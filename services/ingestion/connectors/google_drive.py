"""
Google Drive connector.
Auth: OAuth2 service account with domain-wide delegation.
Sync: Drive API files.watch push notifications.
"""
import base64
import json
import os
from typing import Generator

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.oauth2 import service_account

SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]
SUPPORTED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.google-apps.document",
    "application/vnd.google-apps.spreadsheet",
    "text/plain",
}
EXPORT_MAP = {
    "application/vnd.google-apps.document": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.google-apps.spreadsheet": "text/plain",
}


def _service():
    creds_json = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON")
    if not creds_json:
        raise RuntimeError("GOOGLE_SERVICE_ACCOUNT_JSON env var not set")
    info = json.loads(creds_json)
    creds = service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
    return build("drive", "v3", credentials=creds, cache_discovery=False)


def list_files(folder_id: str) -> list[dict]:
    svc = _service()
    files = []
    page_token = None

    while True:
        resp = (
            svc.files()
            .list(
                q=f"'{folder_id}' in parents and trashed=false",
                fields="nextPageToken, files(id, name, mimeType, modifiedTime, webViewLink)",
                pageToken=page_token,
            )
            .execute()
        )
        files.extend(resp.get("files", []))
        page_token = resp.get("nextPageToken")
        if not page_token:
            break

    return [f for f in files if f["mimeType"] in SUPPORTED_MIME_TYPES]


def download_file(file_id: str, mime_type: str) -> tuple[bytes, str]:
    """Returns (file_bytes, effective_mime_type)."""
    svc = _service()

    export_mime = EXPORT_MAP.get(mime_type)
    if export_mime:
        data = svc.files().export(fileId=file_id, mimeType=export_mime).execute()
        return data, export_mime

    import io
    from googleapiclient.http import MediaIoBaseDownload

    fh = io.BytesIO()
    request = svc.files().get_media(fileId=file_id)
    downloader = MediaIoBaseDownload(fh, request)
    done = False
    while not done:
        _, done = downloader.next_chunk()
    return fh.getvalue(), mime_type


def register_push_webhook(folder_id: str, webhook_url: str, channel_id: str) -> dict:
    svc = _service()
    body = {
        "id": channel_id,
        "type": "web_hook",
        "address": webhook_url,
    }
    return svc.files().watch(fileId=folder_id, body=body).execute()
