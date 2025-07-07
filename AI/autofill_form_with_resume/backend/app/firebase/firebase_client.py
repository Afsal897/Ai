import os
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()

cred_path = os.getenv("FIREBASE_CRED_PATH")

if not cred_path or not os.path.exists(cred_path):
    raise FileNotFoundError(f"Firebase credentials not found at: {cred_path}")

# Initialize Firebase Admin
cred = credentials.Certificate(cred_path)
firebase_admin.initialize_app(cred)
db = firestore.client()

def store_resume_data(data: dict) -> str:

    doc_ref = db.collection("resumes").document()
    doc_ref.set(data)
    return doc_ref.id
