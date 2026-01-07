import { defineConfig } from "@kubb/core";
import { pluginOas } from "@kubb/plugin-oas";
import { pluginTs } from "@kubb/plugin-ts";
import { pluginZod } from "@kubb/plugin-zod";
import { pluginReactQuery } from "@kubb/plugin-react-query";

export default defineConfig({
  root: ".",

  input: {
    path: "../backend/docs/swagger.json",
  },

  output: {
    path: "./",
  },

  plugins: [
    pluginOas(),

    // one types file
    pluginTs({
      output: {
        path: "./types/types.gen.ts",
        barrelType: false,
      },
    }),

    // one zod schema file
    pluginZod({
      output: {
        path: "./types/schema.gen.ts",
        barrelType: false,
      },
      typed: true,
    }),

    pluginReactQuery({
      output: {
        path: "./api",
      },

      client: {
        importPath: "../client",
      },

      group: {
        type: "tag",
        name: ({ group }) =>
          group
            // remove trailing "Controller" if swaggo adds it
            .replace(/Controller$/, "")
            // camelCase / PascalCase → kebab-case
            .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
            // snake_case → kebab-case
            .replace(/_/g, "-")
            .toLowerCase(),
      },

      query: {
        methods: ["get"],
      },

      mutation: {
        methods: ["post", "put", "patch", "delete"],
      },
    }),
  ],
});
