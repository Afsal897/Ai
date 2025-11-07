# metadata_resolver.py
import json
from .chunking import call_model

from langchain_core.prompts import ChatPromptTemplate
import re

from log import logger
def resolve_metadata(file_record, details_dict):
    logger.info("Resolving metadata using LLM.")
    raw_metadata = {
        "client_name_csv": file_record.get("client_name"),
        "client_name_ppt": details_dict.get("client_name"),
        "project_name_csv": file_record.get("project_name"),
        "project_name_ppt": details_dict.get("project_name"),
        "domain_csv": file_record.get("domain"),
        "domain_ppt": details_dict.get("domain"),
        "technology_csv": file_record.get("technology", []),
        "technology_ppt": details_dict.get("technology"),
        "file_type_csv": file_record.get("file_type"),
        "file_type_ppt": details_dict.get("file_type")
    }

    logger.info("Merging CSV and PPT metadata.")

    prompt_template = ChatPromptTemplate.from_messages([
        ("system", "You are a data cleaning assistant."),
        ("user", """I will give you metadata from two sources: CSV (frontend) and PPT (document extraction).
        Your job is to merge them into a single consistent JSON.
        Rules:
        1. Compare CSV and PPT values.  
        -  Always Give higher priority to the CSV file.
        - Use the CSV value whenever it exists.
        - If the CSV value cannot be found, use the PPT value.
        - If both CSV and PPT values cannot be found, return the appropriate default: 
         "unknown_client", "unknown_project", "unknown_domain", "unknown_type"and for technology, return an empty list [] if unknown.
           
        2. Normalize text:
        - Remove company suffixes like "LLC", "Inc.", "Ltd.", unless needed for clarity.  
        - Always return lowercase text.  
        3. Return valid JSON only, with exactly these keys:  
        - client_name  
        - project_name  
        - domain  
        - technology (must always be a JSON array; empty list if unknown) 
        - file_type 
        4. Do not add "Case Study","RFP","Proposal" and these kind of terms in the project_name
        5. For file_type: only return "rfp" or "case study". If neither can be determined, return "unknown_type".
        Input Metadata:
        {metadata}""")
    ])

    
    formatted_prompt = prompt_template.format_messages(
        metadata=json.dumps(raw_metadata, indent=2, ensure_ascii=False)
    )

    response = call_model(formatted_prompt) 
    raw_out = getattr(response, "content", str(response))
    cleaned_output = re.sub(r"(^```(?:json)?)|(```$)", "", raw_out.strip(), flags=re.MULTILINE)
    logger.info("LLM response received for metadata resolution.")
    try:
        logger.info("Parsing LLM output as JSON.")
        final_metadata = json.loads(cleaned_output)
        logger.info("✅ Metadata resolved successfully via LLM.")
    except json.JSONDecodeError:
        logger.error("⚠️ LLM returned invalid JSON, falling back to raw metadata.")
        final_metadata = {
            "client_name": (raw_metadata["client_name_ppt"] or raw_metadata["client_name_csv"] or "Unknown Client"),
            "project_name": (raw_metadata["project_name_ppt"] or raw_metadata["project_name_csv"] or "Unknown Project"),
            "domain": (raw_metadata["domain_ppt"] or raw_metadata["domain_csv"] or "Unknown Domain"),
            "technology": (raw_metadata["technology_ppt"] or raw_metadata["technology_csv"] or "Unknown Technology"),
            "file_type":(raw_metadata["file_type_ppt"] or raw_metadata["file_type_ppt"] or "Unknown Type")
        }
    return final_metadata