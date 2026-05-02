/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['yahoo-finance2', 'nodemailer', 'web-push', 'rss-parser'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.alias['@gadicc/fetch-mock-cache/stores/fs.ts'] = false
    }
    return config
  },
}
module.exports = nextConfig
