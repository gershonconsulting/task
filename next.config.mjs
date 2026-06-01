import { setupDevPlatform } from '@cloudflare/next-on-pages/next-dev';

/** @type {import('next').NextConfig} */
const config = {
    // Required for @cloudflare/next-on-pages
};

if (process.env.NODE_ENV === 'development') {
    await setupDevPlatform();
}

export default config;
