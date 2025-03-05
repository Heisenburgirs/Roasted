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
    rules: {
      // Disable unused variables warning
      "@typescript-eslint/no-unused-vars": "off",
      "no-unused-vars": "off",
      
      // Disable other common warnings
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-function": "off",
      "react-hooks/exhaustive-deps": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      
      // Disable TypeScript strict checks
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-inferrable-types": "off",

      // Disable Next.js img warnings
      "@next/next/no-img-element": "off",

      // Disable accessibility warnings
      "jsx-a11y/alt-text": "off",

      // Disable unused eslint-disable comments warning
      "eslint-comments/no-unused-disable": "off"
    }
  }
];

export default eslintConfig;