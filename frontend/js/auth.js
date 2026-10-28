const usernameDisplay = document.getElementById("username-display");
const logoutButton = document.getElementById("logout-button");

async function showUsername() {
    const response = await fetch("/api/me");

    if (!response.ok) {
        window.location.href = "login.html";
        return;
    }

    const user = await response.json();
    usernameDisplay.textContent = user.username;
}

logoutButton.addEventListener("click", async function () {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "index.html";
});

showUsername();