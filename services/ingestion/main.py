import base64
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from chunker import chunk_text
from embedder import embed_texts
from parsers.unstructured_parser import parse_bytes
from qdrant_store import delete_by_source, ensure_collection, upsert_chunks


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


class DeleteRequest(BaseModel):
    source_id: str


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

    chunks = chunk_text(parse_result.text)
    if not chunks:
        return ParseResponse(source_id=req.source_id, chunks_upserted=0)

    texts = [c["text"] for c in chunks]
    vectors = embed_texts(texts)

    upsert_chunks(
        chunks=chunks,
        vectors=vectors,
        source_id=req.source_id,
        source_name=req.source_name,
        source_url=req.source_url,
        dept_ids=req.dept_ids,
    )

    return ParseResponse(source_id=req.source_id, chunks_upserted=len(chunks))


@app.delete("/source/{source_id}")
def delete_source(source_id: str):
    delete_by_source(source_id)
    return {"deleted": source_id}
