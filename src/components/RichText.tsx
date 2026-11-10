import { Fragment, type ReactNode } from 'react';
import type { RichTextValue } from '../types/content';

function toBlocks(text: RichTextValue): string[] {
  const blocks = Array.isArray(text) ? text : text.split(/\n\s*\n/);
  return blocks.map((b) => b.trim()).filter(Boolean);
}

// Інлайн-розмітка: `код` і **жирний**
function renderInline(s: string): ReactNode[] {
  return s.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.length > 1 && part.startsWith('`') && part.endsWith('`')) {
      return <code key={i}>{part.slice(1, -1)}</code>;
    }
    if (part.length > 3 && part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export function InlineText({ text }: { text: string }) {
  return <>{renderInline(text)}</>;
}

export default function RichText({ text }: { text: RichTextValue }) {
  return (
    <div className="rich">
      {toBlocks(text).map((block, i) => {
        const lines = block.split('\n');
        if (lines.every((l) => l.trim().startsWith('- '))) {
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{renderInline(l.trim().slice(2))}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {renderInline(l)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
