"use client";

import Link from "next/link";
import { useMemo } from "react";

interface ArtworkCardProps {
	work: {
		id?: string;
		title: string;
		url?: string;
		info?: string;
	};
	placeholder: string;
}

export default function ArtworkCard({ work, placeholder }: ArtworkCardProps) {
	const normalizedTitle = useMemo(() => {
		return work.title.replace(
			/\w\S*/g,
			(txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(),
		);
	}, [work.title]);
	const normalizedInfo = useMemo(() => {
		if (!work.info) return "";
		return work.info.replace(
			/\w\S*/g,
			(txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(),
		);
	}, [work.info]);

	return (
		<Link
			href={`/artwork/${encodeURIComponent(work.id || work.title)}`}
			className="break-inside-avoid group relative bg-card rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 block"
		>
			<div className="relative">
				<img
					src={work.url || placeholder}
					alt={work.title}
					className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.02]"
					loading="lazy"
					onError={(event) => {
						if (event.currentTarget.src !== placeholder) {
							event.currentTarget.src = placeholder;
						}
					}}
				/>
				<div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
					<h3 className="text-xl font-bold text-white mb-1 font-serif">
						{normalizedTitle}
					</h3>
					<p className="text-sm text-gray-300 line-clamp-2">{normalizedInfo}</p>
				</div>
			</div>
			<div className="p-4 bg-card border-t border-white/5 lg:hidden">
				<h3 className="font-bold text-foreground">{normalizedTitle}</h3>
				<p className="text-xs text-muted-foreground mt-1">{normalizedInfo}</p>
			</div>
		</Link>
	);
}
