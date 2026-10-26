from pathlib import Path

from pypdf import PdfReader


def extract_text_from_pdf(path: str | Path) -> str:
    path = Path(path)
    if not path.exists():
        raise ValueError("PDF file not found")
    try:
        reader = PdfReader(str(path))
        parts: list[str] = []
        for page in reader.pages:
            text = page.extract_text() or ""
            if text.strip():
                parts.append(text)
    except Exception as exc:  # noqa: BLE001 — pypdf raises many error types for bad files
        raise ValueError("This file could not be read as a PDF. Please upload a valid PDF.") from exc
    combined = "\n\n".join(parts).strip()
    if not combined:
        raise ValueError("PDF has no extractable text (scanned or empty)")
    return combined
