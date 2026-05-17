from typing import TypedDict
import tiktoken

from parsers.unstructured_parser import ParsedElement

CHUNK_TOKENS = 512
OVERLAP_TOKENS = 64
ENCODING = "cl100k_base"

PAGE_SPLIT_THRESHOLD = 50  # auto-split documents with more than this many pages
PAGES_PER_SPLIT = 50       # pages per fallback split


class Chunk(TypedDict):
    text: str
    chunk_index: int


class DocumentSplit(TypedDict):
    title: str       # e.g. "Chapter 3: Leave Policy" or "Pages 1–50"
    text: str
    start_page: int
    end_page: int


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
        chunk_text_str = enc.decode(chunk_tokens).strip()

        if chunk_text_str:
            chunks.append({"text": chunk_text_str, "chunk_index": index})
            index += 1

        if end == len(tokens):
            break

        start += CHUNK_TOKENS - OVERLAP_TOKENS

    return chunks


def split_into_chapters(elements: list[ParsedElement], page_count: int) -> list[DocumentSplit]:
    """
    Split a large document into logical sections.
    Strategy 1: group by Title elements if they span meaningful page ranges.
    Strategy 2: fall back to fixed PAGES_PER_SPLIT page windows.
    """
    splits = _try_chapter_split(elements, page_count)
    if splits:
        return splits
    return _page_range_split(elements, page_count)


def _try_chapter_split(elements: list[ParsedElement], page_count: int) -> list[DocumentSplit]:
    """
    Group elements between Title-type boundaries.
    Only use this strategy if we find at least 2 titles that each span 3+ pages,
    to avoid splitting on minor subheadings.
    """
    title_indices = [
        i for i, el in enumerate(elements)
        if el["element_type"] == "Title" and el["text"].strip()
    ]

    if len(title_indices) < 2:
        return []

    # Build candidate chapter groups
    boundaries = title_indices + [len(elements)]
    groups: list[tuple[str, list[ParsedElement]]] = []

    for i, start_idx in enumerate(title_indices):
        end_idx = boundaries[i + 1]
        group_elements = elements[start_idx:end_idx]
        title_text = elements[start_idx]["text"].strip()
        groups.append((title_text, group_elements))

    # Prepend any content before the first title
    if title_indices[0] > 0:
        prefix = elements[: title_indices[0]]
        if prefix:
            groups.insert(0, ("Introduction", prefix))

    # Filter out groups that are too small (fewer than 3 pages span) or have no text
    def group_page_span(grp: list[ParsedElement]) -> int:
        pages = [el["page_number"] for el in grp if el["page_number"]]
        return (max(pages) - min(pages) + 1) if pages else 0

    meaningful = [(title, grp) for title, grp in groups if group_page_span(grp) >= 3]

    # Require at least 2 meaningful chapters to use this strategy
    if len(meaningful) < 2:
        return []

    result: list[DocumentSplit] = []
    for idx, (title, grp) in enumerate(meaningful):
        pages = [el["page_number"] for el in grp if el["page_number"]]
        start_page = min(pages) if pages else 1
        end_page = max(pages) if pages else page_count
        text = "\n\n".join(el["text"] for el in grp if el["text"].strip())
        label = f"Ch {idx + 1}: {title[:60]}" if title != "Introduction" else "Introduction"
        result.append({"title": label, "text": text, "start_page": start_page, "end_page": end_page})

    return result


def _page_range_split(elements: list[ParsedElement], page_count: int) -> list[DocumentSplit]:
    """
    Fall back: split into PAGES_PER_SPLIT-page windows.
    e.g. "Pages 1–50", "Pages 51–100", etc.
    """
    splits: list[DocumentSplit] = []
    start = 1

    while start <= page_count:
        end = min(start + PAGES_PER_SPLIT - 1, page_count)
        group = [el for el in elements if start <= el["page_number"] <= end]
        text = "\n\n".join(el["text"] for el in group if el["text"].strip())
        if text.strip():
            splits.append({
                "title": f"Pages {start}–{end}",
                "text": text,
                "start_page": start,
                "end_page": end,
            })
        start += PAGES_PER_SPLIT

    # If nothing bucketed (e.g. all page_number=0), fall back to full text split
    if not splits and elements:
        text = "\n\n".join(el["text"] for el in elements if el["text"].strip())
        mid = page_count // 2 or 1
        half_a = elements[: len(elements) // 2]
        half_b = elements[len(elements) // 2 :]
        text_a = "\n\n".join(el["text"] for el in half_a if el["text"].strip())
        text_b = "\n\n".join(el["text"] for el in half_b if el["text"].strip())
        if text_a:
            splits.append({"title": f"Pages 1–{mid}", "text": text_a, "start_page": 1, "end_page": mid})
        if text_b:
            splits.append({"title": f"Pages {mid + 1}–{page_count}", "text": text_b, "start_page": mid + 1, "end_page": page_count})

    return splits
