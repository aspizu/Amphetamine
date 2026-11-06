import babel from "@rolldown/plugin-babel"
import tailwindcss from "@tailwindcss/vite"
import {tanstackRouter} from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import {defineConfig} from "vite"

export default defineConfig({
  server: {
    host: process.env.TAURI_DEV_HOST ?? "127.0.0.1",
    port: 1420,
    strictPort: true,
  },
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react({jsxRuntime: "classic"}),
    babel({
      plugins: [["module:@preact/signals-react-transform"]],
    }),
    tailwindcss(),
  ],
})
