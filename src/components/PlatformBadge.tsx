import { getPlatformBrand } from '@/utils/platformConfig';

interface Props {
  name: string;
  showName?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function PlatformBadge({ name, showName = false, size = 'sm' }: Props) {
  const brand = getPlatformBrand(name);
  const iconSize = size === 'sm' ? 18 : size === 'md' ? 24 : 32;

  return (
    <span className="inline-flex items-center gap-1" title={brand.nameJP || name}>
      {brand.logo ? (
        <img
          src={brand.logo}
          alt={name}
          className="rounded-sm object-contain"
          style={{ width: iconSize, height: iconSize }}
        />
      ) : (
        <span
          className="inline-flex items-center justify-center rounded text-[11px] font-bold text-white"
          style={{ width: iconSize, height: iconSize, backgroundColor: brand.color }}
        >
          {brand.icon}
        </span>
      )}
      {showName && (
        <span className="text-[12px] text-[var(--color-text-secondary)]">
          {brand.nameJP || name}
        </span>
      )}
    </span>
  );
}
