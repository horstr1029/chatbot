import logging
import os

logger = logging.getLogger("ingestion")

MAX_B64_SIZE = 150_000  # skip images whose base64 exceeds ~112KB raw


def describe_image(image_base64: str, media_type: str = "image/png") -> str | None:
    """Call Claude vision to get a text description of an extracted image."""
    if len(image_base64) > MAX_B64_SIZE:
        logger.debug("Skipping image description — base64 too large (%d bytes)", len(image_base64))
        return None

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        logger.warning("ANTHROPIC_API_KEY not set — skipping image description")
        return None

    try:
        import anthropic

        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=400,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": image_base64,
                            },
                        },
                        {
                            "type": "text",
                            "text": (
                                "Describe this technical diagram, schematic, or image in detail. "
                                "Focus on: component names, connections between components, labels, "
                                "wire routes, terminal numbers, and any specifications visible. "
                                "Be specific and concise. If this is not a technical diagram, "
                                "briefly describe what it shows."
                            ),
                        },
                    ],
                }
            ],
        )
        return response.content[0].text  # type: ignore[union-attr]
    except Exception as e:
        logger.warning("Image description failed: %s", e)
        return None
