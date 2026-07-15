'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const FLAKES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export default function Snowfall() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const isExcluded = pathname.startsWith('/admin') || pathname.startsWith('/dashboard') || pathname.startsWith('/user') || pathname.startsWith('/movie/');

  if (isExcluded) return null;

  return (
    <div className="snowfall" aria-hidden="true">
      {FLAKES.map((flake) => <span className="snowflake" key={flake} />)}
    </div>
  );
}
