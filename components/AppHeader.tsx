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
		<header className="fixed top-4 left-1/2 rounded-xl bg-background/10 -translate-x-1/2 z-50 flex items-center justify-center px-4 py-3 md:px-6 md:py-4 backdrop-blur-md shadow-lg w-[90%] md:w-auto">
			<nav className="flex items-center gap-6 md:gap-14 justify-between w-full md:w-auto">
				{navs.map((nav) => (
					<Link
						key={nav.href}
						href={nav.href}
						className={`text-xs md:text-sm font-medium transition-colors hover:text-primary ${
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
