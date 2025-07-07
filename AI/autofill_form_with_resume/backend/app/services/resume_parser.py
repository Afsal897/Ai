import pdfplumber
from io import BytesIO
from sentence_transformers import SentenceTransformer, util
from typing import List, Dict, Union
import re

# Load embedding model
model = SentenceTransformer('intfloat/e5-small-v2')

# Semantic labels for similarity search
semantic_labels = {
    "name": "Full name of the candidate mentioned in the resume header",
    "email": "Candidate's email address in the contact section",
    "skills": "Technical or soft skills listed under skills section",
    "education": "Academic degrees or qualifications with college/university name",
    "experience": "Past job roles, positions, company names, or work descriptions",
    "summary": "Profile summary or objective describing the candidate's background",
}

def extract_contacts_and_name(lines: List[str]) -> Dict[str, str]:
    email, name = '', ''
    for line in lines[:10]:  # Look only at top 10 lines
        if not email:
            match = re.search(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", line)
            if match:
                email = match.group(0)
        if not name:
            name_match = re.match(r"^[A-Z][a-z]+ [A-Z][a-z]+$", line.strip())
            if name_match:
                name = line.strip()
        if email and name:
            break
    return {"name": name, "email": email}

def extract_education(lines: List[str]) -> List[str]:
    return [line for line in lines if re.search(r"(B\.?S\.?|M\.?S\.?|Bachelor|Master|MBA|College|University)", line, re.IGNORECASE)]

def is_valid(label: str, text: str) -> bool:
    ltext = text.lower()
    if label == "name":
        return bool(re.match(r"^[A-Z][a-z]+ [A-Z][a-z]+$", text))
    if label == "email":
        return "@" in text
    if label == "education":
        return any(w in ltext for w in ["university", "college", "bachelor", "degree", "mba"])
    if label == "experience":
        return any(w in ltext for w in ["manager", "intern", "company", "experience", "worked", "hired"])
    if label == "skills":
        return any(w in ltext for w in ["proficient", "skills", "•"])
    if label == "summary":
        return len(text.split()) > 5 and not any(w in ltext for w in ["experience", "education", "skills"])
    return True

def top_k_cosine(label: str, query: str, lines: List[str], k: int = 3) -> List[str]:
    q_emb = model.encode(query, convert_to_tensor=True)
    l_embs = model.encode(lines, convert_to_tensor=True)
    scores = util.pytorch_cos_sim(q_emb, l_embs)[0]
    top_ids = scores.topk(k=k*4).indices.tolist()

    results, seen = [], set()
    for i in top_ids:
        line = lines[i].strip()
        if line.lower() not in seen and is_valid(label, line):
            seen.add(line.lower())
            results.append(line)
        if len(results) == k:
            break
    return results

def extract_resume_data(file_bytes: bytes) -> Dict[str, Union[str, List[str]]]:
    with pdfplumber.open(BytesIO(file_bytes)) as pdf:
        lines = [line.strip() for page in pdf.pages for line in (page.extract_text() or '').split('\n') if line.strip()]

    contact_info = extract_contacts_and_name(lines)
    data = {**contact_info}

    for label, description in semantic_labels.items():
        if label in ["name", "email"]:
            continue
        if label == "education":
            data[label] = extract_education(lines)
        else:
            data[label] = top_k_cosine(label, description, lines)

    return data



