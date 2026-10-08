export default {
    files: ["**/*.js"], // Adjust this to match your project file patterns if needed
    ignores: [
        "dist/**",
        "node_modules/**",
        "plugins/**",
        "xapi-authored-profiles/**",
        "src/HighLevel/Statement/Ids/Profiles/Generated/**",
    ],
    languageOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        globals: {
            ADL: false,
            angular: false,
            $: false,
            RadialProgress: true,
            ColumnProgress: true,
            gauss: false,
            d3: false,
            jQuery: false,
            module: true,
            require: true,
            console: true,
            localStorage: true,
            describe: true,
            it: true,
        },
    },
    rules: {
        // Add your ESLint rules here
        strict: "off", // ES modules are always strict
        // Example additional rules
        "no-unused-vars": "warn",
        "no-console": "off",
        semi: ["error", "always"],
    },
};
