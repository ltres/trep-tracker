import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import stylisticJs from '@stylistic/eslint-plugin-js'
import unusedImports from "eslint-plugin-unused-imports";


export default [
  {
    files: ["src/**/*.{js,mjs,cjs,ts}","tests/**/*.{js,mjs,cjs,ts}"],
    ignores: ["dist/**", "build/**", "node_modules/**"],
    plugins: {
      '@stylistic/js': stylisticJs,
      "unused-imports": unusedImports,
    },
    rules: {
      "indent": ["error", 2,  { "SwitchCase": 1 }],
      "no-tabs": "error",
      "@stylistic/js/no-mixed-spaces-and-tabs": "error",
      "linebreak-style": ["error", "unix"],
      "no-prototype-builtins":'off',
      "no-case-declarations": 'off',
      "no-multiple-empty-lines": ["error", { "max": 1, "maxEOF": 0 }],
      
      "@stylistic/js/space-before-blocks": ["error", "never"], // if() {} => if(){}
      "@stylistic/js/space-in-parens": ["error", "always"], // if( func() ) => if(func())
      '@stylistic/js/keyword-spacing': ["error", { "before": false, "after":false }], // if () => if()
      "@stylistic/js/space-before-function-paren": ["error", "never"], // function () => function()
      "@stylistic/js/block-spacing": ["error", "always"], // if(){...} => if(){ ... }
      "@stylistic/js/comma-spacing": ["error", { "before": false, "after": true }],
      "no-unused-vars": "off", // or "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
          "warn",
          {
              "vars": "all",
              "varsIgnorePattern": "^_",
              "args": "after-used",
              "argsIgnorePattern": "^_",
          },
      ]
    },
  },
  {
    languageOptions: { globals: globals.browser }
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {}
];