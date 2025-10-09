// /** @type {import('tailwindcss').Config} */
// module.exports = {
//     mode: "jit",
//     content: ["./src/**/*.{tsx,html}", "./node_modules/@radix-ui/themes/**/*.{js,ts,jsx,tsx}"],
//     darkMode: "media",
//     prefix: "",
//     theme: {
//         extend: {},
//     },
//     plugins: [],
// }
//

const {
    blackA,
    violet,
    mauve,
    grassA,
    amberA,
    grayA,
    irisA,
} = require('@radix-ui/colors');

/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/**/*.{jsx,tsx,html}',
        './node_modules/@radix-ui/themes/**/*.{js,ts,jsx,tsx}', // Add Radix UI themes
    ],
    darkMode: 'class', // Use class-based dark mode
    theme: {
        extend: {
            colors: {
                ...blackA,
                ...grayA,
                ...irisA,
                ...violet,
                ...mauve,
                ...grassA,
                ...amberA,
                primary: {
                    50: '#f0f9ff',
                    100: '#e0f2fe',
                    200: '#bae6fd',
                    300: '#7dd3fc',
                    400: '#38bdf8',
                    500: '#0ea5e9',
                    600: '#0284c7',
                    700: '#0369a1',
                    800: '#075985',
                    900: '#0c4a6e',
                },
            },
            fontFamily: {
                sans: ['Inter var', 'sans-serif'],
            },
        },
    },
};
