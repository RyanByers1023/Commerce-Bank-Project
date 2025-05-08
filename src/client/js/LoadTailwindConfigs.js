document.addEventListener('DOMContentLoaded', function() {
    // Check if Tailwind CSS is loaded
    const isTailwindLoaded = () => {
        // Create a test element with a Tailwind class
        const testElement = document.createElement('div');
        testElement.classList.add('hidden');
        document.body.appendChild(testElement);

        // Get computed style
        const computedStyle = window.getComputedStyle(testElement);
        const isHidden = computedStyle.display === 'none';

        // Clean up
        document.body.removeChild(testElement);

        return isHidden;
    };

    // If Tailwind isn't loaded, try to reload the stylesheet
    if (!isTailwindLoaded()) {
        console.warn('Tailwind CSS might not be properly loaded. Attempting to reload stylesheet...');

        // Force reload the CSS
        const existingLink = document.querySelector('link[href*="styles.css"]');
        if (existingLink) {
            // Add a cache-busting parameter
            const href = existingLink.getAttribute('href');
            existingLink.setAttribute('href', href + '?t=' + new Date().getTime());
        } else {
            // Create new link if none exists
            const newLink = document.createElement('link');
            newLink.rel = 'stylesheet';
            newLink.href = './css/styles.css?t=' + new Date().getTime();
            document.head.appendChild(newLink);
        }
    } else {
        console.log('Tailwind CSS loaded successfully');
    }
});