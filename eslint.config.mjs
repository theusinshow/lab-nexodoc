import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  globalIgnores([
    ".next/**",
    ".next-bateria/**",
    ".next-ux/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "design-system/**",
    // Rascunho local (ignorado pelo git): o CI nunca o vê, e o lint local não deve contar.
    "scratchpad/**",
  ]),
]);

export default eslintConfig;
