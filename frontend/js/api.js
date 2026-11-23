// Talks to the Flask server. Loaded by home.html (the real, logged-in planner).
// demo-api.js has the same functions for the public demo on index.html,
// so calendar.js works with either one without knowing which it has.

// Sends a request and always gives back { ok: true, data } or { ok: false, error }
async function request(url, method, body) {
    const options = { method: method };
    if (body !== undefined) {
        options.headers = { "Content-Type": "application/json" };
        options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    let result = {};
    try {
        result = await response.json();
    } catch (error) {
        // the answer wasn't JSON (for example an error page), so there's nothing to read
    }

    if (response.ok) {
        return { ok: true, data: result };
    }
    return { ok: false, error: result.error || "Something went wrong, please try again" };
}

const api = {
    getClasses: function (semester) {
        return request(`/api/semesters/${semester}/subjects`, "GET");
    },
    addClass: function (name, semester) {
        return request("/api/subjects", "POST", { name: name, semester_id: semester });
    },
    renameClass: function (classId, name) {
        return request(`/api/subjects/${classId}`, "PUT", { name: name });
    },
    deleteClass: function (classId) {
        return request(`/api/subjects/${classId}`, "DELETE");
    },
    getAssessments: function (classId) {
        return request(`/api/subjects/${classId}/assessments`, "GET");
    },
    getAllAssessments: function () {
        return request("/api/assessments", "GET");
    },
    addAssessment: function (classId, title, dueDate) {
        return request("/api/assessments", "POST", { subject_id: classId, title: title, due_date: dueDate });
    },
    updateAssessment: function (assessment) {
        return request(`/api/assessments/${assessment.id}`, "PUT", {
            title: assessment.title,
            due_date: assessment.due_date
        });
    },
    deleteAssessment: function (assessmentId) {
        return request(`/api/assessments/${assessmentId}`, "DELETE");
    },
        getChecklist: function (assessmentId) {
        return request(`/api/assessments/${assessmentId}/checklist`, "GET");
    },
    addChecklistItem: function (assessmentId, text) {
        return request(`/api/assessments/${assessmentId}/checklist`, "POST", { text: text });
    },
    tickChecklistItem: function (itemId, done) {
        return request(`/api/checklist/${itemId}`, "PUT", { done: done });
    },
    deleteChecklistItem: function (itemId) {
        return request(`/api/checklist/${itemId}`, "DELETE");
    }
};
