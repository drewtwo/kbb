import coreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";

const eslintConfig = [
  {
    ignores: [
      "node_modules/",
      ".next/",
      "dist/",
      "build/",
      "out/",
      "coverage/",
      ".git/",
      ".env",
      ".env.local",
      ".env.*.local",
      "*.md",
      "*.json",
      "*.yaml",
      "*.yml",
      "*.css",
      "*.svg",
      "*.ico",
      "*.crt",
      "*.key",
      ".nvmrc",
      ".gitignore",
      "vercel.json",
      "next.config.js",
      "tsconfig.json",
      "package.json",
      "yarn.lock",
      "package-lock.json",
      "pnpm-lock.yaml",
      "lib/validate-env.js",
    ],
  },
  ...coreWebVitals,
  ...nextTypescript,
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      "react/no-unescaped-entities": "off",
      "@next/next/no-html-link-for-pages": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];

export default eslintConfig;
