/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        "bg-primary": "#0A0A0A",
        "bg-card": "#141414",
        "bg-input": "#1E1E1E",
        "accent-purple": "#8B5CF6",
        "accent-pink": "#EC4899",
        success: "#10B981",
        warning: "#F59E0B",
        "text-primary": "#F9FAFB",
        "text-muted": "#6B7280",
        "border-dark": "#2D2D2D",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        border: "#2D2D2D",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        waveBar: {
          "0%, 100%": { transform: "scaleY(0.12)" },
          "50%": { transform: "scaleY(1)" },
        },
        fadeInUp: {
          from: { opacity: "0", transform: "translateY(24px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% center" },
          "100%": { backgroundPosition: "-200% center" },
        },
        floatUp: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(139, 92, 246, 0)" },
          "50%": { boxShadow: "0 0 20px 6px rgba(139, 92, 246, 0.3)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        waveBar: "waveBar 0.8s ease-in-out infinite",
        fadeInUp: "fadeInUp 0.5s ease-out forwards",
        pulseDot: "pulseDot 1.5s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        floatUp: "floatUp 3s ease-in-out infinite",
        glowPulse: "glowPulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
