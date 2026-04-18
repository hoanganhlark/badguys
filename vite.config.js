import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(function (_a) {
    var command = _a.command;
    var isBuild = command === "build";
    return {
        plugins: [react()],
        base: isBuild ? "/badguys/" : "/",
        test: {
            environment: "jsdom",
            setupFiles: ["src/tests/setup.ts"],
        },
    };
});
