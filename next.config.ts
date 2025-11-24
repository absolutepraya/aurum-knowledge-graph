import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	serverExternalPackages: ["@xenova/transformers"],
	outputFileTracingIncludes: {
		"/api/console": ["./node_modules/@img/**"],
	},
};

export default nextConfig;
