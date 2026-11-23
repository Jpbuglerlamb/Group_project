// A pretend version of api.js for the public demo on index.html.
// It has the same functions and gives back the same kind of answers,
// but keeps everything in these lists instead of the database.
// Nothing is saved: reloading the page puts the example data back.

const demoClasses = [
    { id: 1, name: "Web Development", semester: 1 },
    { id: 2, name: "Data", semester: 1 },
    { id: 3, name: "Team Working", semester: 1 },
    { id: 4, name: "Graded Unit", semester: 2 },
    { id: 5, name: "Group Project", semester: 2 }
];

const demoAssessments = [
    { id: 1, classId: 1, title: "Website Development Project", due_date: "2026-11-12", progress: 70 },
    { id: 2, classId: 1, title: "HTML/CSS Assessment", due_date: "2026-12-04", progress: 40 },
    { id: 3, classId: 2, title: "SQL Assessment", due_date: "2026-11-20", progress: 20 },
    { id: 4, classId: 3, title: "Teamwork Report", due_date: "2026-12-11", progress: 0 },
    { id: 5, classId: 5, title: "Project Presentation", due_date: "2027-03-18", progress: 10 }
];
// example steps: each assessment's progress is worked out from these
const demoChecklist = [
    { id: 1, assessmentId: 1, text: "Plan the site map", done: true },
    { id: 2, assessmentId: 1, text: "Build the pages", done: true },
    { id: 3, assessmentId: 1, text: "Add the CSS", done: true },
    { id: 4, assessmentId: 1, text: "Test on a phone", done: false },
    { id: 5, assessmentId: 1, text: "Submit", done: false },
    { id: 6, assessmentId: 2, text: "Revise notes", done: true },
    { id: 7, assessmentId: 2, text: "Practice questions", done: false },
    { id: 8, assessmentId: 2, text: "Sit the assessment", done: false },
    { id: 9, assessmentId: 3, text: "Revise JOINs", done: true },
    { id: 10, assessmentId: 3, text: "Practice queries", done: false },
    { id: 11, assessmentId: 4, text: "Write the introduction", done: false },
    { id: 12, assessmentId: 4, text: "Collect evidence", done: false }
];

let nextClassId = 6;
let nextAssessmentId = 6;
let nextChecklistId = 13;

// works out an assessment's progress from its ticked steps (same as update_progress in app.py)
function demoUpdateProgress(assessmentId) {
    const steps = demoChecklist.filter(function (step) {
        return step.assessmentId === assessmentId;
    });
    const ticked = steps.filter(function (step) {
        return step.done;
    }).length;

    let progress = 0;
    if (steps.length > 0) {
        progress = Math.round(ticked * 100 / steps.length);
    }

    const assessment = demoAssessments.find(function (item) {
        return item.id === assessmentId;
    });
    if (assessment !== undefined) {
        assessment.progress = progress;
    }
    return progress;
}

// removes all of one assessment's steps (when the assessment or its class is deleted)
function removeDemoSteps(assessmentId) {
    for (let i = demoChecklist.length - 1; i >= 0; i--) {
        if (demoChecklist[i].assessmentId === assessmentId) {
            demoChecklist.splice(i, 1);
        }
    }
}

// make the example progress match the example steps
demoAssessments.forEach(function (assessment) {
    demoUpdateProgress(assessment.id);
});

function demoSuccess(data) {
    return { ok: true, data: data };
}

function demoError(message) {
    return { ok: false, error: message };
}

function findDemoClass(classId) {
    return demoClasses.find(function (demoClass) {
        return demoClass.id === classId;
    });
}

function classNameTaken(name, ignoreId) {
    return demoClasses.some(function (demoClass) {
        return demoClass.name === name && demoClass.id !== ignoreId;
    });
}

const api = {
    getClasses: async function (semester) {
        const classes = demoClasses
            .filter(function (demoClass) { return demoClass.semester === semester; })
            .map(function (demoClass) { return { id: demoClass.id, name: demoClass.name }; });
        classes.sort(function (a, b) { return a.name.localeCompare(b.name); });
        return demoSuccess(classes);
    },

    addClass: async function (name, semester) {
        if (name === "") {
            return demoError("Please type a class name");
        }
        if (classNameTaken(name, null)) {
            return demoError("You already have a class with that name");
        }
        demoClasses.push({ id: nextClassId, name: name, semester: semester });
        nextClassId = nextClassId + 1;
        return demoSuccess({});
    },

    renameClass: async function (classId, name) {
        const demoClass = findDemoClass(classId);
        if (demoClass === undefined) {
            return demoError("Class not found");
        }
        if (classNameTaken(name, classId)) {
            return demoError("You already have a class with that name");
        }
        demoClass.name = name;
        return demoSuccess({});
    },

    deleteClass: async function (classId) {
        const classIndex = demoClasses.findIndex(function (demoClass) {
            return demoClass.id === classId;
        });
        if (classIndex === -1) {
            return demoError("Class not found");
        }
        demoClasses.splice(classIndex, 1);

        // remove its assessments too, working backwards so removing one doesn't skip the next
        for (let i = demoAssessments.length - 1; i >= 0; i--) {
            if (demoAssessments[i].classId === classId) {
                removeDemoSteps(demoAssessments[i].id);
                demoAssessments.splice(i, 1);
            }
        }
        return demoSuccess({});
    },

    getAssessments: async function (classId) {
        const assessments = demoAssessments
            .filter(function (assessment) { return assessment.classId === classId; })
            .map(function (assessment) {
                return {
                    id: assessment.id,
                    title: assessment.title,
                    due_date: assessment.due_date,
                    progress: assessment.progress
                };
            });
        assessments.sort(function (a, b) { return a.due_date.localeCompare(b.due_date); });
        return demoSuccess(assessments);
    },

    addAssessment: async function (classId, title, dueDate) {
        if (title === "") {
            return demoError("Please type a title");
        }
        if (dueDate === "") {
            return demoError("Please pick a due date");
        }
        demoAssessments.push({ id: nextAssessmentId, classId: classId, title: title, due_date: dueDate, progress: 0 });
        nextAssessmentId = nextAssessmentId + 1;
        return demoSuccess({});
    },

    updateAssessment: async function (changed) {
        const assessment = demoAssessments.find(function (item) {
            return item.id === changed.id;
        });
        if (assessment === undefined) {
            return demoError("Assessment not found");
        }
        assessment.title = changed.title;
        assessment.due_date = changed.due_date;
        return demoSuccess({});
    },

    deleteAssessment: async function (assessmentId) {
        const index = demoAssessments.findIndex(function (assessment) {
            return assessment.id === assessmentId;
        });
        if (index === -1) {
            return demoError("Assessment not found");
        }
        removeDemoSteps(assessmentId);
        demoAssessments.splice(index, 1);
        return demoSuccess({});
    },
    getAllAssessments: async function () {
        const assessments = demoAssessments.map(function (assessment) {
            return {
                id: assessment.id,
                title: assessment.title,
                due_date: assessment.due_date,
                progress: assessment.progress,
                class_name: findDemoClass(assessment.classId).name,
                subject_id: assessment.classId,
                semester_id: findDemoClass(assessment.classId).semester
            };
        });
        assessments.sort(function (a, b) { return a.due_date.localeCompare(b.due_date); });
        return demoSuccess(assessments);
    },
    getChecklist: async function (assessmentId) {
        const steps = demoChecklist
            .filter(function (step) { return step.assessmentId === assessmentId; })
            .map(function (step) { return { id: step.id, text: step.text, done: step.done }; });
        return demoSuccess(steps);
    },

    addChecklistItem: async function (assessmentId, text) {
        if (text === "") {
            return demoError("Please type a step");
        }
        demoChecklist.push({ id: nextChecklistId, assessmentId: assessmentId, text: text, done: false });
        nextChecklistId = nextChecklistId + 1;
        return demoSuccess({ progress: demoUpdateProgress(assessmentId) });
    },

    tickChecklistItem: async function (itemId, done) {
        const step = demoChecklist.find(function (item) {
            return item.id === itemId;
        });
        if (step === undefined) {
            return demoError("Step not found");
        }
        step.done = done;
        return demoSuccess({ progress: demoUpdateProgress(step.assessmentId) });
    },

    deleteChecklistItem: async function (itemId) {
        const index = demoChecklist.findIndex(function (item) {
            return item.id === itemId;
        });
        if (index === -1) {
            return demoError("Step not found");
        }
        const assessmentId = demoChecklist[index].assessmentId;
        demoChecklist.splice(index, 1);
        return demoSuccess({ progress: demoUpdateProgress(assessmentId) });
    }
};
