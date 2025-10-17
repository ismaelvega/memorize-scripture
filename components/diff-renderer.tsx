"use client";
import * as React from 'react';
import { DiffTokenItem } from '@/lib/utils';
import { classNames } from '@/lib/utils';

export function sanitizeDiffTokenText(raw: string, isPunct: boolean) {
  if (!raw) return '';
  let s = String(raw);
  // remove any HTML sup fragments like <sup>1</sup> (case-insensitive)
  s = s.replace(/<sup>\s*\d+\s*<\/sup>/gi, '');
  // decode non-breaking spaces
  s = s.replace(/&nbsp;/gi, ' ');
  if (isPunct) {
    return s.trim();
  }
  s = s.replace(/\d+/g, '');
  s = s.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ'\s]+/g, '');
  s = s.replace(/\s+/g, ' ');
  return s.trim();
}

interface Props {
  diff: DiffTokenItem[];
}

export const DiffRenderer: React.FC<Props> = ({ diff }) => {
  let lastRenderedVerse: number | undefined = undefined;
  return (
    <>
      {diff.map((t, i) => {
        const isPunct = t.status === 'punct';
        const showVerse = typeof t.verse === 'number' && t.verse !== lastRenderedVerse;
        if (showVerse) lastRenderedVerse = t.verse;
        const displayToken = sanitizeDiffTokenText(String(t.token), isPunct);
        return (
          <React.Fragment key={i}>
            {showVerse && <sup className='font-bold'>{t.verse}</sup>}
            <span className={classNames('px-0.5',
              t.status==='match' && 'text-neutral-800 dark:text-neutral-100',
              t.status==='missing' && 'bg-red-500/10 text-red-600 dark:text-red-400 underline',
              t.status==='extra' && 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 line-through',
              t.status==='punct' && 'bg-amber-300/20 text-amber-600 dark:text-amber-400'
            )}>{(displayToken ? displayToken + ' ' : '')}</span>
          </React.Fragment>
        );
      })}
    </>
  );
};

export default DiffRenderer;
