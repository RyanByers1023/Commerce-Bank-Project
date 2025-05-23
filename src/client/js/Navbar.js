// Function to load the navbar into any page
function loadNavbar() {
    fetch("navbar.html")
        .then(response => response.text())
        .then(data => {
            document.getElementById("navbar-container").innerHTML = data;
        })
        .catch(error => console.error("Error loading navbar:", error));
}

// Load the navbar when the page loads
window.onload = loadNavbar;