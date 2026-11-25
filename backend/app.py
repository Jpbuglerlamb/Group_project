import os
import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv
from datetime import date
from flask import Flask, jsonify, request, session, redirect
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__, static_folder="../frontend", static_url_path="")
app.secret_key = os.environ.get("SECRET_KEY", "dev-only-change-me")# reads backend/.env on your Mac; on Render the setting comes from the dashboard instead
load_dotenv()
DATABASE_URL = os.environ["DATABASE_URL"]


def connect():
    """Opens a connection to the Supabase database. Each row comes back as a dictionary."""
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


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
        WHERE assessments.id = %s AND subjects.user_id = %s
    """, (assessment_id, session["user_id"])).fetchone()
    return row is not None


def find_item_assessment(connection, item_id):
    """The assessment id a checklist step belongs to, or None if it isn't the logged-in user's."""
    row = connection.execute("""
        SELECT checklist_items.assessment_id FROM checklist_items
        JOIN assessments ON checklist_items.assessment_id = assessments.id
        JOIN subjects ON assessments.subject_id = subjects.id
        WHERE checklist_items.id = %s AND subjects.user_id = %s
    """, (item_id, session["user_id"])).fetchone()
    if row is None:
        return None
    return row["assessment_id"]


def update_progress(connection, assessment_id):
    """Works out progress from the ticked steps, saves it, and gives it back."""
    counts = connection.execute("""
        SELECT COUNT(*) AS total, COALESCE(SUM(done), 0) AS done
        FROM checklist_items WHERE assessment_id = %s
    """, (assessment_id,)).fetchone()
    total = counts["total"]
    done = counts["done"]

    if total == 0:
        progress = 0
    else:
        progress = round(done * 100 / total)

    connection.execute("UPDATE assessments SET progress = %s WHERE id = %s", (progress, assessment_id))
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

    connection = connect()
    try:
        new_user = connection.execute(
            "INSERT INTO users (username, full_name, phone, email, password_hash) VALUES (%s, %s, %s, %s, %s) RETURNING id",
            (data["username"], data["full_name"], data["phone"], data["email"], password_hash)
        ).fetchone()
        connection.commit()
    except psycopg.IntegrityError:
        connection.close()
        return jsonify({"error": "That username or email already exists"}), 409

    connection.close()

    # log the new user straight in, so they can go to home.html
    session["user_id"] = new_user["id"]
    session["username"] = data["username"]
    return jsonify({"message": "Account created"}), 201


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()

    connection = connect()
    user = connection.execute(
        "SELECT id, username, password_hash FROM users WHERE username = %s",
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

    connection = connect()
    user = connection.execute(
        "SELECT username, full_name FROM users WHERE id = %s",
        (session["user_id"],)
    ).fetchone()
    connection.close()

    return jsonify({"username": user["username"], "full_name": user["full_name"]})


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

    connection = connect()
    rows = connection.execute(
        "SELECT id, name FROM subjects WHERE semester_id = %s AND user_id = %s ORDER BY name",
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

    connection = connect()
    try:
        connection.execute(
            "INSERT INTO subjects (name, semester_id, user_id) VALUES (%s, %s, %s)",
            (name, data["semester_id"], session["user_id"])
        )
        connection.commit()
    except psycopg.IntegrityError:
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

    connection = connect()
    try:
        cursor = connection.execute(
            "UPDATE subjects SET name = %s WHERE id = %s AND user_id = %s",
            (name, subject_id, session["user_id"])
        )
        connection.commit()
    except psycopg.IntegrityError:
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

    connection = connect()
    subject = connection.execute(
        "SELECT id FROM subjects WHERE id = %s AND user_id = %s",
        (subject_id, session["user_id"])
    ).fetchone()
    if subject is None:
        connection.close()
        return jsonify({"error": "Class not found"}), 404

    # its assessments' steps go first of all, because they point at the assessments
    connection.execute(
        "DELETE FROM checklist_items WHERE assessment_id IN (SELECT id FROM assessments WHERE subject_id = %s)",
        (subject_id,))
    # then its assessments, because they point at the class (foreign key)
    connection.execute("DELETE FROM assessments WHERE subject_id = %s", (subject_id,))
    connection.execute("DELETE FROM subjects WHERE id = %s", (subject_id,))
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

    connection = connect()
    rows = connection.execute("""
        SELECT assessments.id, assessments.title, assessments.due_date, assessments.progress
        FROM assessments
        JOIN subjects ON assessments.subject_id = subjects.id
        WHERE subjects.id = %s AND subjects.user_id = %s
        ORDER BY assessments.due_date
    """, (subject_id, session["user_id"])).fetchall()
    connection.close()
    return jsonify([dict(row) for row in rows])

@app.route("/api/assessments")
def get_all_assessments():
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401

    connection = connect()
    rows = connection.execute("""
        SELECT assessments.id, assessments.title, assessments.due_date, assessments.progress, assessments.subject_id, subjects.semester_id, subjects.name AS class_name
        FROM assessments
        JOIN subjects ON assessments.subject_id = subjects.id
        WHERE subjects.user_id = %s
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

    connection = connect()
    subject = connection.execute(
        "SELECT id FROM subjects WHERE id = %s AND user_id = %s",
        (data.get("subject_id"), session["user_id"])
    ).fetchone()
    if subject is None:
        connection.close()
        return jsonify({"error": "Class not found"}), 404

    connection.execute(
        "INSERT INTO assessments (subject_id, title, due_date) VALUES (%s, %s, %s)",
        (subject["id"], title, due_date)
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

    connection = connect()
    # only change it if its class belongs to the logged-in user
    cursor = connection.execute("""
        UPDATE assessments SET title = %s, due_date = %s
        WHERE id = %s AND subject_id IN (SELECT id FROM subjects WHERE user_id = %s)
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

    connection = connect()
    if not owns_assessment(connection, assessment_id):
        connection.close()
        return jsonify({"error": "Assessment not found"}), 404

    connection.execute("DELETE FROM checklist_items WHERE assessment_id = %s", (assessment_id,))
    connection.execute("DELETE FROM assessments WHERE id = %s", (assessment_id,))
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

    connection = connect()
    if not owns_assessment(connection, assessment_id):
        connection.close()
        return jsonify({"error": "Assessment not found"}), 404

    rows = connection.execute(
        "SELECT id, text, done FROM checklist_items WHERE assessment_id = %s ORDER BY id",
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

    connection = connect()
    if not owns_assessment(connection, assessment_id):
        connection.close()
        return jsonify({"error": "Assessment not found"}), 404

    connection.execute(
        "INSERT INTO checklist_items (assessment_id, text) VALUES (%s, %s)",
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

    connection = connect()
    assessment_id = find_item_assessment(connection, item_id)
    if assessment_id is None:
        connection.close()
        return jsonify({"error": "Step not found"}), 404

    connection.execute("UPDATE checklist_items SET done = %s WHERE id = %s", (1 if done else 0, item_id))
    progress = update_progress(connection, assessment_id)
    connection.commit()
    connection.close()
    return jsonify({"message": "Step updated", "progress": progress})


@app.route("/api/checklist/<int:item_id>", methods=["DELETE"])
def delete_checklist_item(item_id):
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401

    connection = connect()
    assessment_id = find_item_assessment(connection, item_id)
    if assessment_id is None:
        connection.close()
        return jsonify({"error": "Step not found"}), 404

    connection.execute("DELETE FROM checklist_items WHERE id = %s", (item_id,))
    progress = update_progress(connection, assessment_id)
    connection.commit()
    connection.close()
    return jsonify({"message": "Step deleted", "progress": progress})

if __name__ == "__main__":
    app.run(debug=True)
