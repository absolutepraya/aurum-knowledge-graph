"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppHeader() {
	const pathname = usePathname();

	const navs = [
		{ name: "Search", href: "/" },
		{ name: "Chat", href: "/chat" },
		{ name: "Console", href: "/console" },
	];

	return (
		<header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center px-6 py-4">
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
