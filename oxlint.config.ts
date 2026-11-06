import {defineConfig} from "oxlint"

export default defineConfig({
  plugins: ["react", "typescript", "unicorn", "oxc", "import"],
  jsPlugins: ["oxlint-plugin-aspizuism"],
  categories: {
    correctness: "error",
    suspicious: "warn",
    perf: "warn",
  },
  env: {
    builtin: true,
    browser: true,
    node: true,
  },
  ignorePatterns: [
    "node_modules/",
    "openmpt/",
    "target/",
    "packages/*/dist/",
    "packages/*/node_modules/",
    "packages/app/src/routeTree.gen.ts",
    "packages/app/src/commands.gen.ts",
  ],
  options: {
    typeAware: true,
  },
  rules: {
    "aspizuism/block-style": "error",
    "aspizuism/func-style": "error",
    "aspizuism/no-comments": "error",
    "aspizuism/no-conditional-empty-object-spread": "error",
    "aspizuism/private-prefix": "error",
    "no-nested-ternary": "error",
    "no-underscore-dangle": "off",
    "sort-imports": "off",
    "max-depth": "error",
    "typescript/consistent-type-imports": [
      "error",
      {fixStyle: "separate-type-imports", prefer: "type-imports"},
    ],
    "typescript/no-deprecated": "error",
    "typescript/no-floating-promises": "error",
    "typescript/await-thenable": "error",
    "typescript/no-misused-promises": "error",
    complexity: "error",
    "no-empty": "error",
    "max-lines": ["error", {max: 200, skipBlankLines: true, skipComments: true}],
    "import/no-unassigned-import": ["error", {allow: ["**/*.css"]}],
  },
})
