import { defineConfig } from '@kubb/core'
import { pluginOas } from '@kubb/plugin-oas'
import { pluginTs } from '@kubb/plugin-ts'
import { pluginZod } from '@kubb/plugin-zod'
import { pluginTanstackQuery } from '@kubb/plugin-tanstack-query'

export default defineConfig({
  root: '.',

  input: {
    path: '../backend/docs/swagger.json',
  },

  output: {
    path: './',
  },

  plugins: [
    pluginOas(),

    // one types file
    pluginTs({
      output: {
        path: './types/types.gen.ts',
        barrelType: false,
      },
    }),

    // one zod schema file
    pluginZod({
      output: {
        path: './types/schema.gen.ts',
        barrelType: false,
      },
      typed: true,
    }),

    // API hooks split by tag
    pluginTanstackQuery({
      output: {
        path: './api',
      },

      client: {
        importPath: './api/client',
      },

      group: {
        type: 'tag',
      },

      query: {
        methods: ['get'],
      },

      mutate: {
        variablesType: 'mutate',
        methods: ['post', 'put', 'patch', 'delete'],
      },
    }),
  ],
})
