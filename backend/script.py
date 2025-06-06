import os
import json
import numpy as np
import face_recognition
import faiss
from dotenv import load_dotenv
from b2sdk.v2 import InMemoryAccountInfo, B2Api
from concurrent.futures import ThreadPoolExecutor, as_completed
from io import BytesIO

load_dotenv()

B2_KEY_ID = os.getenv('B2_KEY_ID')
B2_APP_KEY = os.getenv('B2_APP_KEY')
B2_BUCKET_NAME = os.getenv('B2_BUCKET_NAME')

num_images_str = os.getenv('NUMBER_OF_IMAGES')
NUMBER_OF_IMAGES = None if not num_images_str or num_images_str.strip() == '' else int(num_images_str)

KEEP_IMAGE = os.getenv('KEEP_IMAGE', 'true').lower() == 'true'

LOCAL_DOWNLOAD_DIR = 'downloaded_images'
os.makedirs(LOCAL_DOWNLOAD_DIR, exist_ok=True)

DB_FILE = 'db.json'
FAISS_INDEX_FILE = 'faiss.index'

def load_db():
    if os.path.exists(DB_FILE):
        with open(DB_FILE, 'r') as f:
            return json.load(f)
    return []

def save_db(data):
    with open(DB_FILE, 'w') as f:
        json.dump(data, f, indent=4)

def load_faiss_index():
    if os.path.exists(FAISS_INDEX_FILE):
        return faiss.read_index(FAISS_INDEX_FILE)
    return faiss.IndexFlatL2(128)

def save_faiss_index(index):
    faiss.write_index(index, FAISS_INDEX_FILE)

def get_b2_client():
    info = InMemoryAccountInfo()
    b2_api = B2Api(info)
    b2_api.authorize_account("production", B2_KEY_ID, B2_APP_KEY)
    return b2_api

def download_file(bucket, file_name):
    try:
        stream = BytesIO()
        bucket.download_file_by_name(file_name).save(stream)
        stream.seek(0)
        return file_name, stream
    except Exception as e:
        print(f"Failed to download {file_name}: {e}")
        return file_name, None

def process_single_image(file_name, file_data, local_path, encoding_id):
    try:
        if KEEP_IMAGE:
            with open(local_path, 'wb') as f:
                f.write(file_data.getbuffer())
        image = face_recognition.load_image_file(file_data)
        encodings = face_recognition.face_encodings(image)
        if not encodings:
            print(f"No face found in {file_name}")
            if os.path.exists(local_path) and not KEEP_IMAGE:
                os.remove(local_path)
            return None
        return {
            "encoding": encodings[0],
            "original_file_name": file_name,
            "local_file_name": os.path.basename(local_path),
            "encoding_id": encoding_id
        }
    except Exception as e:
        print(f"Error processing {file_name}: {e}")
        if os.path.exists(local_path) and not KEEP_IMAGE:
            os.remove(local_path)
        return None

def process_images(b2_api, bucket_name, prefix='', max_files=None, keep_image=True):
    bucket = b2_api.get_bucket_by_name(bucket_name)
    bucket_id = bucket.id_

    db_data = load_db()
    index = load_faiss_index()

    processed_count = 0
    file_index = len(db_data) + 1
    start_file_name = None

    while True:
        response = b2_api.session.list_file_names(
            bucket_id=bucket_id,
            start_file_name=start_file_name,
            max_file_count=1000,
            prefix=prefix
        )
        files = response.get('files', [])
        if not files:
            break

        image_files = [
            f['fileName'] for f in files
            if f['fileName'].lower().endswith(('.jpg', '.jpeg', '.png'))
        ]

        if max_files is not None:
            remaining = max_files - processed_count
            image_files = image_files[:remaining]

        with ThreadPoolExecutor(max_workers=8) as executor:
            future_to_file = {
                executor.submit(download_file, bucket, file_name): file_name
                for file_name in image_files
            }

            for future in as_completed(future_to_file):
                file_name = future_to_file[future]
                file_name, file_data = future.result()

                if file_data is None:
                    continue

                new_file_name = f"{file_index}.jpg"
                local_path = os.path.join(LOCAL_DOWNLOAD_DIR, new_file_name)

                result = process_single_image(file_name, file_data, local_path, index.ntotal)
                if result:
                    index.add(np.array([result["encoding"]], dtype='float32'))
                    db_data.append({
                        "original_file_name": result["original_file_name"],
                        "local_file_name": result["local_file_name"],
                        "encoding_id": result["encoding_id"]
                    })
                    processed_count += 1
                    file_index += 1

        start_file_name = response.get('nextFileName')
        if (max_files is not None and processed_count >= max_files) or not start_file_name:
            break

    save_db(db_data)
    save_faiss_index(index)

def main():
    b2_api = get_b2_client()
    process_images(
        b2_api,
        B2_BUCKET_NAME,
        prefix='mugshots/',
        max_files=NUMBER_OF_IMAGES,
        keep_image=KEEP_IMAGE
    )

if __name__ == "__main__":
    main()
