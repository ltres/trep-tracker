import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";


export default [
  {
    files: ["src/**/*.{js,mjs,cjs,ts}","tests/**/*.{js,mjs,cjs,ts}"],
    ignores: ["dist/**", "build/**", "node_modules/**"],
    rules: {
      "indent": ["error", 2,  { "SwitchCase": 1 }],
      "no-tabs": "error",
      "no-mixed-spaces-and-tabs": "error",
      "linebreak-style": ["error", "unix"],
      "no-prototype-builtins":'off',
      "no-multiple-empty-lines": ["error", { "max": 1, "maxEOF": 0 }],
    },
  },
  {
    languageOptions: { globals: globals.browser }
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {}
];