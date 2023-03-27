/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // We already run linting as a separate step
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
