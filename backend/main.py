from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import face_recognition
import numpy as np
import faiss
import json
import os
from io import BytesIO
from PIL import Image
import base64

DB_FILE = 'db.json'
FAISS_INDEX_FILE = 'faiss.index'
DISTANCE_THRESHOLD = 0.3
IMAGE_DIR = 'downloaded_images'

if not os.path.exists(FAISS_INDEX_FILE) or not os.path.exists(DB_FILE):
    raise FileNotFoundError("FAISS index or db.json not found.")

index = faiss.read_index(FAISS_INDEX_FILE)

with open(DB_FILE, 'r') as f:
    db = json.load(f)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def encode_image_to_base64(file_path):
    with open(file_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode("utf-8")

@app.get("/")
async def health_check():
    return {"message": "Server Running Fine!"}

@app.post("/search")
async def search_face(file: UploadFile = File(...)):
    image_data = await file.read()

    try:
        image = face_recognition.load_image_file(BytesIO(image_data))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file.")

    encodings = face_recognition.face_encodings(image)
    if not encodings:
        return JSONResponse(status_code=200, content={
            "match": False,
            "message": "No face found in the uploaded image."
        })

    query_encoding = np.array([encodings[0]], dtype='float32')
    distances, indices = index.search(query_encoding, k=1)

    distance = distances[0][0]
    idx = indices[0][0]

    if distance < DISTANCE_THRESHOLD:
        matched_entry = db[idx]
        file_path = os.path.join(IMAGE_DIR, matched_entry["local_file_name"]) 

        if os.path.exists(file_path):
            base64_img = "data:image/jpeg;base64," + encode_image_to_base64(file_path)
        else:
            base64_img = None 

        return {
            "match": True,
            "message": "Match found.",
            "matched_file": matched_entry["original_file_name"],
            "distance": float(distance),
            "encoding_id": matched_entry["encoding_id"],
            "image_base64": base64_img,
            "mime_type": "image/jpeg"
        }

    return {
        "match": False,
        "message": "No match found.",
        "distance": float(distance)
    }
