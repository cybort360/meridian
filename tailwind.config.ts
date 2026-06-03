import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
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
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        // ─── Meridian design system ──────────────────────────────────────
        void: "#050508",
        surface: "#0C0D13",
        elevated: "#12131A",
        gold: {
          DEFAULT: "#C8A96E",
          dim: "#8B7355",
          bright: "#E8D5A3",
          glow: "rgba(200,169,110,0.15)",
        },
        ink: {
          50: "#F8F8F6",
          200: "#9CA3AF",
          400: "#6B7280",
          600: "#4B5563",
          800: "#1F2937",
        },
        // emerald: merged with Tailwind's default scale (50–950 preserved) so
        // existing emerald-400/500/etc. keep working; just adds named accents.
        emerald: {
          DEFAULT: "#10B981",
          dim: "#064E3B",
          bright: "#34D399",
          glow: "rgba(16,185,129,0.15)",
        },
        // slate: remapped to the new near-black ramp so the ~440 existing
        // slate-* utilities across the app adopt the void/surface/ink palette
        // without rewriting every component. Visual-only.
        slate: {
          50: "#F8F8F6",
          100: "#F8F8F6",
          200: "#E5E7EB",
          300: "#C9CDD4",
          400: "#9CA3AF",
          500: "#6B7280",
          600: "#4B5563",
          700: "#242530",
          800: "#16171F",
          900: "#0C0D13",
          950: "#050508",
        },
      },
      borderColor: {
        subtle: "rgba(255,255,255,0.06)",
        DEFAULT: "rgba(255,255,255,0.10)",
        strong: "rgba(255,255,255,0.18)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-space)", "ui-monospace", "monospace"],
        sora: ["var(--font-sora)", "system-ui", "sans-serif"],
        inter: ["var(--font-inter)", "system-ui", "sans-serif"],
        space: ["var(--font-space)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
