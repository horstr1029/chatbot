from config import settings


def embed_texts(texts: list[str]) -> list[list[float]]:
    if settings.embed_provider == "ollama":
        return _embed_ollama(texts)
    return _embed_openai(texts)


def _embed_openai(texts: list[str]) -> list[list[float]]:
    from openai import OpenAI

    client = OpenAI(api_key=settings.openai_api_key)
    response = client.embeddings.create(
        model=settings.embed_model,
        input=texts,
    )
    return [item.embedding for item in response.data]


def _embed_ollama(texts: list[str]) -> list[list[float]]:
    import httpx

    embeddings: list[list[float]] = []
    with httpx.Client(base_url=settings.ollama_base_url, timeout=60) as client:
        for text in texts:
            resp = client.post(
                "/api/embeddings",
                json={"model": settings.embed_model, "prompt": text},
            )
            resp.raise_for_status()
            embeddings.append(resp.json()["embedding"])
    return embeddings
