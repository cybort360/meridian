/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdf-parse (and its pdfjs-dist dependency) use Node APIs and dynamic
  // requires that shouldn't be bundled — let them load as native node modules.
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse"],
  },
};

export default nextConfig;
