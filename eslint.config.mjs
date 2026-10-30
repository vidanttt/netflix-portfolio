import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // The strict React-compiler rules and `any` flag patterns this codebase uses on purpose
    // (animation loops, refs read during render). Reported as warnings so `npm run lint`
    // stays useful: real bugs (rules-of-hooks, undefined vars, ...) still fail it.
    rules: {
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "react/no-unescaped-entities": "warn",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "graphify-out/**", "brag-output/**", "_sound-sources/**", "node_modules/**"]),
]);
