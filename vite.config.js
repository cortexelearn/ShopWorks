import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" makes the build path-relative, so it works at
// https://<user>.github.io/<repo>/ without configuration.
export default defineConfig({
  plugins: [react()],
  base: "./",
});
