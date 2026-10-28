const signupForm = document.getElementById("signup-form");
const signupMessage = document.getElementById("signup-message");

signupForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    if (password !== confirmPassword) {
        signupMessage.textContent = "The passwords don't match";
        return;
    }

    const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username: document.getElementById("username").value,
            full_name: document.getElementById("fullname").value,
            phone: document.getElementById("phone").value,
            email: document.getElementById("email").value,
            password: password
        })
    });

    const result = await response.json();

    if (response.ok) {
        // the server has already logged the new user in
        window.location.href = "home.html";
    } else {
        signupMessage.textContent = result.error;
    }
});
