'use client';

import { motion } from 'framer-motion';

interface StatusIndicatorProps {
  status: 'ok' | 'degraded' | 'failed';
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

const statusConfig = {
  ok: { color: '#22c55e', label: '正常' },
  degraded: { color: '#f59e0b', label: '降级' },
  failed: { color: '#ef4444', label: '故障' }
};

const sizeMap = {
  small: 8,
  medium: 12,
  large: 16
};

export default function StatusIndicator({ 
  status, 
  size = 'medium',
  showLabel = true 
}: StatusIndicatorProps) {
  const config = statusConfig[status];
  const dotSize = sizeMap[size];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.8, 1, 0.8]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
        style={{
          width: dotSize,
          height: dotSize,
          borderRadius: '50%',
          backgroundColor: config.color,
          boxShadow: `0 0 ${dotSize}px ${config.color}`
        }}
      />
      {showLabel && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ 
            fontSize: 14, 
            fontWeight: 500,
            color: config.color
          }}
        >
          {config.label}
        </motion.span>
      )}
    </div>
  );
}
