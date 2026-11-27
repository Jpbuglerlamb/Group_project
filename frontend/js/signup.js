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

    let result;
    try {
        result = await response.json();
    } catch (error) {
        signupMessage.textContent = "Something went wrong. Please try again in a minute.";
        return;
    }

    if (response.ok) {
        // the server has already logged the new user in
        window.location.href = "home.html";
    } else {
        signupMessage.textContent = result.error;
    }
});
