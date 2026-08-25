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
    // Battle league badges (constants/battleStyles.ts LEAGUE_STYLES)
    "bg-orange-100", "text-orange-700", "bg-orange-500",
    "bg-slate-200",  "text-slate-600",  "bg-slate-400",
    "bg-amber-100",  "text-amber-700",
    "bg-cyan-100",   "text-cyan-700",   "bg-cyan-500",
    "bg-violet-100", "text-violet-700", "bg-violet-500",
    // Battle result hero backgrounds (constants/battleStyles.ts BATTLE_RESULT_STYLES)
    "bg-emerald-600", "bg-rose-600", "bg-slate-600", "bg-slate-700",
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
    },
  },
  plugins: [],
}

