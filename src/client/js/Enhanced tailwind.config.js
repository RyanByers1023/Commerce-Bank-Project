/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/client/**/*.{html,js}",
        "./src/client/**/*.html",
        "./src/client/js/**/*.js"
    ],
    theme: {
        extend: {
            colors: {
                'primary': '#46C586',
                'primary-dark': '#2EF090',
                'secondary': '#4D705F',
                'tertiary': '#5E8A75',
                'background': '#28332D',
                'foreground': '#3A4F41',
            },
        },
    },
    plugins: [],
}