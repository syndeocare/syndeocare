/** @type {import('next').NextConfig} */
const basePath = globalThis.process?.env.NEXT_PUBLIC_SITE_BASE_PATH ?? "";

const nextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
