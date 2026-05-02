/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['nodemailer', 'web-push', 'rss-parser'],
  },
}
module.exports = nextConfig
