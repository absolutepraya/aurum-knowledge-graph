"use client";

import Image from "next/image";
import Zoom from "react-medium-image-zoom";
import "react-medium-image-zoom/dist/styles.css";

interface ArtworkImageViewerProps {
	src?: string | null;
	alt: string;
	placeholder: string;
}

export default function ArtworkImageViewer({
	src,
	alt,
	placeholder,
}: ArtworkImageViewerProps) {
	const imageSrc = src || placeholder;
	return (
		<div className="w-full">
			<Zoom>
				<Image
					src={imageSrc}
					alt={alt}
					width={1200}
					height={900}
					className="w-full h-auto object-cover rounded-xl border border-slate-200 shadow-sm"
					unoptimized
				/>
			</Zoom>
		</div>
	);
}
