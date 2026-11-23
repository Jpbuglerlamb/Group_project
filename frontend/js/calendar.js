const calendar = document.querySelector(".calendar"),
  monthLabel = document.querySelector(".date"),
  daysContainer = document.querySelector(".days"),
  prev = document.querySelector(".prev"),
  next = document.querySelector(".next"),
  todayBtn = document.querySelector(".today-btn"),
  gotoBtn = document.querySelector(".goto-btn"),
  dateInput = document.querySelector(".date-input"),
  
  eventDay = document.querySelector(".event-day"),
  eventDate = document.querySelector(".event-date"),
  eventsContainer = document.querySelector(".events");

let today = new Date();
let activeDay;
let month = today.getMonth();
let year = today.getFullYear();

let assignmentsArr = [];

const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
];

function initCalendar() {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const prevLastDay = new Date(year, month, 0);
    const prevDays = prevLastDay.getDate();
    const lastDate = lastDay.getDate();
    const day = firstDay.getDay();
    const nextDays = 7 - lastDay.getDay() - 1;

    monthLabel.innerHTML = months[month] + " " + year;

    let days = "";

    for(let x = day; x > 0; x--) {
        days += `<div class="day prev-date" >${prevDays - x + 1}</div>`;
    }
    
    for (let i = 1; i <= lastDate; i++) {
        let hasAssignment = false;
        assignmentsArr.forEach((obj) => {
            if (obj.day === i && obj.month === month && obj.year === year) {
                hasAssignment = true;
            }
        });

        let classes = "day";
        if (i === new Date().getDate() && year === new Date().getFullYear() && month === new Date().getMonth()) {
            classes += " today";
        }
        
        
        if (i === activeDay) {
            classes += " active";
        }
        
        if (hasAssignment) {
            classes += " assignment"; 
        }

        
        days += `<div class="${classes}" data-day="${i}">${i}</div>`;
    }

    for (let j = 1; j <= nextDays; j++){
        days += `<div class="day " >${j}</div>`;
    }

    daysContainer.innerHTML = days;
}

initCalendar();

function prevMonth() {
    month--;
    if (month < 0) {
        month = 11;
        year--;
    }
    initCalendar();
    updateAssignmentsSidebar();
}

function nextMonth() {
    month++;
    if (month > 11) {
        month = 0;
        year++;
    }
    initCalendar();
    updateAssignmentsSidebar();
}

prev.addEventListener("click", prevMonth);
next.addEventListener("click", nextMonth);

todayBtn.addEventListener("click", () => {
    today = new Date();
    month = today.getMonth();
    year = today.getFullYear();
    activeDay = today.getDate();
    initCalendar();
    updateAssignmentsSidebar();
});

dateInput.addEventListener("input", (e) => {
    if (e.inputType === "deleteContentBackward") {
        if (dateInput.value.length === 3) {
            dateInput.value = dateInput.value.slice(0, 2);
        }
    }

    let cleaned = dateInput.value.replace(/[^0-9]/g, "");

    if (cleaned.length >= 2) {
        dateInput.value = cleaned.slice(0, 2) + "/" + cleaned.slice(2, 6);
    } else {
        dateInput.value = cleaned;
    }
});

gotoBtn.addEventListener("click", gotoDate);

function gotoDate() {
    const dateArr = dateInput.value.split("/");
    console.log(dateArr);
    if (dateArr.length === 2) {
        if (dateArr[0] > 0 && dateArr[0] < 13 && dateArr[1].length === 4) {
            month = dateArr[0] - 1;
            year = parseInt(dateArr[1]);
            activeDay = 1; 
            initCalendar();
            updateAssignmentsSidebar();
            return;
        }
    }
    alert("invalid date");
}



// fills the right-hand panel with every assessment due in the month on screen
function updateAssignmentsSidebar() {
    // heading: the month and year, e.g. "November" and "2026"
    eventDay.textContent = months[month];
    eventDate.textContent = year;

    // the days in this month that have assessments, in date order
    const daysThisMonth = assignmentsArr
        .filter((obj) => obj.month === month && obj.year === year)
        .sort((a, b) => a.day - b.day);

    // empty the panel before filling it again
    eventsContainer.innerHTML = "";

    if (daysThisMonth.length === 0) {
        const empty = document.createElement("div");
        empty.className = "no-event";
        empty.textContent = "Nothing due this month";
        eventsContainer.appendChild(empty);
        return;
    }

    daysThisMonth.forEach((obj) => {
        // short day name, e.g. "Thu"
        const dayName = new Date(year, month, obj.day).toLocaleDateString("en-GB", { weekday: "short" });

        obj.assignments.forEach((task) => {
            const item = document.createElement("div");
            item.className = "event";
            if (obj.day === activeDay) {
                item.classList.add("selected-day");
            }

            const title = document.createElement("div");
            title.className = "title";
            title.textContent = dayName + " " + obj.day + " – " + task.label;

            if (task.done) {
                item.classList.add("done");
                title.textContent += " ✓ Done";
            }
            item.addEventListener("click", () => {
                if (typeof showAssessment == "function") {
                    showAssessment(task.semester, task.classId, task.id);
                }
            });
            item.appendChild(title);
            eventsContainer.appendChild(item);
        });
    });
}
// clicking a day selects it, and its assessments stand out in the month list
daysContainer.addEventListener("click", (e) => {
    const dayBox = e.target.closest(".day");
    if (dayBox === null || !dayBox.dataset.day) {
        return;
    }
    activeDay = Number(dayBox.dataset.day);
    initCalendar();
    updateAssignmentsSidebar();
});


activeDay = today.getDate();
updateAssignmentsSidebar();

// gets every assessment from the planner and puts it on the calendar
async function loadCalendarAssessments() {
    const result = await api.getAllAssessments();
    if (!result.ok) {
        return;
    }

    assignmentsArr = [];
    result.data.forEach((assessment) => {
        const parts = assessment.due_date.split("-");
        const dueYear = Number(parts[0]);
        const dueMonth = Number(parts[1]) - 1;
        const dueDay = Number(parts[2]);
        const task = {
            label: assessment.class_name + ": " + assessment.title,
            done: assessment.progress === 100,
            id: assessment.id,
            classId: assessment.subject_id,
            semester: assessment.semester_id
        };

        let dayFound = false;
        assignmentsArr.forEach((obj) => {
            if (obj.day === dueDay && obj.month === dueMonth && obj.year === dueYear) {
                obj.assignments.push(task);
                dayFound = true;
            }
        });

        if (!dayFound) {
            assignmentsArr.push({ day: dueDay, month: dueMonth, year: dueYear, assignments: [task] });
        }
    });

    initCalendar();
    updateAssignmentsSidebar();
}

loadCalendarAssessments();
