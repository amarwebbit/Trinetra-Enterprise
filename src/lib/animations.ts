export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.3, ease: 'easeInOut' },
};

export const slideIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3, ease: 'easeOut' },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.2, ease: 'easeOut' },
};

export const staggerChildren = (delay: number = 0.1) => ({
  animate: {
    transition: {
      staggerChildren: delay,
    },
  },
});

export const slideFromRight = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.3, ease: 'easeOut' },
};

export const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 30 },
  transition: { duration: 0.4, ease: 'easeOut' },
};

export const pulse = {
  initial: { scale: 1 },
  animate: { 
    scale: [1, 1.02, 1],
    transition: { 
      duration: 2, 
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

export const shimmer = {
  initial: { backgroundPosition: '200% 0' },
  animate: { 
    backgroundPosition: ['200% 0', '-200% 0'],
    transition: { 
      duration: 2, 
      repeat: Infinity,
      ease: 'linear',
    },
  },
};
