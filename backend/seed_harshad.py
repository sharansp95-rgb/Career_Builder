import sqlite3
import json
import sys
import os

# Add backend directory to sys.path if not running from inside it
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from werkzeug.security import generate_password_hash
from auth import get_db_connection

def seed_db():
    conn = get_db_connection()
    try:
        # Check if already exists
        exists = conn.execute("SELECT id FROM users WHERE email=?", ("harshad@example.com",)).fetchone()
        if exists:
            print("Harshad already exists in DB.")
            return

        pwd_hash = generate_password_hash("password123")
        conn.execute(
            """INSERT INTO users (name, email, password_hash, role, is_verified) 
               VALUES (?, ?, ?, ?, ?)""",
            ("Harshad Magdum", "harshad@example.com", pwd_hash, "job_seeker", 1)
        )
        conn.commit()
        
        user_id = conn.execute("SELECT id FROM users WHERE email=?", ("harshad@example.com",)).fetchone()["id"]
        
        resume_text = (
            "HARSHAD MAGDUM\n"
            "Software Engineer | Full Stack Developer\n"
            "Experience:\n"
            "- Built scalable web apps using React and Node.js.\n"
            "- Managed databases with SQL.\n"
            "- Explored Machine Learning and Python for data analysis.\n"
            "Education:\n"
            "- B.Tech in Computer Science."
        )
        skills_json = json.dumps(["Python", "React", "Node.js", "Machine Learning", "SQL"])
        
        conn.execute(
            """INSERT INTO resumes (user_id, resume_text, skills, file_name)
               VALUES (?, ?, ?, ?)""",
            (user_id, resume_text, skills_json, "harshad_resume.pdf")
        )
        conn.commit()
        print(f"Successfully seeded Harshad with ID {user_id}")
    finally:
        conn.close()

if __name__ == "__main__":
    seed_db()
