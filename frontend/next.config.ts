import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // This is the existing pattern for YouTube thumbnails. KEEP THIS.
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        port: '',
        pathname: '/vi/**',
      },
      // --- ADD THIS NEW PATTERN for Google Search thumbnails ---
      {
        protocol: 'https',
        hostname: 'encrypted-tbn0.gstatic.com',
        port: '',
        pathname: '/**', // Google image paths are variable, so a broad wildcard is fine
      },
    ],
  },
};

export default nextConfig;