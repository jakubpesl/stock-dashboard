const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['yahoo-finance2', 'nodemailer', 'web-push', 'rss-parser'],
  webpack: (config, { webpack }) => {
    const stub = path.resolve(__dirname, 'lib/empty-stub.js')
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^@gadicc\/fetch-mock-cache/, stub),
      new webpack.NormalModuleReplacementPlugin(/^@std\/testing/, stub)
    )
    return config
  },
}
module.exports = nextConfig
