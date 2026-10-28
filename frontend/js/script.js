const semester1 = document.getElementById("semester1");
const semester2 = document.getElementById("semester2");
const classList = document.querySelector(".class-list");
const assessmentList = document.querySelector(".assessment-list");
const addClassForm = document.getElementById("add-class-form");
const addAssessmentForm = document.getElementById("add-assessment-form");
const classMessage = document.getElementById("class-message");
const assessmentMessage = document.getElementById("assessment-message");
let currentSemester = null;
let currentClassId = null;

function formatDate(isoDate) {
    if (!isoDate) {
        return "No due date";
    }
    const parts = isoDate.split("-");
    const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function makeButton(text, className, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = text;
    button.className = className;
    button.addEventListener("click", onClick);
    return button;
}

// =========================
// SEMESTERS
// =========================

function selectSemester(semesterNumber) {
    semester1.classList.toggle("selected", semesterNumber === 1);
    semester2.classList.toggle("selected", semesterNumber === 2);

    currentSemester = semesterNumber;
    currentClassId = null;
    assessmentList.innerHTML = "";
    assessmentMessage.textContent = "";
    loadClasses();
}

semester1.addEventListener("click", function () {
    selectSemester(1);
});

semester2.addEventListener("click", function () {
    selectSemester(2);
});

// =========================
// CLASSES
// =========================

async function loadClasses() {
    classMessage.textContent = "";
    const result = await api.getClasses(currentSemester);
    classList.innerHTML = "";
    if (!result.ok) {
        classMessage.textContent = result.error;
        return;
    }
    result.data.forEach(function (subject) {
        const row = document.createElement("div");
        row.className = "class-row";
        const selectButton = makeButton(subject.name, "class-button", function () {
            selectClass(subject.id);
        });
        selectButton.dataset.id = subject.id;
        if (subject.id === currentClassId) {
            selectButton.classList.add("selected");
        }
        row.appendChild(selectButton);
        row.appendChild(makeButton("Rename", "small-button", function () {
            renameClass(subject);
        }));
        row.appendChild(makeButton("Delete", "small-button", function () {
            deleteClass(subject);
        }));
        classList.appendChild(row);
    });
}

function selectClass(classId) {
    currentClassId = classId;
    classList.querySelectorAll(".class-button").forEach(function (button) {
        button.classList.toggle("selected", Number(button.dataset.id) === classId);
    });
    loadAssessments();
}

async function renameClass(subject) {
    const newName = prompt("New name for this class:", subject.name);
    if (newName === null || newName.trim() === "") {
        return;
    }
    const result = await api.renameClass(subject.id, newName.trim());
    if (!result.ok) {
        classMessage.textContent = result.error;
        return;
    }
    loadClasses();
}

async function deleteClass(subject) {
    if (!confirm(`Delete "${subject.name}" and all of its assessments?`)) {
        return;
    }
    const result = await api.deleteClass(subject.id);
    if (!result.ok) {
        classMessage.textContent = result.error;
        return;
    }
    if (subject.id === currentClassId) {
        currentClassId = null;
        assessmentList.innerHTML = "";
    }
    loadClasses();
}

addClassForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (currentSemester === null) {
        classMessage.textContent = "Pick a semester first";
        return;
    }
    const nameInput = document.getElementById("class-name");
    const result = await api.addClass(nameInput.value.trim(), currentSemester);
    if (!result.ok) {
        classMessage.textContent = result.error;
        return;
    }
    nameInput.value = "";
    loadClasses();
});

// =========================
// ASSESSMENTS
// =========================

// gets the selected class's assessments and shows them
async function loadAssessments() {
    assessmentMessage.textContent = "";
    const result = await api.getAssessments(currentClassId);

    assessmentList.innerHTML = "";
    if (!result.ok) {
        assessmentMessage.textContent = result.error;
        return;
    }

    if (result.data.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-message";
        empty.textContent = "No assessments for this class yet.";
        assessmentList.appendChild(empty);
        return;
    }

    result.data.forEach(function (assessment) {
        assessmentList.appendChild(buildAssessment(assessment));
    });
}

// builds one assessment card: title, due date, progress bar, slider and buttons
function buildAssessment(assessment) {
    const item = document.createElement("div");
    item.className = "assessment-item";

    const title = document.createElement("h3");
    title.textContent = assessment.title;

    const due = document.createElement("p");
    due.textContent = "Due: " + formatDate(assessment.due_date);

    // the bar
    const bar = document.createElement("div");
    bar.className = "progress-bar";
    const fill = document.createElement("div");
    fill.className = "progress";
    fill.style.width = assessment.progress + "%";
    bar.appendChild(fill);

    // the slider to change it
    const control = document.createElement("div");
    control.className = "progress-control";

    const sliderId = "progress-" + assessment.id;
    const label = document.createElement("label");
    label.htmlFor = sliderId;
    label.textContent = "Progress";

    const slider = document.createElement("input");
    slider.type = "range";
    slider.id = sliderId;
    slider.min = 0;
    slider.max = 100;
    slider.step = 5;
    slider.value = assessment.progress;

    const percent = document.createElement("span");
    percent.textContent = assessment.progress + "%";

    // "input" happens while dragging: move the bar straight away
    slider.addEventListener("input", function () {
        fill.style.width = slider.value + "%";
        percent.textContent = slider.value + "%";
    });

    // "change" happens when you let go: save it
    slider.addEventListener("change", async function () {
        assessment.progress = Number(slider.value);
        const result = await api.updateAssessment(assessment);
        if (!result.ok) {
            assessmentMessage.textContent = result.error;
            loadAssessments();
        }
    });

    control.appendChild(label);
    control.appendChild(slider);
    control.appendChild(percent);

    // the buttons
    const actions = document.createElement("div");
    actions.className = "assessment-actions";
    actions.appendChild(makeButton("Edit", "small-button", function () {
        editAssessment(assessment);
    }));
    actions.appendChild(makeButton("Delete", "small-button", function () {
        deleteAssessment(assessment);
    }));

    item.appendChild(title);
    item.appendChild(due);
    item.appendChild(bar);
    item.appendChild(control);
    item.appendChild(actions);
    return item;
}

async function editAssessment(assessment) {
    const newTitle = prompt("Assessment title:", assessment.title);
    if (newTitle === null || newTitle.trim() === "") {
        return;
    }

    const newDue = prompt("Due date (write it like 2026-11-14):", assessment.due_date);
    if (newDue === null) {
        return;
    }

    assessment.title = newTitle.trim();
    assessment.due_date = newDue.trim();
    const result = await api.updateAssessment(assessment);
    if (!result.ok) {
        assessmentMessage.textContent = result.error;
    }
    loadAssessments();
}

async function deleteAssessment(assessment) {
    if (!confirm(`Delete "${assessment.title}"?`)) {
        return;
    }

    const result = await api.deleteAssessment(assessment.id);
    if (!result.ok) {
        assessmentMessage.textContent = result.error;
        return;
    }
    loadAssessments();
}

addAssessmentForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (currentClassId === null) {
        assessmentMessage.textContent = "Pick a class first";
        return;
    }

    const titleInput = document.getElementById("assessment-title");
    const dueInput = document.getElementById("assessment-due");
    const result = await api.addAssessment(currentClassId, titleInput.value.trim(), dueInput.value);
    if (!result.ok) {
        assessmentMessage.textContent = result.error;
        return;
    }

    titleInput.value = "";
    dueInput.value = "";
    loadAssessments();
});
