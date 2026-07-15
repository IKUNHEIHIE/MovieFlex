'use client';

import { motion } from 'framer-motion';
import React from 'react';

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  style?: React.CSSProperties;
}

export default function AnimatedCard({ children, className, delay = 0, style }: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.4, 
        delay,
        ease: [0.4, 0, 0.2, 1]
      }}
      whileHover={{ 
        scale: 1.02,
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
      }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}
