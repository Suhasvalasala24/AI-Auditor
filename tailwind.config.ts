import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    // Covers projects using the 'src' directory
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    
    // Covers projects using the root directory (no 'src')
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;