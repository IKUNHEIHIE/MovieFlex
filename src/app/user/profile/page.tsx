import prisma from '@/lib/prisma';
import { getRecommendationRail } from '@/lib/recommendations';
import MovieGridSection from '@/components/user/MovieGridSection';
import { getSessionUser } from '@/lib/auth/session-user';
import { redirect } from 'next/navigation';
import AssistantHistoryPanel from '@/components/user/AssistantHistoryPanel';

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const userId = Number(user.id);
  const [favoriteCount, historyCount, favorites, history, recommendations, aiConversations] = await Promise.all([prisma.userFavorite.count({ where: { userId } }), prisma.watchHistory.count({ where: { userId } }), prisma.userFavorite.findMany({ where: { userId }, include: { movie: true }, orderBy: { createdAt: 'desc' }, take: 4 }), prisma.watchHistory.findMany({ where: { userId }, include: { movie: true }, orderBy: { lastWatchedAt: 'desc' }, take: 4 }), getRecommendationRail(userId), prisma.aiConversation.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, take: 5, include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } } })]);
  return <main className="container" style={{ paddingTop: 36, paddingBottom: 60 }}><section className="glass" style={{ padding: 28, borderRadius: 12, marginBottom: 20 }}><h1>个人中心</h1><p>{user.username} · {user.role === 'ADMIN' ? '管理员' : '用户'}</p><div style={{ display: 'flex', gap: 24 }}><strong>{favoriteCount} 个收藏</strong><strong>{historyCount} 条观看记录</strong><strong>{aiConversations.length} 个 AI 会话</strong></div></section><AssistantHistoryPanel conversations={aiConversations} /><MovieGridSection title="最近观看" movies={history.map(({ movie }) => movie)} emptyMessage="开始观看影片后，这里会记录你的足迹。" /><MovieGridSection title="最近收藏" movies={favorites.map(({ movie }) => movie)} emptyMessage="收藏喜欢的影片，方便下次继续观看。" /><MovieGridSection title={recommendations.title} movies={recommendations.movies.slice(0, 8)} emptyMessage="" /></main>;
}
