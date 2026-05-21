import tempfile
import os
from typing import NamedTuple, TypedDict

from unstructured.partition.auto import partition
from unstructured.documents.elements import Title, Table, Image, Element


class ParsedElement(TypedDict):
    text: str
    page_number: int
    element_type: str  # "Title", "NarrativeText", "Table", etc.


class ExtractedImage(TypedDict):
    image_base64: str
    media_type: str
    page_number: int


class ParseResult(NamedTuple):
    text: str
    tables: list[str]
    elements: list[ParsedElement]
    page_count: int
    images: list[ExtractedImage]


def parse_bytes(file_bytes: bytes, file_name: str) -> ParseResult:
    suffix = os.path.splitext(file_name)[1] or ".bin"

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        elements: list[Element] = partition(
            filename=tmp_path,
            extract_images_in_pdf=True,
            infer_table_structure=True,
        )
    finally:
        os.unlink(tmp_path)

    text_parts: list[str] = []
    table_parts: list[str] = []
    parsed_elements: list[ParsedElement] = []
    extracted_images: list[ExtractedImage] = []
    max_page = 0

    for el in elements:
        meta = getattr(el, "metadata", None)
        page_num: int = getattr(meta, "page_number", None) or 0
        if page_num > max_page:
            max_page = page_num

        if isinstance(el, Image):
            b64 = getattr(meta, "image_base64", None)
            if b64:
                mime = getattr(meta, "image_mime_type", None) or "image/png"
                extracted_images.append({
                    "image_base64": b64,
                    "media_type": mime,
                    "page_number": page_num,
                })
        elif isinstance(el, Table):
            md = _table_to_markdown(el)
            if md:
                table_parts.append(md)
                text_parts.append(md)
                parsed_elements.append({"text": md, "page_number": page_num, "element_type": "Table"})
        else:
            t = str(el).strip()
            if t:
                text_parts.append(t)
                element_type = type(el).__name__
                parsed_elements.append({"text": t, "page_number": page_num, "element_type": element_type})

    return ParseResult(
        text="\n\n".join(t for t in text_parts if t),
        tables=table_parts,
        elements=parsed_elements,
        page_count=max_page,
        images=extracted_images,
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
