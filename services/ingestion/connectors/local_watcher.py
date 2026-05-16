"""
Local file watcher using watchdog.
Watches configured directories and enqueues SYNC_FILE / DELETE_FILE jobs
via the ingestion service HTTP API.
"""
import base64
import mimetypes
import os
import time
import httpx
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileSystemEvent

SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".pptx", ".xlsx", ".txt", ".md"}
INGESTION_URL = os.environ.get("INGESTION_SERVICE_URL", "http://localhost:8000")


class _IngestionHandler(FileSystemEventHandler):
    def __init__(self, dept_ids: list[str], source_id: str):
        self.dept_ids = dept_ids
        self.source_id = source_id

    def on_created(self, event: FileSystemEvent) -> None:
        if not event.is_directory:
            self._enqueue_sync(event.src_path)

    def on_modified(self, event: FileSystemEvent) -> None:
        if not event.is_directory:
            self._enqueue_sync(event.src_path)

    def on_deleted(self, event: FileSystemEvent) -> None:
        if not event.is_directory:
            self._enqueue_delete(event.src_path)

    def _enqueue_sync(self, path: str) -> None:
        ext = os.path.splitext(path)[1].lower()
        if ext not in SUPPORTED_EXTENSIONS:
            return

        try:
            with open(path, "rb") as f:
                file_bytes = base64.b64encode(f.read()).decode()

            mime_type = mimetypes.guess_type(path)[0] or "application/octet-stream"
            file_name = os.path.basename(path)

            httpx.post(
                f"{INGESTION_URL}/parse",
                json={
                    "file_bytes": file_bytes,
                    "file_name": file_name,
                    "mime_type": mime_type,
                    "dept_ids": self.dept_ids,
                    "source_id": self.source_id,
                    "source_name": file_name,
                    "source_url": None,
                },
                timeout=120,
            )
        except Exception as e:
            print(f"[local_watcher] failed to sync {path}: {e}")

    def _enqueue_delete(self, path: str) -> None:
        try:
            httpx.delete(f"{INGESTION_URL}/source/{self.source_id}", timeout=30)
        except Exception as e:
            print(f"[local_watcher] failed to delete {path}: {e}")


def watch_directory(path: str, dept_ids: list[str], source_id: str) -> None:
    """Blocks — run in a thread or separate process."""
    handler = _IngestionHandler(dept_ids=dept_ids, source_id=source_id)
    observer = Observer()
    observer.schedule(handler, path=path, recursive=True)
    observer.start()
    print(f"[local_watcher] watching {path}")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()
