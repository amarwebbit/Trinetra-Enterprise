'use client';

import React, { useMemo } from 'react';
import katex from 'katex';

interface MathTextProps {
  text?: string | null;
  className?: string;
}

const mathCache = new Map<string, string>();

function processNonMath(segment: string): string {
  if (!segment) return '';
  // If segment contains HTML tags (such as <img...>, <p...>, <br>), preserve HTML markup cleanly
  if (/<[a-z][\s\S]*>/i.test(segment)) {
    return segment;
  }
  // Convert plain text line breaks to <br />
  return segment.replace(/\n/g, '<br />');
}

export function renderMath(input: string): string {
  if (!input) return '';
  if (mathCache.has(input)) {
    return mathCache.get(input)!;
  }
  
  // Normalize LaTeX delimiters: \[...\] -> $$...$$ and \(...\) -> $...$
  const normalized = input
    .replace(/\\\[/g, '$$')
    .replace(/\\\]/g, '$$')
    .replace(/\\\(/g, '$')
    .replace(/\\\)/g, '$');

  const regex = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g;
  let lastIndex = 0;
  const parts: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(normalized)) !== null) {
    if (match.index > lastIndex) {
      const segment = normalized.slice(lastIndex, match.index);
      parts.push(processNonMath(segment));
    }

    if (match[1]) {
      // Block Math $$...$$
      try {
        parts.push(
          katex.renderToString(match[1], {
            displayMode: true,
            throwOnError: false,
            strict: 'ignore',
          })
        );
      } catch (err) {
        parts.push(match[0]);
      }
    } else if (match[2]) {
      // Inline Math $...$
      try {
        parts.push(
          katex.renderToString(match[2], {
            displayMode: false,
            throwOnError: false,
            strict: 'ignore',
          })
        );
      } catch (err) {
        parts.push(match[0]);
      }
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < normalized.length) {
    parts.push(processNonMath(normalized.slice(lastIndex)));
  }

  const result = parts.join('');
  if (mathCache.size > 1000) mathCache.clear();
  mathCache.set(input, result);
  return result;
}

export const MathText: React.FC<MathTextProps> = ({ text, className }) => {
  const html = useMemo(() => renderMath(text ?? ''), [text]);
  
  return (
    <span 
      className={className ?? 'math-text inline-block max-w-full [&_img]:max-h-64 [&_img]:object-contain [&_img]:my-2 [&_img]:border [&_img]:border-gray-200 [&_img]:rounded'} 
      dangerouslySetInnerHTML={{ __html: html }} 
    />
  );
};

export default MathText;
