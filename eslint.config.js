import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import stylisticJs from '@stylistic/eslint-plugin-js'


export default [
  {
    files: ["src/**/*.{js,mjs,cjs,ts}","tests/**/*.{js,mjs,cjs,ts}"],
    ignores: ["dist/**", "build/**", "node_modules/**"],
    plugins: {
      '@stylistic/js': stylisticJs
    },
    rules: {
      "indent": ["error", 2,  { "SwitchCase": 1 }],
      "no-tabs": "error",
      "@stylistic/js/no-mixed-spaces-and-tabs": "error",
      "linebreak-style": ["error", "unix"],
      "no-prototype-builtins":'off',
      "no-multiple-empty-lines": ["error", { "max": 1, "maxEOF": 0 }],

      "@stylistic/js/space-before-blocks": ["error", "never"], // if() {} => if(){}
      "@stylistic/js/space-in-parens": ["error", "always"], // if( func() ) => if(func())
      '@stylistic/js/keyword-spacing': ["error", { "before": false, "after":false }], // if () => if()
      "@stylistic/js/space-before-function-paren": ["error", "never"], // function () => function()
      "@stylistic/js/block-spacing": ["error", "always"], // if(){...} => if(){ ... }
      
    },
  },
  {
    languageOptions: { globals: globals.browser }
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {}
];