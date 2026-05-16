import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from chunker import chunk_text


def test_chunk_text_splits_long_content():
    text = "word " * 600  # ~600 tokens, exceeds 512 chunk size
    chunks = chunk_text(text)
    assert len(chunks) > 1


def test_chunk_text_short_content():
    text = "Hello world."
    chunks = chunk_text(text)
    assert len(chunks) == 1
    assert chunks[0]["text"] == text.strip()
    assert chunks[0]["chunk_index"] == 0


def test_chunk_text_empty():
    chunks = chunk_text("")
    assert chunks == []


def test_chunk_index_is_sequential():
    text = "word " * 1200
    chunks = chunk_text(text)
    indices = [c["chunk_index"] for c in chunks]
    assert indices == list(range(len(chunks)))
