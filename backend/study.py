import sqlite3

courses = {
    "computing": {
        "semester_1": [
            "Web Development",
            "Programming",
            "Data",
            "Team Working",
            "Professionalism and Ethics"
        ],
        "semester_2": [
            "Graded Unit",
            "Group Project"
        ]
    }
}
connection = sqlite3.connect('study_planner.db')
cursor = connection.cursor()
cursor.execute("""
    CREATE TABLE IF NOT EXISTS semesters (
        id INTEGER PRIMARY KEY,
        number INTEGER NOT NULL
    )
""")
cursor.execute("""
    CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL UNIQUE
    )
""")
semester_choice = input("Which semester? 1 or 2: ")
semester_key = "semester_" + semester_choice
semester = courses["computing"][semester_key]
for subject in semester:
    print(subject)
    cursor.execute(
        "INSERT OR IGNORE INTO subjects (name) VALUES (?)",
            (subject,)
    )
connection.commit()
connection.close()