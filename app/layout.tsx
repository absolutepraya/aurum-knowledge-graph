import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
	variable: "--font-inter",
	subsets: ["latin"],
	display: "swap",
});

const playfair = Playfair_Display({
	variable: "--font-playfair",
	subsets: ["latin"],
	display: "swap",
});

export const metadata: Metadata = {
	title: 'Aurum Art Gallery by "kgtau"',
	description:
		"Aurum Art Gallery is a knowledge graph of artists and artworks, built mainly with Next.js and Neo4j.",
};

import { AppHeader } from "@/components/AppHeader";

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body
				className={`${inter.variable} ${playfair.variable} antialiased bg-background text-foreground`}
			>
				<AppHeader />
				<main className="pt-20 min-h-screen">{children}</main>
			</body>
		</html>
	);
}
