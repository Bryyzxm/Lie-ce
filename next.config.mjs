/** @type {import('next').NextConfig} */
const isVercel = process.env.VERCEL === '1';

const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // GitHub Pages diserve dari subpath /Lie-ce, sedangkan Vercel diserve
  // dari root. Tanpa kondisi ini, deploy Vercel akan 404 untuk semua aset.
  ...(isVercel ? {} : {basePath: '/Lie-ce', assetPrefix: '/Lie-ce/'}),
};

export default nextConfig;
