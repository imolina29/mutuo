/** @type {import('next').NextConfig} */
const nextConfig = {
  // Provide NEXTAUTH_URL at build time for prerendering (Vercel injects env at runtime)
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000",
  },
  // Prevent tesseract.js from being bundled on the server side
  // It only runs in the browser (client-side OCR)
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Don't bundle tesseract.js on the server
      config.externals = config.externals || [];
      config.externals.push("tesseract.js");
    }
    return config;
  },
};

export default nextConfig;
