import plugin from 'tailwindcss/plugin'

// Let's create a plugin that adds utilities!
const capitalizeFirst = plugin(function ({ addUtilities }) {
  const newUtilities = {
    '.capitalize-first:first-letter': {
      textTransform: 'uppercase',
    },
  }
  addUtilities(newUtilities)
})

module.exports = {
  theme: {},
  variants: {},
  // Let's register the plugin we created on line 3
  plugins: [capitalizeFirst],
}
