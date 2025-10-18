// eslint.config.js
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
// opzionale: abilita regole/ambienti Vitest
// import vitest from "eslint-plugin-vitest";

export default [
    // ignora build/cache/output
    { ignores: ["dist/**", "coverage/**", ".vite/**", "node_modules/**"] },

    // base JS consigliata
    js.configs.recommended,

    // TypeScript (preset + parser)
    ...tseslint.configs.recommended,

    // blocco principale: TS + browser+node globals
    {
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                // Se usi path alias/tsconfig complessi, abilita il Project Service:
                projectService: {
                    allowDefaultProject: ["eslint.config.js"],
                },
                tsconfigRootDir: import.meta.dirname,
                ecmaVersion: "latest",
                sourceType: "module",
            },
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        rules: {
            // stile/robustezza base
            "eqeqeq": ["warn", "smart"],
            "curly": ["warn", "all"],
            "no-console": ["warn", { allow: ["warn", "error"] }],

            // preferisci la variante TS delle regole
            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": [
                "warn",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    caughtErrors: "all",
                    caughtErrorsIgnorePattern: "^_",
                },
            ],
            "@typescript-eslint/ban-ts-comment": "off",
            "@typescript-eslint/no-explicit-any": "off",
        },
    },

    // override per i test (Vitest)
    {
        files: ["**/*.test.ts", "tests/**/*.ts"],
        // se NON vuoi installare eslint-plugin-vitest, usa solo i globals:
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.browser,
                // globals di Vitest:
                describe: true, it: true, test: true, expect: true, beforeEach: true, afterEach: true, vi: true,
            },
        },
        // se vuoi le regole del plugin:
        // plugins: { vitest },
        // rules: { ...vitest.configs.recommended.rules },
    },

    // disattiva regole in conflitto con Prettier
    prettier,
];
