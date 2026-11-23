import os
import sqlite3
from datetime import date
from flask import Flask, jsonify, request, session, redirect
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__, static_folder="../frontend", static_url_path="")
app.secret_key = os.environ.get("SECRET_KEY", "dev-only-change-me")
DB_PATH = os.path.join(os.path.dirname(__file__), "study_planner.db")


def is_valid_date(text):
    """True if text is a real date written like 2026-11-14."""
    try:
        date.fromisoformat(text)
        return True
    except (TypeError, ValueError):
        return False

def owns_assessment(connection, assessment_id):
    """True if this assessment belongs to the logged-in user."""
    row = connection.execute("""
        SELECT assessments.id FROM assessments
        JOIN subjects ON assessments.subject_id = subjects.id
        WHERE assessments.id = ? AND subjects.user_id = ?
    """, (assessment_id, session["user_id"])).fetchone()
    return row is not None


def find_item_assessment(connection, item_id):
    """The assessment id a checklist step belongs to, or None if it isn't the logged-in user's."""
    row = connection.execute("""
        SELECT checklist_items.assessment_id FROM checklist_items
        JOIN assessments ON checklist_items.assessment_id = assessments.id
        JOIN subjects ON assessments.subject_id = subjects.id
        WHERE checklist_items.id = ? AND subjects.user_id = ?
    """, (item_id, session["user_id"])).fetchone()
    if row is None:
        return None
    return row[0]


def update_progress(connection, assessment_id):
    """Works out progress from the ticked steps, saves it, and gives it back."""
    total, done = connection.execute("""
        SELECT COUNT(*), COALESCE(SUM(done), 0)
        FROM checklist_items WHERE assessment_id = ?
    """, (assessment_id,)).fetchone()

    if total == 0:
        progress = 0
    else:
        progress = round(done * 100 / total)

    connection.execute("UPDATE assessments SET progress = ? WHERE id = ?", (progress, assessment_id))
    return progress
# =========================
# PAGES
# =========================

@app.route("/")
def home():
    return app.send_static_file("index.html")


@app.route("/home.html")
def home_page():
    if "user_id" not in session:
        return redirect("/login.html")
    return app.send_static_file("home.html")


# =========================
# ACCOUNTS
# =========================

@app.route("/api/signup", methods=["POST"])
def signup():
    data = request.get_json()
    password_hash = generate_password_hash(data["password"])

    connection = sqlite3.connect(DB_PATH)
    try:
        cursor = connection.execute(
            "INSERT INTO users (username, full_name, phone, email, password_hash) VALUES (?, ?, ?, ?, ?)",
            (data["username"], data["full_name"], data["phone"], data["email"], password_hash)
        )
        connection.commit()
    except sqlite3.IntegrityError:
        connection.close()
        return jsonify({"error": "That username or email already exists"}), 409

    connection.close()

    # log the new user straight in, so they can go to home.html
    session["user_id"] = cursor.lastrowid
    session["username"] = data["username"]
    return jsonify({"message": "Account created"}), 201


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()

    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    user = connection.execute(
        "SELECT id, username, password_hash FROM users WHERE username = ?",
        (data["username"],)
    ).fetchone()
    connection.close()

    if user is None or not check_password_hash(user["password_hash"], data["password"]):
        return jsonify({"error": "Wrong username or password"}), 401

    session["user_id"] = user["id"]
    session["username"] = user["username"]
    return jsonify({"message": "Logged in", "username": user["username"]})


@app.route("/api/me")
def me():
    if "user_id" not in session:
        return jsonify({"error": "You are not logged in"}), 401
    return jsonify({"username": session["username"]})


@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "You have been logged out"})


# =========================
# CLASSES (subjects)
# =========================

@app.route("/api/semesters/<int:number>/subjects")
def get_subjects(number):
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401

    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    rows = connection.execute(
        "SELECT id, name FROM subjects WHERE semester_id = ? AND user_id = ? ORDER BY name",
        (number, session["user_id"])
    ).fetchall()
    connection.close()
    return jsonify([dict(row) for row in rows])


@app.route("/api/subjects", methods=["POST"])
def add_subject():
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401

    data = request.get_json()
    name = (data.get("name") or "").strip()
    if name == "":
        return jsonify({"error": "Please type a class name"}), 400

    connection = sqlite3.connect(DB_PATH)
    connection.execute("PRAGMA foreign_keys = ON")
    try:
        connection.execute(
            "INSERT INTO subjects (name, semester_id, user_id) VALUES (?, ?, ?)",
            (name, data["semester_id"], session["user_id"])
        )
        connection.commit()
    except sqlite3.IntegrityError:
        connection.close()
        return jsonify({"error": "You already have a class with that name"}), 409

    connection.close()
    return jsonify({"message": "Subject added"}), 201


@app.route("/api/subjects/<int:subject_id>", methods=["PUT"])
def rename_subject(subject_id):
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401

    data = request.get_json()
    name = (data.get("name") or "").strip()
    if name == "":
        return jsonify({"error": "Please type a class name"}), 400

    connection = sqlite3.connect(DB_PATH)
    try:
        cursor = connection.execute(
            "UPDATE subjects SET name = ? WHERE id = ? AND user_id = ?",
            (name, subject_id, session["user_id"])
        )
        connection.commit()
    except sqlite3.IntegrityError:
        connection.close()
        return jsonify({"error": "You already have a class with that name"}), 409

    connection.close()
    # rowcount is how many rows were changed: 0 means it isn't this user's class
    if cursor.rowcount == 0:
        return jsonify({"error": "Class not found"}), 404
    return jsonify({"message": "Class renamed"})


@app.route("/api/subjects/<int:subject_id>", methods=["DELETE"])
def delete_subject(subject_id):
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401

    connection = sqlite3.connect(DB_PATH)
    connection.execute("PRAGMA foreign_keys = ON")
    subject = connection.execute(
        "SELECT id FROM subjects WHERE id = ? AND user_id = ?",
        (subject_id, session["user_id"])
    ).fetchone()
    if subject is None:
        connection.close()
        return jsonify({"error": "Class not found"}), 404

    # its assessments go first, because they point at the class (foreign key)
    # its assessments' steps go first of all, because they point at the assessments
    connection.execute(
        "DELETE FROM checklist_items WHERE assessment_id IN (SELECT id FROM assessments WHERE subject_id = ?)",
        (subject_id,))
    connection.execute("DELETE FROM subjects WHERE id = ?", (subject_id,))
    connection.commit()
    connection.close()
    return jsonify({"message": "Class deleted"})


# =========================
# ASSESSMENTS
# =========================


@app.route("/api/subjects/<int:subject_id>/assessments")
def get_assessments(subject_id):
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401

    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    rows = connection.execute("""
        SELECT assessments.id, assessments.title, assessments.due_date, assessments.progress
        FROM assessments
        JOIN subjects ON assessments.subject_id = subjects.id
        WHERE subjects.id = ? AND subjects.user_id = ?
        ORDER BY assessments.due_date
    """, (subject_id, session["user_id"])).fetchall()
    connection.close()
    return jsonify([dict(row) for row in rows])

@app.route("/api/assessments")
def get_all_assessments():
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401

    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    rows = connection.execute("""
        SELECT assessments.id, assessments.title, assessments.due_date, assessments.progress, assessments.subject_id, subjects.semester_id, subjects.name AS class_name
        FROM assessments
        JOIN subjects ON assessments.subject_id = subjects.id
        WHERE subjects.user_id = ?
        ORDER BY assessments.due_date
    """, (session["user_id"],)).fetchall()
    connection.close()
    return jsonify([dict(row) for row in rows])

@app.route("/api/assessments", methods=["POST"])
def add_assessment():
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401

    data = request.get_json()
    title = (data.get("title") or "").strip()
    due_date = data.get("due_date")
    if title == "":
        return jsonify({"error": "Please type a title"}), 400
    if not is_valid_date(due_date):
        return jsonify({"error": "Please pick a due date"}), 400

    connection = sqlite3.connect(DB_PATH)
    connection.execute("PRAGMA foreign_keys = ON")
    subject = connection.execute(
        "SELECT id FROM subjects WHERE id = ? AND user_id = ?",
        (data.get("subject_id"), session["user_id"])
    ).fetchone()
    if subject is None:
        connection.close()
        return jsonify({"error": "Class not found"}), 404

    connection.execute(
        "INSERT INTO assessments (subject_id, title, due_date) VALUES (?, ?, ?)",
        (subject[0], title, due_date)
    )
    connection.commit()
    connection.close()
    return jsonify({"message": "Assessment added"}), 201


@app.route("/api/assessments/<int:assessment_id>", methods=["PUT"])
def update_assessment(assessment_id):
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401

    data = request.get_json()
    title = (data.get("title") or "").strip()
    due_date = data.get("due_date")
    if title == "":
        return jsonify({"error": "Please type a title"}), 400
    if not is_valid_date(due_date):
        return jsonify({"error": "Please write the date like 2026-11-14"}), 400

    connection = sqlite3.connect(DB_PATH)
    # only change it if its class belongs to the logged-in user
    cursor = connection.execute("""
        UPDATE assessments SET title = ?, due_date = ?
        WHERE id = ? AND subject_id IN (SELECT id FROM subjects WHERE user_id = ?)
    """, (title, due_date, assessment_id, session["user_id"]))
    connection.commit()
    connection.close()

    if cursor.rowcount == 0:
        return jsonify({"error": "Assessment not found"}), 404
    return jsonify({"message": "Assessment updated"})


@app.route("/api/assessments/<int:assessment_id>", methods=["DELETE"])
def delete_assessment(assessment_id):
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401

    connection = sqlite3.connect(DB_PATH)
    if not owns_assessment(connection, assessment_id):
        connection.close()
        return jsonify({"error": "Assessment not found"}), 404

    connection.execute("DELETE FROM checklist_items WHERE assessment_id = ?", (assessment_id,))
    connection.execute("DELETE FROM assessments WHERE id = ?", (assessment_id,))
    connection.commit()
    connection.close()
    return jsonify({"message": "Assessment deleted"})

# =========================
# CHECKLIST
# =========================

@app.route("/api/assessments/<int:assessment_id>/checklist")
def get_checklist(assessment_id):
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401

    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    if not owns_assessment(connection, assessment_id):
        connection.close()
        return jsonify({"error": "Assessment not found"}), 404

    rows = connection.execute(
        "SELECT id, text, done FROM checklist_items WHERE assessment_id = ? ORDER BY id",
        (assessment_id,)
    ).fetchall()
    connection.close()
    return jsonify([{"id": row["id"], "text": row["text"], "done": row["done"] == 1} for row in rows])


@app.route("/api/assessments/<int:assessment_id>/checklist", methods=["POST"])
def add_checklist_item(assessment_id):
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401

    data = request.get_json()
    text = (data.get("text") or "").strip()
    if text == "":
        return jsonify({"error": "Please type a step"}), 400

    connection = sqlite3.connect(DB_PATH)
    if not owns_assessment(connection, assessment_id):
        connection.close()
        return jsonify({"error": "Assessment not found"}), 404

    connection.execute(
        "INSERT INTO checklist_items (assessment_id, text) VALUES (?, ?)",
        (assessment_id, text)
    )
    progress = update_progress(connection, assessment_id)
    connection.commit()
    connection.close()
    return jsonify({"message": "Step added", "progress": progress}), 201


@app.route("/api/checklist/<int:item_id>", methods=["PUT"])
def tick_checklist_item(item_id):
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401

    data = request.get_json()
    done = data.get("done")
    if not isinstance(done, bool):
        return jsonify({"error": "done must be true or false"}), 400

    connection = sqlite3.connect(DB_PATH)
    assessment_id = find_item_assessment(connection, item_id)
    if assessment_id is None:
        connection.close()
        return jsonify({"error": "Step not found"}), 404

    connection.execute("UPDATE checklist_items SET done = ? WHERE id = ?", (1 if done else 0, item_id))
    progress = update_progress(connection, assessment_id)
    connection.commit()
    connection.close()
    return jsonify({"message": "Step updated", "progress": progress})


@app.route("/api/checklist/<int:item_id>", methods=["DELETE"])
def delete_checklist_item(item_id):
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401

    connection = sqlite3.connect(DB_PATH)
    assessment_id = find_item_assessment(connection, item_id)
    if assessment_id is None:
        connection.close()
        return jsonify({"error": "Step not found"}), 404

    connection.execute("DELETE FROM checklist_items WHERE id = ?", (item_id,))
    progress = update_progress(connection, assessment_id)
    connection.commit()
    connection.close()
    return jsonify({"message": "Step deleted", "progress": progress})

if __name__ == "__main__":
    app.run(debug=True)
