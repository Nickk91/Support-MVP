import sqlite3
import json

def check_inspection_table():
    conn = sqlite3.connect('rag_platform.db')
    cursor = conn.cursor()
    
    # Check what's in the inspection table
    cursor.execute('SELECT bot_id, document_path, created_at FROM document_inspections;')
    rows = cursor.fetchall()
    
    print('📄 DOCUMENTS IN INSPECTION TABLE:')
    for row in rows:
        print(f'  - Bot: {row[0]}, Document: {row[1]}, Date: {row[2]}')
    print(f'Total: {len(rows)} documents')
    
    conn.close()

if __name__ == "__main__":
    check_inspection_table()