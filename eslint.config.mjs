import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Not source: stale git worktrees under .claude/ (each with its own
    // .next/ + node_modules/) and reference .tsx snippets kept in docs/.
    ".claude/**",
    "docs/**",
  ]),
]);

export default eslintConfig;
