# backend/app/services/vector_service.py

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from app.core.config import EMBEDDING_MODEL
import os

# Ensure data directory exists
os.makedirs("data/indices", exist_ok=True)
os.makedirs("data/chunks", exist_ok=True)

model = SentenceTransformer(EMBEDDING_MODEL)

def create_and_store_embeddings(doc_id: str, chunks: list[str]):
    embeddings = model.encode(chunks, convert_to_tensor=False)
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(np.array(embeddings).astype('float32'))

    # Save index and chunks
    faiss.write_index(index, f"data/indices/{doc_id}.index")
    
    # --- FIX IS HERE ---
    # Specify the encoding as UTF-8 when writing the file
    with open(f"data/chunks/{doc_id}.txt", "w", encoding="utf-8") as f:
        for chunk in chunks:
            f.write(chunk + "\n---\n") # Use a separator

def retrieve_relevant_chunks(doc_id: str, query: str, top_k: int = 5) -> list[str]:
    try:
        index = faiss.read_index(f"data/indices/{doc_id}.index")
        
        # --- FIX IS HERE ---
        # Specify the encoding as UTF-8 when reading the file
        with open(f"data/chunks/{doc_id}.txt", "r", encoding="utf-8") as f:
            # We add .strip() to handle potential empty strings at the end
            chunks = f.read().strip().split("\n---\n")
    except FileNotFoundError:
        return []

    query_embedding = model.encode([query])
    _, I = index.search(np.array(query_embedding).astype('float32'), top_k)
    
    # Filter out potential index errors if top_k > len(chunks)
    return [chunks[i] for i in I[0] if i < len(chunks)]