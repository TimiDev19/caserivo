/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep `next build` from replacing chunks used by a running `next dev` server.
  distDir: process.env.NODE_ENV === 'production' ? '.next-production' : '.next-development',
  webpack(config) {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/.next/**', '**/.next-development/**', '**/.next-production/**'],
    };
    return config;
  },
};

export default nextConfig;
