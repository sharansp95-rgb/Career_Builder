import sqlite3
conn = sqlite3.connect('users.db')
cursor = conn.cursor()

# Get all tables
tables = [row[0] for row in cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")]
print("Tables in users.db:")
print(tables)

# check each table for related data
for table in tables:
    print(f"\n--- Checking table: {table} ---")
    cursor.execute(f"PRAGMA table_info({table})")
    columns = [col[1] for col in cursor.fetchall()]
    print(f"Columns: {columns}")
    
    # Let's count total rows
    cursor.execute(f"SELECT COUNT(*) FROM {table}")
    count = cursor.fetchone()[0]
    print(f"Total rows: {count}")
    
    if count > 0:
        print("Sample data (up to 3 rows):")
        cursor.execute(f"SELECT * FROM {table} LIMIT 3")
        for row in cursor.fetchall():
            print(row)
