import os
import uuid
from datetime import datetime, timezone

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
)

from config import settings

COLLECTION = "company_docs"

# Vector size depends on the embed model
_EMBED_MODEL = os.environ.get("EMBED_MODEL", settings.embed_model)
VECTOR_SIZE = 768 if "nomic" in _EMBED_MODEL or "ollama" in settings.embed_provider else 1536


def _client() -> QdrantClient:
    return QdrantClient(
        url=settings.qdrant_url,
        api_key=settings.qdrant_api_key or None,
    )


def ensure_collection(vector_size: int = VECTOR_SIZE) -> None:
    client = _client()
    existing = {c.name: c for c in client.get_collections().collections}

    if COLLECTION in existing:
        # Check if vector size matches; recreate if not
        info = client.get_collection(COLLECTION)
        current_size = info.config.params.vectors.size  # type: ignore[union-attr]
        if current_size != vector_size:
            client.delete_collection(COLLECTION)
        else:
            return

    client.create_collection(
        collection_name=COLLECTION,
        vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
    )


def upsert_chunks(
    chunks: list[dict],
    vectors: list[list[float]],
    source_id: str,
    source_name: str,
    source_url: str | None,
    dept_ids: list[str],
    file_name: str | None = None,
) -> None:
    client = _client()
    now = datetime.now(timezone.utc).isoformat()

    points = [
        PointStruct(
            id=str(uuid.uuid4()),
            vector=vector,
            payload={
                "text": chunk["text"],
                "source_id": source_id,
                "source_name": source_name,
                "source_url": source_url or "",
                "file_name": file_name or source_name,
                "dept_ids": dept_ids,
                "chunk_index": chunk["chunk_index"],
                "modified_at": now,
            },
        )
        for chunk, vector in zip(chunks, vectors)
        if vector  # skip chunks where embedding failed
    ]

    client.upsert(collection_name=COLLECTION, points=points)


def upsert_image_chunks(
    images: list[dict],  # list of {description, image_base64, media_type, page_number}
    vectors: list[list[float]],
    source_id: str,
    source_name: str,
    source_url: str | None,
    dept_ids: list[str],
) -> None:
    """Store image chunks — description is the embeddable text; image_base64 is returned on retrieval."""
    client = _client()
    now = datetime.now(timezone.utc).isoformat()

    points = [
        PointStruct(
            id=str(uuid.uuid4()),
            vector=vector,
            payload={
                "text": img["description"],
                "image_base64": img["image_base64"],
                "image_media_type": img.get("media_type", "image/png"),
                "element_type": "Image",
                "source_id": source_id,
                "source_name": source_name,
                "source_url": source_url or "",
                "dept_ids": dept_ids,
                "chunk_index": img.get("page_number", 0),
                "modified_at": now,
            },
        )
        for img, vector in zip(images, vectors)
        if vector and img.get("description")
    ]

    if points:
        client.upsert(collection_name=COLLECTION, points=points)


def delete_by_source(source_id: str) -> None:
    client = _client()
    client.delete(
        collection_name=COLLECTION,
        points_selector=Filter(
            must=[FieldCondition(key="source_id", match=MatchValue(value=source_id))]
        ),
    )
