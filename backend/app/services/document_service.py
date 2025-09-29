import fitz  # PyMuPDF
import docx

def extract_text_from_pdf(file_stream) -> str:
    doc = fitz.open(stream=file_stream.read(), filetype="pdf")
    text = "".join(page.get_text() for page in doc)
    doc.close()
    return text

def extract_text_from_docx(file_stream) -> str:
    doc = docx.Document(file_stream)
    return "\n".join([para.text for para in doc.paragraphs])

def chunk_text(text: str, chunk_size: int = 500, chunk_overlap: int = 80) -> list[str]:
    if not text:
        return []
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size - chunk_overlap):
        chunks.append(" ".join(words[i:i + chunk_size]))
    return chunks