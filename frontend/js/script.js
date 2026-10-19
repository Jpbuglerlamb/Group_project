const semester1 = document.getElementById("semester1");
const semester2 = document.getElementById("semester2");
const classList = document.querySelector(".class-list");
const assessmentList = document.querySelector(".assessment-list");
const semester1Classes = [
    "Web Development",
    "Team Working",
    "Data",
    "Programming",
    "Professionalism and Ethics"
];
const semester2Classes = [
    "Graded Unit",
    "Group project",
    "Final Exam",
    "computing",
]
const assessments = {
    "Web Development": [
        "Website Development Project",
        "HTML/CSS Assessment"
    ],
    "Team Working": [
        "Team Project",
        "Teamwork Report"
    ],
    "Data": [
        "Database Assessment",
        "SQL Assessment"
    ]
};

semester1.addEventListener("click", function () {
    semester1.classList.add("selected");
    semester2.classList.remove("selected");
    classList.innerHTML = "";
    semester1Classes.forEach(function (subject) {
        classList.innerHTML += `<button>${subject}</button>`;
    });
});

semester2.addEventListener("click", function () {
    semester2.classList.add("selected");
    semester1.classList.remove("selected");
    classList.innerHTML = "";
    semester2Classes.forEach(function (subject) {
        classList.innerHTML += `<button>${subject}</button>`;
    });
})

classList.addEventListener("click", function (event) {
    const selectedClass = event.target.textContent;
    const selectedAssessments = assessments[selectedClass];
    assessmentList.innerHTML = "";
    selectedAssessments.forEach(function (assessment) {
        assessmentList.innerHTML += `
            <div class="assessment-item">
                <h3>${assessment}</h3>
            </div>
        `;
    })
    console.log(selectedClass);
    console.log(assessments[selectedClass]);
})