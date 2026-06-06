import fitz
import sqlite3
import os

DB_PATH = "/home/team/shared/voltqc.db"

def get_db_connection():
    return sqlite3.connect(DB_PATH)

def main():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, filename, filepath FROM Documents")
    rows = cursor.fetchall()
    
    for doc_id, filename, filepath in rows:
        print(f"--- DOCUMENT {doc_id}: {filename} ---")
        if not os.path.exists(filepath):
            print("File not found")
            continue
            
        if filepath.lower().endswith('.pdf'):
            doc = fitz.open(filepath)
            for i, page in enumerate(doc):
                print(f"PAGE {i+1}:")
                print(page.get_text())
            doc.close()
        else:
            print("Not a PDF")
        print("\n")
    conn.close()

if __name__ == "__main__":
    main()
