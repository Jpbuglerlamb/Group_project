# Study Planner

A website for students to keep track of their classes and assessments across the year.

Visitors can try a demo on the home page without an account. After signing up, each student gets their own planner, where they can add classes to each semester, add assessments with due dates, and track their progress on each one. Everything is saved in a database, and each student only ever sees their own work.

This is a Year 1 Team Working group project.

## Features

- **Public demo** (`index.html`): try the planner with example classes. Nothing is saved.
- **Accounts**: sign up, log in and log out. Passwords are hashed, never stored as plain text.
- **Classes**: add, rename and delete classes in semester 1 or semester 2.
- **Assessments**: add assessments with a due date, edit or delete them, and track progress with a slider and progress bar. Sorted by due date.
- **Logo clock**: the Study Planner logo shows the live time and date, and its rays light up as the seconds go by.

## Built with

| Part | Technology |
|---|---|
| Front end | HTML, CSS, JavaScript |
| Server | Python with [Flask](https://flask.palletsprojects.com/) |
| Database | SQLite |

## Getting started

You need **Python 3** installed.

1. **Open a terminal in the project folder** (`Group_project`).

2. **Create and switch on a virtual environment**, so Flask is installed for this project only:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```
   On Windows, use `.venv\Scripts\activate` instead of the `source` line.

3. **Install Flask:**
   ```bash
   pip install flask
   ```

4. **Create the database.** Run this from inside the `backend` folder, so the database file is made in the right place:
   ```bash
   cd backend
   python3 study.py
   ```

5. **Start the server** (still inside `backend`):
   ```bash
   python3 app.py
   ```

6. **Open the site** at **http://127.0.0.1:5000** in your browser.

Always open the site through this address. Opening the HTML files directly (double-clicking them) won't work, because the pages need the server to load and save data.

To stop the server, press **Ctrl+C** in its terminal.

## Project structure

```
Group_project/
├── backend/
│   ├── app.py             Flask server: serves the pages and the API routes
│   ├── study.py           Creates the database tables
│   └── study_planner.db   The SQLite database (made by study.py)
└── frontend/
    ├── index.html         Public home page with the demo
    ├── home.html          The logged-in planner
    ├── login.html
    ├── signup.html
    ├── css/style.css
    ├── images/
    └── js/
        ├── script.js      Draws the planner (used by index.html and home.html)
        ├── api.js         Talks to the server (home.html)
        ├── demo-api.js    Example data for the demo (index.html)
        ├── auth.js        Shows the username and handles logging out
        ├── login.js
        ├── signup.js
        └── clock.js       The logo clock
```

`api.js` and `demo-api.js` have the same functions, so `script.js` works with either one. That's how the demo and the real planner share the same code.

## Database design

The tables are linked by foreign keys in three one-to-many relationships:

- one **semester** has many **subjects** (classes)
- one **user** has many **subjects**
- one **subject** has many **assessments**

| Table | Columns | Notes |
|---|---|---|
| `semesters` | `id`, `number` | Semester 1 and 2, added by `study.py` |
| `users` | `id`, `username`, `full_name`, `phone`, `email`, `password_hash` | `username` and `email` are unique |
| `subjects` | `id`, `name`, `semester_id`, `user_id` | Foreign keys to `semesters` and `users`. A user can't have two classes with the same name: `UNIQUE (name, user_id)` |
| `assessments` | `id`, `subject_id`, `title`, `due_date`, `progress` | Foreign key to `subjects`. `progress` is 0 to 100 |

`assessments` has no `user_id` column: an assessment's owner is found through its class (assessment → subject → user). Storing it twice could let the two copies disagree, so each fact is stored in one place only (normalisation).

Dates are stored as text in the format `2026-11-14`, which sorts correctly in date order.

## API routes

All routes except sign-up and login need you to be logged in. They only ever show or change the logged-in user's own classes and assessments.

| Method | Address | What it does |
|---|---|---|
| POST | `/api/signup` | Create an account (and log in) |
| POST | `/api/login` | Log in |
| POST | `/api/logout` | Log out |
| GET | `/api/me` | Who is logged in |
| GET | `/api/semesters/1/subjects` | Your classes in semester 1 (or 2) |
| POST | `/api/subjects` | Add a class |
| PUT | `/api/subjects/3` | Rename class 3 |
| DELETE | `/api/subjects/3` | Delete class 3 and its assessments |
| GET | `/api/subjects/3/assessments` | The assessments in class 3 |
| POST | `/api/assessments` | Add an assessment |
| PUT | `/api/assessments/2` | Change assessment 2's title, due date or progress |
| DELETE | `/api/assessments/2` | Delete assessment 2 |

The pages `/` (the demo) and `/home.html` (the planner, logged-in users only) are also served by Flask.

## Security

- **Passwords are hashed** with Werkzeug's `generate_password_hash`, so the real password is never stored.
- **Sessions:** Flask keeps track of who is logged in with a signed cookie, so it can't be faked.
- **SQL injection:** every query uses `?` placeholders instead of adding user input to the SQL text.
- **Ownership checks:** the server checks that a class or assessment belongs to the logged-in user before showing or changing it. The user's id always comes from the session, never from the browser.
- **XSS (cross-site scripting):** anything a user types is put on the page with `textContent`, so it's always shown as text and never run as code.
- Login gives the same message for a wrong username and a wrong password, so it doesn't reveal which usernames exist.

**Before putting this online:** set a real secret key with the `SECRET_KEY` environment variable. The fallback key written in `app.py` is only for testing on your own computer.

## Still to do

- Proper edit forms for renaming classes and editing assessments (they currently use pop-up boxes)
- The About, Resources and Contact pages
- Design and styling improvements
- Letting a signed-in user open their planner from the public home page

## Team

- Joan Lamb
- Fakhria Sharifi
- 
