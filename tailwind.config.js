/** @type {import('tailwindcss').Config} */
import * as typography from "@tailwindcss/typography";
import * as daisyui from "daisyui";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [typography, daisyui],
};
