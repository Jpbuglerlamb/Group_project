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
function refreshCalendar () {
    if (typeof loadCalendarAssessments == "function") {
        loadCalendarAssessments()
    }
}
// =========================
// CONFIRM POP-UP
// =========================

const confirmDialog = document.getElementById("confirm-dialog");
const confirmText = document.getElementById("confirm-text");
const confirmOk = document.getElementById("confirm-ok");
const confirmCancel = document.getElementById("confirm-cancel");

// shows our own pop-up and waits for an answer: true for OK, false for Cancel or Escape
function askConfirm(message) {
    return new Promise(function (resolve) {
        confirmText.textContent = message;

        confirmOk.onclick = function () {
            confirmDialog.close("ok");
        };
        confirmCancel.onclick = function () {
            confirmDialog.close("cancel");
        };
        confirmDialog.onclose = function () {
            resolve(confirmDialog.returnValue === "ok");
        };

        confirmDialog.returnValue = "";
        confirmDialog.showModal();
    });
}
// =========================
// EDIT POP-UP
// =========================

const editDialog = document.getElementById("edit-dialog");
const editTitle = document.getElementById("edit-title");
const editDue = document.getElementById("edit-due");
const editCancel = document.getElementById("edit-cancel");

function askEdit(assessment) {
    return new Promise(function (resolve) {
        editTitle.value = assessment.title;
        editDue.value = assessment.due_date;

        editCancel.onclick = function () {
            editDialog.close("cancel");
        };
        editDialog.onclose = function () {
            if (editDialog.returnValue === "save") {
                resolve({ title: editTitle.value.trim(), due_date: editDue.value });
            } else {
                resolve(null);
            }
        };

        editDialog.returnValue = "";
        editDialog.showModal();
    });
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
    return loadClasses();
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
    refreshCalendar()
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
    return loadAssessments();
}

async function showAssessment(semesterNumber, classId, assessmentId) {
    await selectSemester(semesterNumber);
    await selectClass(classId);

    const card = document.getElementById("assessment-" + assessmentId);
    if (card === null) {
        return;
    }
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.classList.add("highlight");
    setTimeout(function () {
        card.classList.remove("highlight");
    }, 2000);
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
    if (!(await askConfirm(`Delete "${subject.name}" and all of its assessments?`))) {
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
    const submitButton = addClassForm.querySelector("button[type=submit]");
    submitButton.disabled = true;
    const result = await api.addClass(nameInput.value.trim(), currentSemester);
    submitButton.disabled = false;
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
    refreshCalendar()
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

// builds one assessment card: title, due date, progress bar, checklist and buttons
function buildAssessment(assessment) {
    const item = document.createElement("div");
    item.className = "assessment-item";
    item.id = "assessment-" + assessment.id;

    const title = document.createElement("h3");
    title.textContent = assessment.title;
    if (assessment.progress === 100) {
        title.textContent += " ✓ Done";
        item.classList.add("done");
    }

    const due = document.createElement("p");
    due.textContent = "Due: " + formatDate(assessment.due_date);

    // the bar
    const bar = document.createElement("div");
    bar.className = "progress-bar";
    const fill = document.createElement("div");
    fill.className = "progress";
    fill.style.width = assessment.progress + "%";
    bar.appendChild(fill);

    // the percentage, under the bar
    const percent = document.createElement("p");
    percent.className = "progress-text";
    percent.textContent = assessment.progress + "%";

    // the checklist: filled in by loadChecklist once the steps arrive
    const checklist = document.createElement("ul");
    checklist.className = "checklist";
    loadChecklist(assessment, checklist);

    // the box for adding a step
    const addStepForm = document.createElement("form");
    addStepForm.className = "add-step-form";

    const stepInput = document.createElement("input");
    stepInput.type = "text";
    stepInput.placeholder = "Add a step";
    stepInput.setAttribute("aria-label", "New step for " + assessment.title);

    const stepButton = document.createElement("button");
    stepButton.type = "submit";
    stepButton.textContent = "Add step";

    addStepForm.appendChild(stepInput);
    addStepForm.appendChild(stepButton);

    addStepForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        const result = await api.addChecklistItem(assessment.id, stepInput.value.trim());
        if (!result.ok) {
            assessmentMessage.textContent = result.error;
            return;
        }
        loadAssessments();
    });

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
    item.appendChild(percent);
    item.appendChild(checklist);
    item.appendChild(addStepForm);
    item.appendChild(actions);
    return item;
}
// gets one assessment's steps and puts them in its card's list
async function loadChecklist(assessment, checklist) {
    const result = await api.getChecklist(assessment.id);
    if (!result.ok) {
        assessmentMessage.textContent = result.error;
        return;
    }

    if (result.data.length === 0) {
        const empty = document.createElement("li");
        empty.className = "empty-message";
        empty.textContent = "Add the steps you need to finish this.";
        checklist.appendChild(empty);
        return;
    }

    result.data.forEach(function (step) {
        const row = document.createElement("li");

        // the tick box goes inside the label, so clicking the words ticks it too
        const label = document.createElement("label");
        const tick = document.createElement("input");
        tick.type = "checkbox";
        tick.checked = step.done;
        label.appendChild(tick);
        label.appendChild(document.createTextNode(" " + step.text));

        tick.addEventListener("change", async function () {
            const result = await api.tickChecklistItem(step.id, tick.checked);
            if (!result.ok) {
                tick.checked = !tick.checked;
                assessmentMessage.textContent = result.error;
                return;
            }
            loadAssessments();
        });

        row.appendChild(label);
        row.appendChild(makeButton("Remove", "small-button", async function () {
            const result = await api.deleteChecklistItem(step.id);
            if (!result.ok) {
                assessmentMessage.textContent = result.error;
                return;
            }
            loadAssessments();
        }));
        checklist.appendChild(row);
    });
}
async function editAssessment(assessment) {
    const changes = await askEdit(assessment);
    if (changes === null) {
        return;
    }

    assessment.title = changes.title;
    assessment.due_date = changes.due_date;
    const result = await api.updateAssessment(assessment);
    if (!result.ok) {
        assessmentMessage.textContent = result.error;
        return;
    }
    loadAssessments();
}

async function deleteAssessment(assessment) {
        if (!(await askConfirm(`Delete "${assessment.title}"?`))) {
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
    const submitButton = addAssessmentForm.querySelector("button[type=submit]");
    submitButton.disabled = true;     // can't be pressed again while waiting
    const result = await api.addAssessment(currentClassId, titleInput.value.trim(), dueInput.value);
    submitButton.disabled = false;    // answer received, so it can be used again
    if (!result.ok) {
        assessmentMessage.textContent = result.error;
        return;
    }

    titleInput.value = "";
    dueInput.value = "";
    loadAssessments();
});
