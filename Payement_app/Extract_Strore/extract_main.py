import os
import json
import traceback
from .extractor import parse_pptx
from log import set_log_filename, logger
from .insert_file import insert_file_record_full
from .metadata_normalizer import resolve_metadata
from .chunking import polish_content, find_details



def process_file(
    project_name: str,
    file_path: str,
    file_type: str,
    domain: str,
    technology: list[str],
    client_name: str,
):
    set_log_filename("extraction")
    logger.info(f"Started processing file: {file_path}")

    slides = []

    # Parse PPTX if applicable
    if file_path.lower().endswith(".pptx"):
        slides = parse_pptx(file_path)
        logger.info(f"Extracted {len(slides)} slides from {project_name}")

        # Save slides JSON locally
        output_folder = "Slides_JSON"
        os.makedirs(output_folder, exist_ok=True)
        output_json = os.path.join(
            output_folder, project_name.replace(".pptx", ".json")
        )
        with open(output_json, "w", encoding="utf-8") as f:
            json.dump(slides, f, indent=2, ensure_ascii=False)

        logger.info(f"Slides JSON saved at: {output_json}")

        # Polish content and insert
        polished_docs, polished_text,summary = polish_content(
            {
                "project_name": project_name,
                "file_path": file_path,
                "file_type": file_type,
                "domain": domain,
                "technology": technology,
                "client_name": client_name,
                "slides": slides,
            }
        )
        logger.info(f"Polished content generated for {project_name}")
        details_dict = find_details(polished_text)
        metadata_nomrs = resolve_metadata(
            {
                "project_name": project_name,
                "file_path": file_path,
                "file_type": file_type,
                "domain": domain,
                "technology": technology,
                "client_name": client_name,
            },
            details_dict,
        )
        try:
            insert_file_record_full(metadata_nomrs, polished_docs, file_path,summary)
            logger.info(f"✅ File inserted successfully: {project_name}")
        except Exception as e:
            logger.error(f"❌ Error inserting file {project_name}: {e}")
            logger.debug(traceback.format_exc())
    logger.info(f"Completed processing: {file_path}")
    return {"project_name": project_name, "file_path": file_path, "slides": slides}