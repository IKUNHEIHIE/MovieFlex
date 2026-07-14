import prisma from '@/lib/prisma';
import MappingManager from '@/components/admin/MappingManager';
import styles from '../admin.module.css';

export default async function AdminMappingsPage() {
  const [mappings, categories] = await Promise.all([prisma.categoryMapping.findMany({ where: { status: 'PENDING_REVIEW' }, orderBy: { createdAt: 'asc' }, take: 200 }), prisma.category.findMany({ orderBy: { sortOrder: 'asc' }, select: { id: true, name: true } })]);
  return <><header className={styles.header}><div><p>MAPPINGS</p><h1>分类映射审核</h1></div><span>{mappings.length} 项待处理</span></header><section className={styles.panel}>{mappings.length ? <MappingManager initialMappings={mappings} categories={categories} /> : <p>当前没有待审核的来源分类映射。</p>}</section></>;
}
