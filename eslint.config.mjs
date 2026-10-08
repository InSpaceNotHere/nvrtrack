import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: [".next/**", "node_modules/**", "coverage/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        AbortController: "readonly",
        Blob: "readonly",
        document: "readonly",
        File: "readonly",
        FormData: "readonly",
        navigator: "readonly",
        process: "readonly",
        Request: "readonly",
        Response: "readonly",
        setTimeout: "readonly",
        URL: "readonly",
        window: "readonly"
      }
    }
  }
);
