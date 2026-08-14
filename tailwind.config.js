/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./screens/**/*.{js,jsx,ts,tsx}",
    "./constants/**/*.{js,jsx,ts,tsx}",   // ← picks up quizStyles.ts class strings
  ],
  presets: [require("nativewind/preset")],
  safelist: [
    // Difficulty badge colours
    "bg-emerald-100", "text-emerald-700", "bg-emerald-500", "border-emerald-500",
    "bg-amber-100",   "text-amber-700",   "bg-amber-500",   "border-amber-500",
    "bg-rose-100",    "text-rose-700",    "bg-rose-500",    "border-rose-500",
    // Results hero card backgrounds (score tiers)
    "bg-slate-700",   // Timeout
    "bg-amber-500",   // ≥ 90% Outstanding
    "bg-emerald-600", // ≥ 70% Great Job
    "bg-blue-600",    // ≥ 50% Not Bad
    "bg-rose-600",    // < 50% Keep Trying
  ],
  theme: {
    extend: {
      colors: {
        primaryBlack: "#0F172A",
        borderColorLight: "#E3E1E1",
        primary: {
          DEFAULT: "#FC6E20",
          50:  "#FFF3EC",
          100: "#FFE4CF",
          200: "#FFCCA8",
          300: "#FFA87A",
          400: "#FF8C50",
          500: "#FC6E20",
          600: "#E55B10",
          700: "#CC4D08",
          800: "#A33C06",
        },
      },
      fontFamily: {
        alight: ["Author-Light", "sans-serif"],
        aregular: ["Author-Regular", "sans-serif"],
        amedium: ["Author-Medium", "sans-serif"],
        abold: ["Author-Bold", "sans-serif"],
        ablack: ["Author-Black", "sans-serif"],
        asemibold: ["Author-Semibold", "sans-serif"],
        aitalic: ["Author-Italic", "sans-serif"]
      },
      colors: {
        primary: "#FC6E20",
        "primary-dark": "#E35F16",
        ink: "#0F172A",
        muted: "#979797",
        border: "#E3E1E1",
        "bg-soft": "#e4ebfb",
        surface: "#FFFFFF",
      },
    },
  },
  plugins: [],
}

