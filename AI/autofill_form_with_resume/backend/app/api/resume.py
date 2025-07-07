from fastapi import APIRouter, UploadFile, File
from app.services.resume_parser import extract_resume_data
from app.firebase.firebase_client import store_resume_data

router = APIRouter()

@router.post("/upload_resume")
async def upload_resume(file: UploadFile = File(...)):
    content = await file.read()
    parsed_data = extract_resume_data(content)
    doc_id = store_resume_data(parsed_data)
    return {"id": doc_id, "data": parsed_data}
