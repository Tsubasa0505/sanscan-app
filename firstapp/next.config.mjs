/** @type {import('next').NextConfig} */
const nextConfig = {
  // 実験的機能
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', 'recharts', 'd3'],
  },

  // ヘッダー設定
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/json; charset=utf-8',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },

  // 環境変数
  env: {
    NEXT_PUBLIC_CHARSET: 'utf-8',
    NEXT_PUBLIC_LANG: 'ja',
  },

  // 出力設定
  output: 'standalone',
  
  // 厳密モード
  reactStrictMode: true,
  
  // ログレベル設定
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default nextConfig;