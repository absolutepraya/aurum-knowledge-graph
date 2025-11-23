"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ArtistGraphData, GraphNode } from "@/app/action";
import type { ForceGraphMethods } from "react-force-graph-2d";

const ForceGraph2D = dynamic(
	async () => (await import("react-force-graph-2d")).default,
	{ ssr: false },
);

// Modern Luxury Palette for Graph
const colors: Record<GraphNode["group"], string> = {
	artist: "#D4AF37", // Gold
	artwork: "#ededed", // Off-white
	movement: "#C5A028", // Muted Gold
};

interface GraphVizProps {
	data: ArtistGraphData | null;
}

export default function GraphViz({ data }: GraphVizProps) {
	const router = useRouter();
	const containerRef = useRef<HTMLDivElement | null>(null);
	const fgRef = useRef<ForceGraphMethods | undefined>(undefined);
	const [size, setSize] = useState({ width: 0, height: 0 });

	useEffect(() => {
		if (!containerRef.current) return;
		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { width, height } = entry.contentRect;
				setSize({ width, height });
			}
		});
		observer.observe(containerRef.current);
		return () => observer.disconnect();
	}, []);

	const graphData = useMemo(() => data ?? { nodes: [], links: [] }, [data]);
	const width = size.width || 800;
	const height = size.height || 500;

	useEffect(() => {
		if (!fgRef.current) return;
		const linkForce = fgRef.current.d3Force("link");
		if (
			linkForce &&
			"distance" in linkForce &&
			typeof linkForce.distance === "function"
		) {
			linkForce.distance(100); // Slightly tighter
		}
		// Add charge force adjustment if needed
		const chargeForce = fgRef.current.d3Force("charge");
		if (
			chargeForce &&
			"strength" in chargeForce &&
			typeof chargeForce.strength === "function"
		) {
			chargeForce.strength(-300); // More repulsion
		}
	}, []);

	useEffect(() => {
		if (!graphData.nodes.length || !fgRef.current) return;
		fgRef.current.zoomToFit(600, 24);
	}, [graphData]);

	const handleNodeClick = (node: GraphNode) => {
		if (!node.slug) return;
		if (node.group === "artist") {
			router.push(`/artist/${encodeURIComponent(node.slug)}`);
			return;
		}
		if (node.group === "artwork") {
			router.push(`/artwork/${encodeURIComponent(node.slug)}`);
		}
	};

	if (!graphData.nodes.length) {
		return (
			<div className="w-full h-[300px] flex items-center justify-center text-sm text-muted-foreground bg-transparent">
				No relationship data available.
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			className="w-full h-full min-h-[500px] bg-transparent"
		>
			<ForceGraph2D
				ref={fgRef}
				width={width}
				height={height}
				graphData={graphData}
				nodeLabel={(node) => (node as GraphNode).name}
				backgroundColor="rgba(0,0,0,0)" // Transparent background
				linkColor={() => "rgba(255,255,255,0.2)"} // Subtle white links
				linkWidth={1}
				linkDirectionalParticles={2}
				linkDirectionalParticleWidth={2}
				linkDirectionalParticleColor={() => "#D4AF37"} // Gold particles
				nodeCanvasObject={(node, ctx, globalScale) => {
					const typed = node as GraphNode & { x?: number; y?: number };
					const radius = Math.max(4, (typed.val || 6) * 0.45);
					const color = colors[typed.group] || "#94a3b8";
					const x = typed.x ?? 0;
					const y = typed.y ?? 0;

					// Glow effect
					ctx.shadowColor = color;
					ctx.shadowBlur = 10;
					ctx.beginPath();
					ctx.arc(x, y, radius, 0, Math.PI * 2);
					ctx.fillStyle = color;
					ctx.fill();
					ctx.shadowBlur = 0; // Reset shadow

					const fontSize = 12 / globalScale;
					ctx.font = `${fontSize}px Inter, sans-serif`;
					ctx.textAlign = "center";
					ctx.textBaseline = "top";
					ctx.fillStyle = "#ededed"; // Light text
					ctx.fillText(typed.name, x, y + radius + 4);
				}}
				onNodeClick={(node) => handleNodeClick(node as GraphNode)}
			/>
		</div>
	);
}
