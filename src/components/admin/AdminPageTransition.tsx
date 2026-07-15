'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import styles from '@/app/admin/admin.module.css';

export default function AdminPageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className={styles.adminPageTransition}>
      {children}
    </div>
  );
}
