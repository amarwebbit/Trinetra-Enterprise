'use client';

import { motion, MotionProps } from 'framer-motion';
import { fadeIn, slideIn, scaleIn, fadeInUp } from '@/lib/animations';

type AnimationVariant = 'fade' | 'slide' | 'scale' | 'fadeUp';

interface AnimatedWrapperProps extends MotionProps {
  children: React.ReactNode;
  variant?: AnimationVariant;
  delay?: number;
  className?: string;
  as?: any;
}

export function AnimatedWrapper({
  children,
  variant = 'fade',
  delay = 0,
  className = '',
  as: Component = 'div',
  ...props
}: AnimatedWrapperProps) {
  const getAnimation = () => {
    switch (variant) {
      case 'slide':
        return slideIn;
      case 'scale':
        return scaleIn;
      case 'fadeUp':
        return fadeInUp;
      default:
        return fadeIn;
    }
  };

  const animation = getAnimation();

  return (
    <motion.div
      initial={animation.initial}
      animate={animation.animate}
      exit={animation.exit}
      transition={{ ...animation.transition, delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedList({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={{
        initial: { opacity: 0 },
        animate: {
          opacity: 1,
          transition: {
            staggerChildren: 0.08,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedItem({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
