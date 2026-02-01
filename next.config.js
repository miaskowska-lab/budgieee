/** @type {import('next').NextConfig} */
const nextConfig = {
  // Reduce file watcher load to avoid EMFILE (too many open files) on port 3000
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ignored: ['**/node_modules/**', '**/.git/**'],
        aggregateTimeout: 300,
        poll: 2000,
      }
    }
    return config
  },
}

module.exports = nextConfig
