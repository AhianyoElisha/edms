import type { Config } from "tailwindcss";
import plugin from 'tailwindcss/plugin'

const capitalizeFirst = plugin(function ({ addUtilities }) {
  const newUtilities = {
    '.capitalize-first:first-letter': {
      textTransform: 'uppercase',
    },
  }
  addUtilities(newUtilities)
})


const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
    corePlugins: {
    preflight: false
  },
  important: '#__next',
  prefix: "",
  theme: {
    extend: {},
  },
  plugins: [require('tailwindcss-logical'), require('./src/@core/tailwind/plugin'), require("tailwindcss-animate"), capitalizeFirst],
} satisfies Config;

export default config;