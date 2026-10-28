// Na Vercelu /api/* kieruje do backendu FastAPI routing z vercel.json, zanim
// zapytanie dotrze do Next.js. Lokalnie robi to ten rewrite (uvicorn na :8000).
const apiProxyUrl =
  process.env.API_PROXY_URL ??
  (process.env.NODE_ENV === "development" ? "http://127.0.0.1:8000" : undefined);

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    if (!apiProxyUrl) return [];
    return [{ source: "/api/:path*", destination: `${apiProxyUrl}/api/:path*` }];
  },
};

export default nextConfig;
