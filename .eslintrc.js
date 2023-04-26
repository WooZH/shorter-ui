module.exports = {
  root: true,
  env: {
    node: true,
  },
  extends: ["plugin:vue/vue3-recommended", "prettier"],
  parserOptions: {
    parser: "babel-eslint",
  },
  rules: {
    "no-console": process.env.NODE_ENV === "production" ? "error" : "off",
    "no-debugger": process.env.NODE_ENV === "production" ? "error" : "off",
    "vue/no-v-html": "off",
    "vue/no-side-effects-in-computed-properties": "off",
    "shorter/no-cn": 2,
    "vue/html-closing-bracket-newline": [
      "warn",
      {
        singleline: "never",
        multiline: "always",
      },
    ],
    "vue/html-self-closing": [
      "error",
      {
        html: {
          void: "any",
          normal: "always",
          component: "always",
        },
      },
    ],
    "vue/max-attributes-per-line": [
      "error",
      {
        singleline: {
          max: 10,
        },
        multiline: {
          max: 10,
        },
      },
    ],
    "vue/singleline-html-element-content-newline": [
      "off",
      {
        ignoreWhenNoAttributes: true,
        ignoreWhenEmpty: true,
      },
    ],
  },
  plugins: ["shorter", "prettier"],
};
