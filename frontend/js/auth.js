const usernameDisplay = document.getElementById("username-display");
const logoutButton = document.getElementById("logout-button");
let loggedIn = false;

// Anyone can view the pages that use this file. Logged-in users see their name
// and a Log out button; everyone else sees a Login/Signup button instead.
// (home.html is still private: app.py sends logged-out visitors to the login page.)
async function showUsername() {
    const response = await fetch("/api/me");

    if (!response.ok) {
        logoutButton.textContent = "Login/Signup";
        return;
    }

    const user = await response.json();
    usernameDisplay.textContent = user.username;

    // home.html has a welcome heading; the other pages don't, so check first
    const welcome = document.getElementById("welcome-message");
    if (welcome !== null) {
        const firstName = user.full_name.split(" ")[0];
        welcome.textContent = "Welcome back, " + firstName + "!";
        setTimeout(function () {
            welcome.classList.add("hide");
        }, 10000);
    }
    loggedIn = true;

    // signed in: links to the public home page go to your planner instead
    document.querySelectorAll('a[href="index.html"]').forEach(function (link) {
        link.href = "home.html";
    });
}

logoutButton.addEventListener("click", async function () {
    if (!loggedIn) {
        window.location.href = "login.html";
        return;
    }
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "index.html";
});

showUsername();
