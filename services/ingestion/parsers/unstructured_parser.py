import io
import tempfile
import os
from typing import NamedTuple

from unstructured.partition.auto import partition
from unstructured.documents.elements import Table, Element


class ParseResult(NamedTuple):
    text: str
    tables: list[str]


def parse_bytes(file_bytes: bytes, file_name: str) -> ParseResult:
    suffix = os.path.splitext(file_name)[1] or ".bin"

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        elements: list[Element] = partition(filename=tmp_path)
    finally:
        os.unlink(tmp_path)

    text_parts: list[str] = []
    table_parts: list[str] = []

    for el in elements:
        if isinstance(el, Table):
            md = _table_to_markdown(el)
            table_parts.append(md)
            text_parts.append(md)
        else:
            text_parts.append(str(el).strip())

    return ParseResult(
        text="\n\n".join(t for t in text_parts if t),
        tables=table_parts,
    )


def _table_to_markdown(table: Table) -> str:
    raw = str(table).strip()
    if not raw:
        return ""
    rows = [r.strip() for r in raw.splitlines() if r.strip()]
    if not rows:
        return ""
    header = "| " + " | ".join(rows[0].split()) + " |"
    separator = "| " + " | ".join(["---"] * len(rows[0].split())) + " |"
    body = "\n".join("| " + " | ".join(r.split()) + " |" for r in rows[1:])
    return "\n".join(filter(None, [header, separator, body]))
