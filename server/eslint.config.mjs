import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { FlatCompat } from "@eslint/eslintrc";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

const typeCheckedConfigs = tseslint.configs.recommendedTypeChecked.map((config) => ({
  ...config,
  files: ["**/*.ts"],
  languageOptions: {
    ...config.languageOptions,
    sourceType: "module",
    globals: {
      ...globals.node,
      ...config.languageOptions?.globals,
    },
    parserOptions: {
      ...config.languageOptions?.parserOptions,
      project: "./tsconfig.json",
      tsconfigRootDir: __dirname,
    },
  },
}));

export default tseslint.config(
  {
    ignores: ["dist/**"],
  },
  js.configs.recommended,
  ...typeCheckedConfigs,
  {
    files: ["**/*.ts"],
    rules: {
      "@typescript-eslint/no-misused-promises": [
        "error",
        {
          checksVoidReturn: {
            arguments: false,
            attributes: false,
          },
        },
      ],
    },
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      globals: globals.node,
      sourceType: "module",
    },
  },
  ...compat.extends("prettier")
);
