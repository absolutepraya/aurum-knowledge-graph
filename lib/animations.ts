import type { Variants } from "framer-motion";

export const containerVariants: Variants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: 0.05, // Faster stagger
			delayChildren: 0.05, // Faster delay
		},
	},
};

export const itemVariants: Variants = {
	hidden: { y: 20, opacity: 0 },
	visible: {
		y: 0,
		opacity: 1,
		transition: {
			type: "spring",
			stiffness: 260, // Much faster (was 100)
			damping: 20, // Faster settling (was 10)
		},
	},
};
