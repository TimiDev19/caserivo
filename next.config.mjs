/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep `next build` from replacing chunks used by a running `next dev` server.
  // Netlify's Next.js adapter expects the production build in `.next`.
  // Keep development output separate so `next dev` cannot reuse production chunks.
  distDir: process.env.NODE_ENV === 'production' ? '.next' : '.next-development',
  webpack(config) {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/.next/**', '**/.next-development/**', '**/.next-production/**'],
    };
    return config;
  },
};

export default nextConfig;
