import { defineConfig } from 'vitest/config'
import * as dotenv from 'dotenv'

export default defineConfig({
  test: {
    env: dotenv.config({ path: '.env.test' }).parsed,
    exclude: ['.vercel', '.next', 'node_modules']
  },
})
