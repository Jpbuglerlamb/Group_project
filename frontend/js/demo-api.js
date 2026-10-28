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

let nextClassId = 6;
let nextAssessmentId = 6;

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
        assessment.progress = changed.progress;
        return demoSuccess({});
    },

    deleteAssessment: async function (assessmentId) {
        const index = demoAssessments.findIndex(function (assessment) {
            return assessment.id === assessmentId;
        });
        if (index === -1) {
            return demoError("Assessment not found");
        }
        demoAssessments.splice(index, 1);
        return demoSuccess({});
    }
};
