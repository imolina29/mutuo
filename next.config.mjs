/** @type {import('next').NextConfig} */
const nextConfig = {
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
