// One id per build, baked into both the pages and /api/version. A tab whose id
// differs from the server's is running an older version (see NewVersionBanner).
const BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || `local-${Date.now()}`

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_ID: BUILD_ID
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.edsghana.com',
        pathname: '/v1/storage/buckets/**',
      },
    ],
  },
};

export default nextConfig;
