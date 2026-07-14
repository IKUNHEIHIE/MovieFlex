import prisma from '@/lib/prisma';
import HealthMonitor from '@/components/admin/HealthMonitor';

export const revalidate = 3;

export default async function AdminDashboardPage() {
  const analytics = await prisma.analyticsResult.findMany({
    orderBy: { createdAt: 'desc' },
    take: 12,
  });

  return <HealthMonitor analytics={analytics} />;
}
