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
VECTOR_SIZE = 1536  # text-embedding-3-small; nomic-embed-text uses 768


def _client() -> QdrantClient:
    return QdrantClient(
        url=settings.qdrant_url,
        api_key=settings.qdrant_api_key or None,
    )


def ensure_collection(vector_size: int = VECTOR_SIZE) -> None:
    client = _client()
    existing = [c.name for c in client.get_collections().collections]
    if COLLECTION not in existing:
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
                "dept_ids": dept_ids,
                "chunk_index": chunk["chunk_index"],
                "modified_at": now,
            },
        )
        for chunk, vector in zip(chunks, vectors)
    ]

    client.upsert(collection_name=COLLECTION, points=points)


def delete_by_source(source_id: str) -> None:
    client = _client()
    client.delete(
        collection_name=COLLECTION,
        points_selector=Filter(
            must=[FieldCondition(key="source_id", match=MatchValue(value=source_id))]
        ),
    )
