/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
  async redirects() {
    return [
      {
        source: '/admin/curriculum',
        destination: '/admin',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
