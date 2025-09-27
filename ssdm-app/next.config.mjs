/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // CSP 헤더 설정
  async headers() {
    return [
      {
        source: '/secure-viewer',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.firebasedatabase.app https://*.googleapis.com https://www.googletagmanager.com https://*.vercel-scripts.com; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.firebasedatabase.app https://*.googleapis.com wss://*.firebasedatabase.app https://*.vercel-scripts.com; frame-src 'self' https://*.firebasedatabase.app https://*.googleapis.com;"
          },
          {
            key: 'Referrer-Policy',
            value: 'no-referrer'
          }
        ]
      }
    ]
  }
}

export default nextConfig
