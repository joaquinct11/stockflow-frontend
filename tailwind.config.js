/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
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
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // ── Fluxus tokens ───────────────────────────────────────
        bg:      'var(--bg)',
        surface: { DEFAULT: 'var(--surface)', 2: 'var(--surface-2)', 3: 'var(--surface-3)' },
        line:    { DEFAULT: 'var(--line)', soft: 'var(--line-soft)' },
        ink:     { DEFAULT: 'var(--text)', 2: 'var(--text-2)', 3: 'var(--text-3)' },
        brand: {
          DEFAULT: 'hsl(var(--primary))',
          soft: 'var(--primary-soft)',
          line: 'var(--primary-line)',
        },
        ok:     { DEFAULT: 'var(--ok)',     soft: 'var(--ok-soft)' },
        warn:   { DEFAULT: 'var(--warn)',   soft: 'var(--warn-soft)', line: 'var(--warn-line)' },
        bad:    { DEFAULT: 'var(--bad)',    soft: 'var(--bad-soft)' },
        info:   { DEFAULT: 'var(--info)',   soft: 'var(--info-soft)' },
        violet: { DEFAULT: 'var(--violet)', soft: 'var(--violet-soft)' },
        sidebar: { DEFAULT: 'var(--sidebar)', line: 'var(--sidebar-line)' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        card: 'var(--shadow)',
      },
    },
  },
  plugins: [],
}