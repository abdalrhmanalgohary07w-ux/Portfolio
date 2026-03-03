/** @type {import('next').NextConfig} */
const nextConfig = {
  // تحديد جذر المشروع لحل مشكلة الـ lockfiles المتعددة
  experimental: {
    // إذا كنت تستخدم Turbopack (كما يظهر في اللوج)، نحدد الجذر هنا
    turbo: {
      root: '.',
    },
  },
  // إعدادات إضافية لتحسين التوافق
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
