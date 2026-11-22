import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { FontSize } from '../../types/book';

const FONT_SIZE_CLASSES: Record<FontSize, string> = {
  sm: 'text-[16px] sm:text-[17px]',
  md: 'text-[18px] sm:text-[19px]',
  lg: 'text-[20px] sm:text-[22px]',
  xl: 'text-[23px] sm:text-[25px]',
};

interface MarkdownContentProps {
  markdown: string;
  fontSize: FontSize;
  className?: string;
}

export const MarkdownContent = memo(function MarkdownContent({
  markdown,
  fontSize,
  className = '',
}: MarkdownContentProps) {
  return (
    <div className={`reader-prose ${FONT_SIZE_CLASSES[fontSize]} ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </div>
  );
});
