import re
import json
import time
from config import Config
from langchain.schema import Document
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from google.api_core.exceptions import ResourceExhausted
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.text_splitter import RecursiveCharacterTextSplitter

from log import logger

API_KEYS = [
    Config.GOOGLE_API_KEY_1,
    Config.GOOGLE_API_KEY_2,
    Config.GOOGLE_API_KEY_3,
]

current_key_index = 0

def get_model():
    """Return a ChatGoogleGenerativeAI instance with the current API key."""
    global current_key_index
    logger.info(f"Using Google API key ...{API_KEYS[current_key_index][-6:]}")
    return ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=API_KEYS[current_key_index]
    )

class APIKeysExhaustedError(RuntimeError):
    """Raised when all API keys are exhausted or still rate limited."""
    pass

def call_model(prompt: str, retries: int = 3):
    """Call Gemini model with retry + key rotation."""
    global current_key_index
    logger.info("Calling Gemini model.")
    for attempt in range(retries):
        try:
            model = get_model()
            response = model.invoke(prompt)
            return response

        except ResourceExhausted:
            logger.warning(f"Rate limit hit on key ...{API_KEYS[current_key_index][-6:]} Switching keys.")
            current_key_index = (current_key_index + 1) % len(API_KEYS)
            time.sleep(2 ** attempt)

    logger.error("All API keys exhausted or still rate limited.")
    raise APIKeysExhaustedError("All API keys exhausted or still rate limited.")

# --- Merge slides ---
def polish_content(file_record):
    all_docs = []
    processed_text=[]
    slides = file_record.get("slides", [])
    
    logger.info(f"Polishing content for {len(slides)} slides.")
    if not slides:
        logger.warning("No slides found in file_record.")
        return []

    logger.info(f"Starting content polishing for {len(slides)} slides.")

    # --- Prepare system prompt once ---
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are provided with content from a single slide in JSON format.
                     Rewrite the text in a presentation-like format.
                     - Use bullets, headings, or subheadings.
                     - Do NOT add extra commentary.
                     - Output only plain text suitable for a presentation.
                     - Include slide number if available.
                  """),
        ("human", "{input_data}")
    ])
    logger.info("System prompt for polishing content prepared.")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n\n", "\n", " "]
    )
    all__docs =_slides(slides,prompt,processed_text,text_splitter,all_docs)
    final_ppt="\n".join(processed_text)

    summary_prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a world-class executive summarization expert with deep knowledge
                    in project documentation, software systems, and business analysis.
                    Your task is to generate a **single, highly detailed, professional executive summary** 
                    from slide content. The summary should enable any reader to fully understand 
                    the project without seeing the original slides.

                    Requirements:
                    1. Capture **every critical detail** from the slides, including:
                        - Project overview and purpose
                        - Key features and functionalities
                        - Technologies and tools used
                        - Processes, workflows, or methodologies described
                        - Findings, insights, and conclusions
                    2. Use only the content provided — do not add assumptions or outside knowledge.
                    3. Present the summary in a **cohesive, narrative format**, flowing logically.
                    4. Include technical details in a readable and professional manner.
                    5. **STRICT RULE:** The summary **must not exceed 8000 characters**. Condense wording carefully if needed, but do not omit critical information. Exceeding this limit is not allowed.
                    6. Ensure someone reading this summary alone can fully understand the project, its scope, and its implementation.
                """),
        ("human", "{ppt_text}")
    ])

    formatted_summary_prompt = summary_prompt.format_messages(ppt_text=final_ppt)
    summary_response = call_model(formatted_summary_prompt)
    summary_text = getattr(summary_response, "content", str(summary_response)).strip()

# ---- Trim for DB safety (optional, but should rarely be needed if LLM follows strict rule) ----
    if len(summary_text) > 8000:
        summary_text = summary_text[:7997] + "..."




    logger.info(f"✅ Created {len(all_docs)} recursive text chunks for embedding.")
    return all__docs,final_ppt,summary_text

def _slides(slides, prompt, processed_text, text_splitter, all_docs):
    logger.info("Processing slides for polishing and chunking.")
    for slide in slides:
        slide_num = slide.get("slide_number")
        try:
            merged_texts = _merge_slide_text(slide)
            polished_text = _call_model_for_slide(merged_texts, prompt)
            processed_text.append(polished_text)
            _add_chunks_to_docs(polished_text, slide_num, all_docs, text_splitter)
        except Exception as e:
            logger.error(f"Error processing slide {slide_num}: {e}")
    return all_docs


def _merge_slide_text(slide) -> str:
    """Merge title, subtitle, text blocks, and tables into a single string."""
    logger.info(f"Merging text for slide {slide.get('slide_number')}.")
    merged_texts = []
    if slide.get("title"):
        merged_texts.append(f"• Title: {slide['title']}")
    if slide.get("subtitle"):
        merged_texts.append(f"‣ Subtitle: {slide['subtitle']}")
    for block in slide.get("text_blocks", []):
        merged_texts.append(block)
    for table in slide.get("tables", []):
        for row in table:
            merged_texts.append("▪ " + " | ".join(row))
    return "\n".join(merged_texts)


def _call_model_for_slide(content: str, prompt) -> str:
    """Call the LLM to polish slide content."""
    logger.info("Calling model to polish slide content.")   
    formatted_prompt = prompt.format_messages(input_data=content)
    response = call_model(formatted_prompt)
    return getattr(response, "content", str(response))


def _add_chunks_to_docs(polished_text: str, slide_num: int, all_docs: list, text_splitter):
    """Split polished text into chunks and append to document list."""
    logger.info(f"Splitting polished text of slide {slide_num} into chunks.")
    chunks = text_splitter.split_text(polished_text)
    for idx, chunk in enumerate(chunks, start=1):
        all_docs.append(Document(
            page_content=chunk,
            metadata={"slide_number": slide_num, "chunk_id": f"{slide_num}-{idx}"}
        ))

def find_details(polished_text):
    """
    Extract Company name, Client Name, domain, technology, Content
    from polished text using LLM and return as a Python dictionary.
    """
    logger.info("Extracting details from polished text using LLM.")
    prompt = ChatPromptTemplate.from_messages([
        ("system", """
    You are a data extraction assistant. 

    Task:
    - From the given content, extract the following fields:
        1. Client Name
        2. Domain
        3. Technology
        4. Project Name
        5. File Type
         
    **Strict Rule**
    - Normalize synonyms to consistent canonical forms:
        • "dev", "devel", "dev." → "development"
        • "tech", "techn." → "technology"
        • Apply similar normalization for obvious abbreviations or partial words
        • Do not add Innovature.ai as client name under any circumstance innovature is our company not client.
        • The  File Type will be either "RFP" or "Case Study"
    
    -Domain Classification
        - Detect the domain mentioned in the text and classify it into a *broad, general category*.
        - Avoid subdomains, niche areas, or descriptive phrases.
            Example:
                • "healthcare analytics" or "medical data platform" → "Healthcare"
                • "fintech" or "banking solution" → "Finance"
                • "HR automation" → "Human Resources"
                • "supply chain logistics" or "freight tracking" → "Logistics"
                • "restaurant ordering system" → "Food & Beverage"
                • "school management system" → "Education"
                • "travel booking platform" → "Tourism"
        - Always use concise, top-level categories such as:
            Tourism, Healthcare, Finance, Business, Hospitality,
            Food & Beverage, Retail, Event Management, Logistics,
            E-Commerce, Security Services, Waste Management,
            Marketing, Education, Human Resources, Fitness & Health,
            IT Infrastructure, Information Technology, Automotive,
            Entertainment, Risk Management
        - If the detected domain doesn’t fit any general category, return "unknown domain".
        - Do NOT include words like "industry", "sector", "domain", or "field" in the value.
        - Keep the domain value clean and standardized.
         
    Output requirements:
    - Provide the output strictly as a valid JSON dictionary.
    - Include all fields even if the value is unknown; use empty string "Unknown + (client,technology,etc..)" if not found.
    - Do NOT add any extra commentary, text, or explanations.
    - Keys must match exactly: "client_name", "domain", "technology", "project_name","file_name"
    - The "technology" fields must be JSON arrays (lists of strings). 
    - If unknown, return empty arrays: []
    - The  File Type should be either "RFP" or "Case Study".
    - Project name usually placed on the First Slide of the PPT,extract it from there if available


    Example output:
    {{
    "client_name": "XYZ Ltd",
    "domain": "Healthcare",
    "technology": ["Python", "Django", "React"],
    "project_name" : "Message App Development",
    "file_type" : "Case Study"
    }}
        """),
        ("human", "{input_data}")
    ])

    formatted_prompt = prompt.format_messages(input_data=polished_text)
    response = call_model(formatted_prompt)

    raw_output = getattr(response, "content", str(response))

    cleaned_output = re.sub(r"(^```(?:json)?\s*)|(\s*```$)", "", raw_output.strip(), flags=re.MULTILINE)
    try:
        logger.info("Parsing LLM output to extract details.")
        details = json.loads(cleaned_output)
    except json.JSONDecodeError:
        logger.error("Failed to parse LLM output.")
        print(" Failed to parse LLM output. Returning empty dict.")
        details = {}
    details["technology"] = details.get("technology", [])
    return details


