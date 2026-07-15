'use client';

import { motion } from 'framer-motion';
import React from 'react';

interface ChartContainerProps {
  children: React.ReactNode;
  title?: string;
  loading?: boolean;
  height?: number;
}

export default function ChartContainer({ 
  children, 
  title, 
  loading = false,
  height = 450 
}: ChartContainerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      style={{
        background: 'white',
        borderRadius: 12,
        padding: 24,
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        height: 'auto',
        minHeight: height
      }}
    >
      {title && (
        <motion.h3
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          style={{
            margin: '0 0 20px 0',
            fontSize: 18,
            fontWeight: 600,
            color: '#1a1a2e'
          }}
        >
          {title}
        </motion.h3>
      )}
      
      {loading ? (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          height: height - 100
        }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            style={{
              width: 40,
              height: 40,
              border: '3px solid #f3f3f3',
              borderTop: '3px solid #4f7df3',
              borderRadius: '50%'
            }}
          />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {children}
        </motion.div>
      )}
    </motion.div>
  );
}
