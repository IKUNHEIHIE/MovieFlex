'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PageTransitionProps {
  children: React.ReactNode;
  pathname?: string;
}

export default function PageTransition({ children, pathname }: PageTransitionProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Handle route change detection
    if (pathname) {
      setIsVisible(false);
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  const variants = {
    enter: {
      opacity: 0,
      y: 20,
      scale: 0.98,
    },
    center: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.3,
        ease: 'easeOut',
      },
    },
    exit: {
      opacity: 0,
      y: -10,
      scale: 0.98,
      transition: {
        duration: 0.2,
        ease: 'easeIn',
      },
    },
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial="enter"
        animate="center"
        exit="exit"
        variants={variants}
        style={{ minHeight: 'calc(100vh - 200px)' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
