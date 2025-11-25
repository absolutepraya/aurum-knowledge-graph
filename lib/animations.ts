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
			stiffness: 100, // Restore smooth feel
			damping: 10, // Restore smooth feel
		},
	},
};
