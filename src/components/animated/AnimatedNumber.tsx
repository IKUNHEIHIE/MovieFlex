'use client';

import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect } from 'react';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  format?: (value: number) => string;
}

export default function AnimatedNumber({ 
  value, 
  duration = 1.5,
  format = (v) => v.toLocaleString()
}: AnimatedNumberProps) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => format(Math.round(latest)));

  useEffect(() => {
    const animation = animate(count, value, { duration });
    return animation.stop;
  }, [value, duration]);

  return <motion.span>{rounded}</motion.span>;
}
