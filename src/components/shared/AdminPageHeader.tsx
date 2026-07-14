import styles from '@/app/admin/admin.module.css';

interface AdminPageHeaderProps {
  eyebrow: string;
  title: string;
  badge?: string;
}

export default function AdminPageHeader({ eyebrow, title, badge }: AdminPageHeaderProps) {
  return (
    <header className={styles.header}>
      <div>
        <p>{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {badge && <span>{badge}</span>}
    </header>
  );
}
