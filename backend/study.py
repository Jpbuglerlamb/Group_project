import sqlite3

connection = sqlite3.connect('study_planner.db')
cursor = connection.cursor()
cursor.execute("PRAGMA foreign_keys = ON")
cursor.execute("""
    CREATE TABLE IF NOT EXISTS semesters (
        id INTEGER PRIMARY KEY,
        number INTEGER NOT NULL
    )
""")
cursor.execute("INSERT OR IGNORE INTO semesters (id, number) VALUES (1,1), (2,2)")
cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        full_name TEXT NOT NULL,
        phone TEXT,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL
    )
""")
cursor.execute("""
    CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        semester_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        FOREIGN KEY (semester_id) REFERENCES semesters(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE (name, user_id)
    )
""")
cursor.execute("""
    CREATE TABLE IF NOT EXISTS assessments (
        id INTEGER PRIMARY KEY,
        subject_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        due_date TEXT,
        progress INTEGER DEFAULT 0,
        FOREIGN KEY (subject_id) REFERENCES subjects (id)
    )
""")
connection.commit()
connection.close()