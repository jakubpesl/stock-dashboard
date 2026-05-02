const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['yahoo-finance2', 'nodemailer', 'web-push', 'rss-parser'],
  webpack: (config) => {
    const stub = path.resolve(__dirname, 'lib/empty-stub.js')
    config.resolve.alias = {
      ...config.resolve.alias,
      '@gadicc/fetch-mock-cache/stores/fs.ts': stub,
      '@gadicc/fetch-mock-cache/runtimes/deno.ts': stub,
      '@std/testing/mock': stub,
      '@std/testing/bdd': stub,
    }
    return config
  },
}
module.exports = nextConfig
