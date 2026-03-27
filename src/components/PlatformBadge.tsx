import { getPlatformBrand } from '@/utils/platformConfig';

interface Props {
  name: string;
  showName?: boolean;
  size?: 'sm' | 'md';
}

export function PlatformBadge({ name, showName = true, size = 'sm' }: Props) {
  const brand = getPlatformBrand(name);
  const iconSize = size === 'sm' ? 16 : 20;

  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
      style={{
        backgroundColor: brand.bgColor,
        color: brand.color,
        border: `1px solid ${brand.borderColor}`,
      }}
    >
      {brand.logo ? (
        <img
          src={brand.logo}
          alt={name}
          className="rounded-sm object-contain"
          style={{ width: iconSize, height: iconSize }}
        />
      ) : (
        <span className="font-bold">{brand.icon}</span>
      )}
      {showName && <span>{brand.nameJP || name}</span>}
    </span>
  );
}
