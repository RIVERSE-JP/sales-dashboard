import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { generateInsights } from '@/utils/insights';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { PlatformSummary, TitleSummary, Language } from '@/types';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AIPlatformMonitorProps {
  platformSummary: PlatformSummary[];
  titleSummary: TitleSummary[];
  language: Language;
}

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  show: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const borderColorMap: Record<string, string> = {
  success: 'border-l-emerald-500',
  warning: 'border-l-amber-500',
  info: 'border-l-blue-500',
};

const bgColorMap: Record<string, string> = {
  success: 'bg-emerald-500/5',
  warning: 'bg-amber-500/5',
  info: 'bg-blue-500/5',
};

function formatTime(language: Language): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  if (language === 'ko') {
    return `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${hours}:${minutes} \uC0DD\uC131`;
  }
  return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${hours}:${minutes} \u751F\u6210`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AIPlatformMonitor({
  platformSummary,
  titleSummary,
  language,
}: AIPlatformMonitorProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const insights = useMemo(
    () => generateInsights(platformSummary, titleSummary, language),
    [platformSummary, titleSummary, language],
  );

  const generatedAt = useMemo(() => formatTime(language), [language]);

  if (insights.length === 0) return null;

  return (
    <Card variant="glass" className="overflow-hidden">
      {/* -------------------------------------------------------------- */}
      {/*  Header                                                         */}
      {/* -------------------------------------------------------------- */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className={cn(
          'w-full flex items-center justify-between px-6 py-4',
          'cursor-pointer select-none',
          'transition-colors duration-200 hover:bg-accent/40',
        )}
      >
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-blue-500/20">
            <Sparkles size={18} className="text-violet-500" />
            {/* Animated pulse ring */}
            <span className="absolute inset-0 rounded-lg bg-gradient-to-br from-violet-500/10 to-blue-500/10 animate-ping opacity-40" />
          </div>
          <span
            className={cn(
              'text-base font-bold tracking-tight',
              'bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent',
            )}
          >
            {language === 'ko' ? 'AI \uC778\uC0AC\uC774\uD2B8' : 'AI\u30A4\u30F3\u30B5\u30A4\u30C8'}
          </span>
          <span className="text-xs text-muted-foreground font-medium ml-1">
            ({insights.length})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {generatedAt}
          </span>
          {isExpanded ? (
            <ChevronUp size={18} className="text-muted-foreground" />
          ) : (
            <ChevronDown size={18} className="text-muted-foreground" />
          )}
        </div>
      </button>

      {/* -------------------------------------------------------------- */}
      {/*  Body                                                           */}
      {/* -------------------------------------------------------------- */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="insights-body"
            initial="hidden"
            animate="show"
            exit="exit"
            variants={containerVariants}
          >
            <CardContent className="pt-0 pb-4 px-6">
              <div className="space-y-2.5">
                {insights.map((insight, index) => (
                  <motion.div
                    key={index}
                    variants={itemVariants}
                    className={cn(
                      'flex items-start gap-3 rounded-lg px-4 py-3',
                      'border-l-[3px] transition-colors duration-200',
                      borderColorMap[insight.type],
                      bgColorMap[insight.type],
                    )}
                  >
                    <span className="text-lg leading-none mt-0.5 flex-shrink-0">
                      {insight.icon}
                    </span>
                    <p className="text-sm leading-relaxed text-foreground/90">
                      {insight.text}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* Footer */}
              <p className="text-[11px] text-muted-foreground mt-4 text-right sm:hidden">
                {generatedAt}
              </p>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
