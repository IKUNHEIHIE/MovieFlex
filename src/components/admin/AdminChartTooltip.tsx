'use client';

import { motion } from 'framer-motion';
import styles from '@/app/admin/admin.module.css';

export type AdminChartTooltipItem = {
  label: string;
  value: React.ReactNode;
  color?: string;
};

export default function AdminChartTooltip({
  title,
  items,
}: {
  title: React.ReactNode;
  items: AdminChartTooltipItem[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className={styles.chartTooltip}
    >
      <strong>{title}</strong>
      <div className={styles.chartTooltipItems}>
        {items.map((item) => (
          <div key={item.label} className={styles.chartTooltipItem}>
            {item.color && <span className={styles.chartTooltipDot} style={{ backgroundColor: item.color }} />}
            <span>{item.label}</span>
            <b>{item.value}</b>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
