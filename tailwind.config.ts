import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Arial", "sans-serif"],
        serif: ["Times New Roman", "Georgia", "serif"],
        display: ["Times New Roman", "Georgia", "serif"],
        body: ["Arial", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        // ── FranklinCovey Brand Palette ──────────────────────────
        // Primary
        'fc-deep-blue': '#3253FF',
        'fc-bright-white': '#FFFFFF',
        'fc-cool-black': '#141928',
        // Secondary
        'fc-light-sky': '#67DFFF',
        'fc-coral': '#FF585D',
        'fc-golden': '#FFB93C',
        'fc-green': '#45D8B4',
        'fc-violet': '#A191F2',
        'fc-cool-gray': '#CFDEE5',
        'fc-warm-gray': '#D8D4D7',
        // Tertiary (data visualization only)
        'fc-data-red': '#A6214D',
        'fc-data-orange': '#CC853D',
        'fc-data-blue': '#1386BF',
        'fc-data-teal': '#21A685',
        'fc-data-purple': '#7A5DBA',
        'fc-data-slate': '#749EB2',
        'fc-data-tan': '#A6978D',

        // ── Legacy fc-* scale (kept for component compatibility) ──
        // These map the old numeric scale to brand-derived values.
        // Components still reference these classes — migrate in a
        // follow-up pass, then remove this block.
        gold: {
          50: "#fdf8ef",
          100: "#faefd6",
          200: "#f4dcab",
          300: "#ecc576",
          400: "#e3a943",
          500: "#d99424",
          600: "#b8965a",
          700: "#9a6d1a",
          800: "#7d561d",
          900: "#66481c",
        },
        fc: {
          50: "#eef1ff",
          100: "#dfe4ff",
          200: "#c6ccff",
          300: "#a3a8ff",
          400: "#7e79ff",
          500: "#6357fa",
          600: "#3253FF",
          700: "#2a42d4",
          800: "#2336ab",
          900: "#1e2f87",
          950: "#141928",
        },
      },
      boxShadow: {
        'fc-card': '0 2px 8px rgba(20, 25, 40, 0.08)',
        'fc-elevated': '0 4px 16px rgba(20, 25, 40, 0.12)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-subtle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.8" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-out forwards",
        "fade-in-up": "fade-in-up 0.6s ease-out forwards",
        "slide-in-right": "slide-in-right 0.5s ease-out forwards",
        "scale-in": "scale-in 0.3s ease-out forwards",
        shimmer: "shimmer 2s infinite",
        "pulse-subtle": "pulse-subtle 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
