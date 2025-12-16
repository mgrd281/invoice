/** @type {import('next').NextConfig} */
const nextConfig = {
    // Enable Turbopack compatibility by removing custom webpack config that conflicts
    // If specific fallbacks are needed, they should be handled differently or might not be needed in Next.js 16
    experimental: {
        serverActions: {
            bodySizeLimit: '2mb',
        },
    },
};

module.exports = nextConfig
