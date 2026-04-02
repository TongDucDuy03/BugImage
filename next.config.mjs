/** @type {import('next').NextConfig} */
const nextConfig = {
	experimental: {
		serverActions: {
			bodySizeLimit: '10mb'
		}
	},
	images: {
		dangerouslyAllowSVG: false,
		formats: ['image/avif', 'image/webp'],
		remotePatterns: [
			{ protocol: 'https', hostname: '**' },
			{ protocol: 'http', hostname: 'localhost' }
		]
	}
};

export default nextConfig;

