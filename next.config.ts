import type { NextConfig } from "next";

type NextConfigWithTracing = NextConfig & {
	experimental?: NextConfig["experimental"] & {
		outputFileTracingIncludes?: Record<string, string[]>;
	};
};

const nextConfig: NextConfigWithTracing = {
	serverExternalPackages: ["@xenova/transformers"],
	experimental: {
		outputFileTracingIncludes: {
			"/api/console": ["./node_modules/@img/**"],
		},
	},
};

export default nextConfig;
