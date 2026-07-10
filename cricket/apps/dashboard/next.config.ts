import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@cricket/core'],
  experimental: {
    after: true,
  },
}

export default nextConfig
