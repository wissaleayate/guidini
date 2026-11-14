/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
