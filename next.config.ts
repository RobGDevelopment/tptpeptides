import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['localhost', '127.0.0.1', '192.168.0.100'],
  serverExternalPackages: ['firebase-admin'],
  experimental: {
    viewTransition: true,
  },
};

export default nextConfig;
