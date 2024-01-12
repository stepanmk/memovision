/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter var', 'Sans-serif'],
            },
            backgroundImage: {
                'main-bg': "url('./assets/images/main_bg_lq.jpg')",
                'tacr-logo': 'url(./assets/images/tacr-small.png)',
                'tacr-logo-color': 'url(./assets/images/tacr-small-color.png)',
            },
        },
    },
    plugins: [],
};
