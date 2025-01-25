module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["tsconfig.json", "tsconfig.dev.json"],
    sourceType: "module",
  },
  ignorePatterns: [
    "/lib/**/*", // Ignore built files.
  ],
  plugins: [
    "@typescript-eslint",
    "import",
  ],
  rules: {
    "quotes": ["error", "double"],
    "import/no-unresolved": 0,
    "indent": "off", // Disable indentation checks during transition
    "@typescript-eslint/indent": "off", // Disable TypeScript indentation checks
    "@typescript-eslint/adjacent-overload-signatures": "off",
    "@typescript-eslint/no-explicit-any": "off", // Allow any during transition
    "@typescript-eslint/ban-ts-comment": "off", // Allow @ts-ignore during transition
    "@typescript-eslint/no-non-null-assertion": "off", // Allow non-null assertions
    "@typescript-eslint/no-unused-vars": "off", // Temporarily disable unused vars check
    "@typescript-eslint/explicit-module-boundary-types": "off", // Allow implicit return types
    "@typescript-eslint/no-empty-interface": "off", // Allow empty interfaces
    "@typescript-eslint/ban-types": "off", // Allow {} and object types
    "require-jsdoc": "off", // Temporarily disable JSDoc requirement
    "valid-jsdoc": "off", // Temporarily disable JSDoc validation
    "max-len": "off", // Disable line length restrictions
    "camelcase": "off", // Allow non-camelCase during transition
    "no-invalid-this": "off", // Allow this usage in class methods
    "@typescript-eslint/no-floating-promises": "off", // Allow unhandled promises during transition
    "@typescript-eslint/no-misused-promises": "off", // Allow promise misuse during transition
    "@typescript-eslint/no-unsafe-assignment": "off", // Allow unsafe assignments during transition
    "@typescript-eslint/no-unsafe-member-access": "off", // Allow unsafe member access during transition
    "@typescript-eslint/no-unsafe-call": "off", // Allow unsafe function calls during transition
    "@typescript-eslint/no-unsafe-return": "off", // Allow unsafe returns during transition
    "@typescript-eslint/restrict-template-expressions": "off", // Allow any type in template literals
    "@typescript-eslint/unbound-method": "off", // Allow unbound methods during transition
    "no-async-promise-executor": "off", // Allow async promise executors during transition
    "new-cap": "off", // Allow constructor names without capitalization
    "semi": "off", // Allow missing semicolons
    "@typescript-eslint/semi": "off", // Allow missing semicolons in TypeScript
    "object-curly-spacing": "off", // Allow spaces in object literals
    "arrow-parens": "off", // Allow arrow functions without parens
    "comma-dangle": "off", // Allow missing trailing commas
    "no-trailing-spaces": "off", // Allow trailing spaces
    "operator-linebreak": "off", // Allow operators at start of line
    "no-new-object": "off", // Allow new Object()
    "import/export": "off" // Allow multiple exports of same name
  },
};
