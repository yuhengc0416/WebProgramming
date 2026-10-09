/*
    Personal League Tracker theme switcher

    This script follows the class-example pattern:
    1. Find the theme button.
    2. Toggle a class on the body.
    3. Save the selected theme in localStorage.
    4. Restore the saved theme when another page loads.
*/

// Find the button used to switch themes.
const themeToggler = document.querySelector("#theme_toggler");

// Restore the saved theme from localStorage.
function retrieveTheme() {
    const savedTheme = localStorage.getItem("league_tracker_theme");

    if (savedTheme === "alternate") {
        document.body.classList.add("alternate-theme");
    } else {
        document.body.classList.remove("alternate-theme");
    }

    updateButtonText();
}

// Update the button label to show the theme the user can switch to.
function updateButtonText() {
    if (!themeToggler) return;

    if (document.body.classList.contains("alternate-theme")) {
        themeToggler.textContent = "Use Dark Theme";
    } else {
        themeToggler.textContent = "Use Light Theme";
    }
}

// Switch themes when the user clicks the button.
if (themeToggler) {
    themeToggler.addEventListener("click", function () {
        document.body.classList.toggle("alternate-theme");

        // Save the current choice so it stays active after reloads/page changes.
        if (document.body.classList.contains("alternate-theme")) {
            localStorage.setItem("league_tracker_theme", "alternate");
        } else {
            localStorage.setItem("league_tracker_theme", "default");
        }

        updateButtonText();
    });
}

// Synchronize the selected theme across multiple open tabs.
window.addEventListener("storage", function (event) {
    if (event.key === "league_tracker_theme") {
        retrieveTheme();
    }
});

// Apply the saved theme when the page loads.
retrieveTheme();
