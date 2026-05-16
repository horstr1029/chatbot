from typing import TypedDict
import tiktoken

CHUNK_TOKENS = 512
OVERLAP_TOKENS = 64
ENCODING = "cl100k_base"


class Chunk(TypedDict):
    text: str
    chunk_index: int


def chunk_text(text: str) -> list[Chunk]:
    enc = tiktoken.get_encoding(ENCODING)
    tokens = enc.encode(text)

    if not tokens:
        return []

    chunks: list[Chunk] = []
    start = 0
    index = 0

    while start < len(tokens):
        end = min(start + CHUNK_TOKENS, len(tokens))
        chunk_tokens = tokens[start:end]
        chunk_text = enc.decode(chunk_tokens).strip()

        if chunk_text:
            chunks.append({"text": chunk_text, "chunk_index": index})
            index += 1

        if end == len(tokens):
            break

        start += CHUNK_TOKENS - OVERLAP_TOKENS

    return chunks
