/** @type {import('next').NextConfig} */
const nextConfig = {
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
