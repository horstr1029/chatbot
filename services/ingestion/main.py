import base64
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from chunker import chunk_text, split_into_chapters, PAGE_SPLIT_THRESHOLD
from embedder import embed_texts
from parsers.unstructured_parser import parse_bytes
from qdrant_store import delete_by_source, ensure_collection, upsert_chunks

logger = logging.getLogger("ingestion")


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_collection()
    yield


app = FastAPI(title="Ingestion Service", lifespan=lifespan)


class ParseRequest(BaseModel):
    file_bytes: str  # base64-encoded
    file_name: str
    mime_type: str
    dept_ids: list[str]
    source_id: str
    source_name: str
    source_url: str | None = None


class ParseResponse(BaseModel):
    source_id: str
    chunks_upserted: int
    splits: int = 1


class ResyncRequest(BaseModel):
    source_id: str
    source_name: str
    source_type: str          # GOOGLE_DRIVE | SHAREPOINT
    folder_id: str | None = None
    source_url: str | None = None
    dept_ids: list[str] = []


class ResyncResponse(BaseModel):
    source_id: str
    files_processed: int
    chunks_upserted: int
    errors: list[str] = []


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/parse", response_model=ParseResponse)
def parse(req: ParseRequest):
    try:
        raw_bytes = base64.b64decode(req.file_bytes)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 file_bytes")

    parse_result = parse_bytes(raw_bytes, req.file_name)

    if not parse_result.text.strip():
        return ParseResponse(source_id=req.source_id, chunks_upserted=0)

    total_chunks = 0

    if parse_result.page_count > PAGE_SPLIT_THRESHOLD:
        logger.info(
            "Document '%s' has %d pages — auto-splitting",
            req.file_name, parse_result.page_count,
        )
        splits = split_into_chapters(parse_result.elements, parse_result.page_count)
        for split in splits:
            split_name = f"{req.source_name} — {split['title']}"
            chunks = chunk_text(split["text"])
            if not chunks:
                continue
            vectors = embed_texts([c["text"] for c in chunks])
            upsert_chunks(
                chunks=chunks,
                vectors=vectors,
                source_id=req.source_id,
                source_name=split_name,
                source_url=req.source_url,
                dept_ids=req.dept_ids,
                file_name=split_name,
            )
            total_chunks += len(chunks)
        return ParseResponse(source_id=req.source_id, chunks_upserted=total_chunks, splits=len(splits))

    chunks = chunk_text(parse_result.text)
    if not chunks:
        return ParseResponse(source_id=req.source_id, chunks_upserted=0)

    vectors = embed_texts([c["text"] for c in chunks])
    upsert_chunks(
        chunks=chunks,
        vectors=vectors,
        source_id=req.source_id,
        source_name=req.source_name,
        source_url=req.source_url,
        dept_ids=req.dept_ids,
    )
    total_chunks = len(chunks)

    return ParseResponse(source_id=req.source_id, chunks_upserted=total_chunks)


@app.post("/resync", response_model=ResyncResponse)
def resync(req: ResyncRequest):
    """Fetch all files from a Google Drive folder or SharePoint source, parse, and upsert."""
    files_processed = 0
    total_chunks = 0
    errors: list[str] = []

    if req.source_type == "GOOGLE_DRIVE":
        folder_id = req.folder_id or _extract_drive_folder_id(req.source_url or "")
        if not folder_id:
            raise HTTPException(status_code=400, detail="No Google Drive folder ID provided")

        try:
            from connectors.google_drive import list_files, download_file
        except ImportError as e:
            raise HTTPException(status_code=500, detail=f"Google Drive connector unavailable: {e}")

        try:
            files = list_files(folder_id)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to list Drive files: {e}")

        for f in files:
            try:
                file_bytes, effective_mime = download_file(f["id"], f["mimeType"])
                parse_result = parse_bytes(file_bytes, f["name"])
                if not parse_result.text.strip():
                    continue

                if parse_result.page_count > PAGE_SPLIT_THRESHOLD:
                    logger.info(
                        "File '%s' has %d pages — auto-splitting",
                        f["name"], parse_result.page_count,
                    )
                    splits = split_into_chapters(parse_result.elements, parse_result.page_count)
                    for split in splits:
                        split_name = f"{f['name']} — {split['title']}"
                        chunks = chunk_text(split["text"])
                        if not chunks:
                            continue
                        vectors = embed_texts([c["text"] for c in chunks])
                        upsert_chunks(
                            chunks=chunks,
                            vectors=vectors,
                            source_id=req.source_id,
                            source_name=req.source_name,
                            source_url=f.get("webViewLink"),
                            dept_ids=req.dept_ids,
                            file_name=split_name,
                        )
                        total_chunks += len(chunks)
                else:
                    chunks = chunk_text(parse_result.text)
                    if not chunks:
                        continue
                    vectors = embed_texts([c["text"] for c in chunks])
                    upsert_chunks(
                        chunks=chunks,
                        vectors=vectors,
                        source_id=req.source_id,
                        source_name=req.source_name,
                        source_url=f.get("webViewLink"),
                        dept_ids=req.dept_ids,
                        file_name=f["name"],
                    )
                    total_chunks += len(chunks)

                files_processed += 1
            except Exception as e:
                errors.append(f"{f['name']}: {e}")
                logger.warning("Failed to process Drive file %s: %s", f["name"], e)

    elif req.source_type == "SHAREPOINT":
        errors.append("SharePoint resync not yet implemented")

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported source type: {req.source_type}")

    return ResyncResponse(
        source_id=req.source_id,
        files_processed=files_processed,
        chunks_upserted=total_chunks,
        errors=errors,
    )


@app.delete("/source/{source_id}")
def delete_source(source_id: str):
    delete_by_source(source_id)
    return {"deleted": source_id}


def _extract_drive_folder_id(url: str) -> str:
    import re
    m = re.search(r"/folders/([a-zA-Z0-9_-]+)", url)
    if m:
        return m.group(1)
    if url and "/" not in url:
        return url
    return ""
