/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#020617",
        card: "#0B1220",
        border: "#1E293B",
        accent: "#FACC15",
        textPrimary: "#FFFFFF",
        textSecondary: "#94A3B8",
        success: "#22C55E",
        danger: "#EF4444",
        pill: "#111827",
      },
      borderRadius: {
        card: "24px",
        button: "12px",
        small: "8px",
        pill: "100px",
      },
    },
  },
  plugins: [],
};
