/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['yahoo-finance2', 'nodemailer', 'web-push', 'rss-parser'],
  },
}
module.exports = nextConfig
