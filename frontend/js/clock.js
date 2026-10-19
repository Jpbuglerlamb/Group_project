const time = document.getElementById("time");
const date = document.getElementById("date");
const rays = document.querySelectorAll(".clock-logo .rays line");

function updateClock() {
    const now = new Date();

    time.textContent = now.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit"
    });

    date.textContent = now.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long"
    });

    // light up the rays one by one as the minute goes by (8 rays = one every 7.5 seconds)
    const litCount = Math.floor(now.getSeconds() / (60 / rays.length)) + 1;
    rays.forEach((ray, i) => ray.classList.toggle("lit", i < litCount));
}

updateClock();
setInterval(updateClock, 1000);
