import Link from 'next/link';

interface FilterRowProps {
  label: string;
  items: Array<{ id: string | number; name: string }>;
  activeId: string | number | undefined;
  getQueryUrl: (params: Record<string, string | number | undefined | null>) => string;
  paramName: string;
}

export default function FilterRow({ label, items, activeId, getQueryUrl, paramName }: FilterRowProps) {
  return (
    <div className="filter-row">
      <span className="filter-label">{label}:</span>
      <div className="filter-items">
        <Link href={getQueryUrl({ [paramName]: null })} className={`filter-item ${!activeId ? 'active' : ''}`}>全部</Link>
        {items.map((item) => (
          <Link
            href={getQueryUrl({ [paramName]: item.id })}
            key={item.id}
            className={`filter-item ${activeId === item.id ? 'active' : ''}`}
          >
            {item.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
