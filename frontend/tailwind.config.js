/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  // MUI CssBaseline аллакай reset мекунад; preflight-и Tailwind бо MUI мухолифат мекунад.
  corePlugins: { preflight: false },
  theme: { extend: {} },
  plugins: [],
};
