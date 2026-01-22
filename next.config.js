/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    // Enable Turbopack compatibility by removing custom webpack config that conflicts
    // If specific fallbacks are needed, they should be handled differently or might not be needed in Next.js 16
    experimental: {
        serverActions: {
            bodySizeLimit: '10mb', // Increased from 2mb to support larger CSV files
        },
    },
};

module.exports = nextConfig
