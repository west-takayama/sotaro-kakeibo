/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  // pdf.js はブラウザ内でのテキスト抽出にのみ使用。サーバー描画用の 'canvas' は不要なので無効化
  webpack: (config) => {
    config.resolve.alias = { ...config.resolve.alias, canvas: false };
    return config;
  },
};
