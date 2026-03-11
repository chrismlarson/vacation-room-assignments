/** @type {import('next').NextConfig} */
const BASE_PATH = '/vacation-room-assignments'

const nextConfig = {
  output: 'standalone',
  basePath: BASE_PATH,
  env: {
    NEXT_PUBLIC_BASE_PATH: BASE_PATH,
  },
}

module.exports = nextConfig
