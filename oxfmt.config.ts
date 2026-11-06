import {defineConfig} from "oxfmt"

export default defineConfig({
  semi: false,
  tabWidth: 2,
  bracketSpacing: false,
  printWidth: 88,
  endOfLine: "lf",
  sortImports: true,
  sortPackageJson: false,
  sortTailwindcss: {
    stylesheet: "./packages/app/src/styles/global.css",
    functions: ["cva", "cn"],
  },
  ignorePatterns: [
    "node_modules/",
    "openmpt/",
    "target/",
    "pnpm-lock.yaml",
    "packages/*/dist/",
    "packages/*/node_modules/",
    "packages/app/src/routeTree.gen.ts",
    "packages/app/src/commands.gen.ts",
  ],
})
