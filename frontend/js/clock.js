const time = document.getElementById("time");
const date = document.getElementById("date");

function updateClock() {
    const now = new Date();

    time.textContent = now.toLocaleTimeString("en-GB");

    date.textContent = now.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long"
    });
}

updateClock();
setInterval(updateClock, 1000);