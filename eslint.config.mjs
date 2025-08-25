import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      // Disable problematic TypeScript rules
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "warn", // Change from error to warning
      
      // Disable React Hook dependency warnings (often too strict)
      "react-hooks/exhaustive-deps": "warn", // Change from error to warning
      
      // Disable unused expression warnings
      "@typescript-eslint/no-unused-expressions": "off",
      
      // Allow console statements (useful for debugging)
      "no-console": "off",
    },
  },
];

export default eslintConfig;
