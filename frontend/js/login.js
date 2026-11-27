const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("login-message");

loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username: document.getElementById("username").value,
            password: document.getElementById("password").value
        })
    });

    // if the server crashed it sends an HTML error page, not JSON,
    // so reading it as JSON fails: show a message instead of doing nothing
    let result;
    try {
        result = await response.json();
    } catch (error) {
        loginMessage.textContent = "Something went wrong. Please try again in a minute.";
        return;
    }

    if (response.ok) {
        window.location.href = "home.html";
    } else {
        loginMessage.textContent = result.error;
    }
});