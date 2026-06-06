import os
import json
import sqlite3
import time
import fitz  # PyMuPDF
import re

DB_PATH = "/home/team/shared/voltqc.db"

def get_db_connection():
    return sqlite3.connect(DB_PATH)

def classify_text(text):
    text = text.lower()
    
    if re.search(r'title|drawing index|location map|index of drawings', text):
        return "Title Sheet", 0.95
    if re.search(r'legend|symbol|abbreviation|general notes', text):
        return "Legend/Symbols", 0.95
    if re.search(r'riser|diagram|one-line|single-line', text):
        return "Riser Diagram", 0.95
    if re.search(r'schedule|panelboard schedule|fixture schedule', text):
        return "Schedule", 0.95
    if re.search(r'floor plan|level|power plan|lighting plan|fire alarm plan', text):
        return "Floor Plan", 0.90
    
    return "Unknown", 0.1

def extract_metadata(text):
    metadata = {}
    
    # Floor Number - improved regex
    floor_pattern = r'(?:floor|level|lvl)\s*(\d+|ground|basement|roof|mezzanine|podium)|\b(ground|basement|roof|mezzanine|podium)\b\s*(?:floor|level|lvl|plan)'
    floor_match = re.search(floor_pattern, text, re.IGNORECASE)
    if floor_match:
        val = floor_match.group(1) or floor_match.group(2)
        metadata['floor'] = val.strip().capitalize()
    
    # Sheet Number
    sheet_match = re.search(r'sheet\s*(?:no\.?|number)?\s*([a-z]{1,2}\d+\.?\d*[a-z]?)', text, re.IGNORECASE)
    if not sheet_match:
        sheet_match = re.search(r'\b([a-z]{1,2}\d{3,4}[a-z]?)\b', text, re.IGNORECASE)
    
    if sheet_match:
        metadata['sheet_number'] = sheet_match.group(1).upper()
    
    # Building Area
    area_match = re.search(r'(?:area|zone|sector|tower|block)\s*([a-z0-9]+)', text, re.IGNORECASE)
    if area_match:
        metadata['building_area'] = area_match.group(1).strip().upper()
        
    return metadata

def process_document(doc_id, filepath):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return
    
    print(f"Processing document {doc_id}: {filepath}")
    
    try:
        if filepath.lower().endswith('.pdf'):
            doc = fitz.open(filepath)
            text = ""
            for i in range(min(len(doc), 5)):
                text += doc[i].get_text()
            
            classification, confidence = classify_text(text)
            metadata = extract_metadata(text)
            metadata['pages'] = len(doc)
            metadata['file_size_bytes'] = os.path.getsize(filepath)
            
            doc.close()
        else:
            classification = "Image (Unclassified)"
            confidence = 0.5
            metadata = {'type': 'image'}
            
        update_document(doc_id, classification, confidence, metadata)
        
    except Exception as e:
        print(f"Error processing {filepath}: {e}")

def update_document(doc_id, classification, confidence, metadata):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE Documents SET classification = ?, confidence_score = ?, metadata = ? WHERE id = ?",
        (classification, confidence, json.dumps(metadata), doc_id)
    )
    conn.commit()
    conn.close()
    print(f"Updated document {doc_id} as {classification}")

def main():
    print("Document Profiler Service started...")
    while True:
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT id, filepath FROM Documents WHERE classification IS NULL")
            rows = cursor.fetchall()
            conn.close()
            
            for row in rows:
                process_document(row[0], row[1])
                
        except Exception as e:
            print(f"Database error: {e}")
            
        time.sleep(5)

if __name__ == "__main__":
    main()
