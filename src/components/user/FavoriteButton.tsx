'use client';

import { useState } from 'react';

export default function FavoriteButton({ movieId, initialFavorite }: { movieId: number; initialFavorite: boolean }) {
  const [favorite, setFavorite] = useState(initialFavorite);
  const [loading, setLoading] = useState(false);
  const toggle = async () => {
    setLoading(true);
    const response = await fetch(`/api/user/favorites/${movieId}`, { method: favorite ? 'DELETE' : 'POST' });
    if (response.ok) setFavorite((value) => !value);
    setLoading(false);
  };
  return <button className="btn" disabled={loading} onClick={() => void toggle()}>{favorite ? '取消收藏' : '收藏影片'}</button>;
}
