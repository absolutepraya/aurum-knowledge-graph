"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppHeader() {
	const pathname = usePathname();

	if (pathname.startsWith("/artwork") || pathname.startsWith("/artist")) {
		return null;
	}

	const navs = [
		{ name: "Search", href: "/" },
		{ name: "Chat", href: "/chat" },
		{ name: "Console", href: "/console" },
	];

	return (
		<header className="fixed top-4 left-1/2 rounded-xl bg-background/10 -translate-x-1/2 z-50 flex items-center justify-center px-6 py-4 backdrop-blur-md shadow-lg">
			<nav className="flex items-center gap-14">
				{navs.map((nav) => (
					<Link
						key={nav.href}
						href={nav.href}
						className={`text-sm font-medium transition-colors hover:text-primary ${
							pathname === nav.href ? "text-foreground" : "text-gray-400"
						}`}
					>
						{nav.name}
					</Link>
				))}
			</nav>
		</header>
	);
}
