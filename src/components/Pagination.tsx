'use client';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  // 5페이지씩 표시, 현재 페이지가 가운데 오도록
  const groupSize = 5;
  const groupStart = Math.floor(page / groupSize) * groupSize;
  const groupEnd = Math.min(groupStart + groupSize - 1, totalPages - 1);
  const buttons: number[] = [];
  for (let i = groupStart; i <= groupEnd; i++) buttons.push(i);

  const hasMore = groupEnd < totalPages - 1;
  const hasPrevGroup = groupStart > 0;

  const btnStyle = (active: boolean, disabled?: boolean) => ({
    background: active ? '#1A2B5E' : 'var(--color-glass)',
    color: active ? '#fff' : disabled ? 'var(--color-text-subtle)' : 'var(--color-text-secondary)',
    border: active ? '1px solid transparent' : '1px solid var(--color-glass-border)',
    opacity: disabled ? 0.4 : 1,
    cursor: disabled ? 'default' as const : 'pointer' as const,
  });

  return (
    <div className="flex items-center justify-center gap-1.5 py-2">
      {/* << 첫 페이지 */}
      <button
        disabled={page === 0}
        onClick={() => onPageChange(0)}
        className="px-2 py-1.5 rounded-lg text-[12px] font-bold transition-all"
        style={btnStyle(false, page === 0)}
      >
        {'<<'}
      </button>
      {/* < 이전 */}
      <button
        disabled={page === 0}
        onClick={() => onPageChange(Math.max(0, page - 1))}
        className="px-2 py-1.5 rounded-lg text-[12px] font-bold transition-all"
        style={btnStyle(false, page === 0)}
      >
        {'<'}
      </button>

      {/* 이전 그룹 표시 */}
      {hasPrevGroup && (
        <span className="text-[12px] px-1" style={{ color: 'var(--color-text-muted)' }}>...</span>
      )}

      {/* 페이지 번호 */}
      {buttons.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className="w-8 h-8 rounded-lg text-[12px] font-semibold transition-all"
          style={btnStyle(p === page)}
        >
          {p + 1}
        </button>
      ))}

      {/* 다음 그룹 표시 */}
      {hasMore && (
        <span className="text-[12px] px-1" style={{ color: 'var(--color-text-muted)' }}>...</span>
      )}

      {/* > 다음 */}
      <button
        disabled={page >= totalPages - 1}
        onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
        className="px-2 py-1.5 rounded-lg text-[12px] font-bold transition-all"
        style={btnStyle(false, page >= totalPages - 1)}
      >
        {'>'}
      </button>
      {/* >> 끝 페이지 */}
      <button
        disabled={page >= totalPages - 1}
        onClick={() => onPageChange(totalPages - 1)}
        className="px-2 py-1.5 rounded-lg text-[12px] font-bold transition-all"
        style={btnStyle(false, page >= totalPages - 1)}
      >
        {'>>'}
      </button>
    </div>
  );
}
