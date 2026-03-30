import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'framer-motion', '@radix-ui/react-dialog', '@radix-ui/react-select', '@radix-ui/react-tabs', '@radix-ui/react-tooltip', '@radix-ui/react-toggle-group', '@radix-ui/react-dropdown-menu'],
  },
  serverExternalPackages: ['exceljs'],
};

export default nextConfig;
