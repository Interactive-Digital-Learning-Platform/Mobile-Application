/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        alight: ["Author-Light", "sans-serif"],
        aregular: ["Author-Regular", "sans-serif"],
        amedium: ["Author-Medium", "sans-serif"],
        abold: ["Author-Bold", "sans-serif"],
        ablack: ["Author-Black", "sans-serif"],
        asemibold: ["Author-Semibold", "sans-serif"],
        aitalic: ["Author-Italic", "sans-serif"]
      },
    },
  },
  plugins: [],
}

