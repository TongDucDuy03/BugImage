import type { Config } from "tailwindcss";

const config: Config = {
	content: [
		"./app/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./lib/**/*.{ts,tsx}"
	],
	theme: {
		extend: {
			colors: {
				// Light luxury / soft premium palette
				bg: {
					DEFAULT: "#f7f7f8", // near-white
					soft: "#ffffff",
					muted: "#eef0f3"
				},
				text: {
					DEFAULT: "#0f172a",
					muted: "#475569",
					soft: "#334155"
				},
				primary: {
					DEFAULT: "#0ea5e9", // refined blue accent
					foreground: "#ffffff"
				},
				accent: {
					DEFAULT: "#64748b"
				},
				success: "#16a34a",
				warn: "#d97706",
				danger: "#dc2626"
			},
			boxShadow: {
				card: "0 15px 40px -20px rgba(15, 23, 42, 0.2)"
			}
		}
	},
	plugins: []
};

export default config;

