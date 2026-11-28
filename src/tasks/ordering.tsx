import { useEffect, useRef, useState } from 'react';
import { InlineText } from '../components/RichText';
import type { OrderingTask } from '../types/content';
import { shuffledIndices, type TaskTypeDef, type WorkspaceProps } from './types';

/** answer[pos] – індекс елемента з task.items, що стоїть на позиції pos */
type Answer = number[];

function move(a: Answer, from: number, to: number): Answer {
  const r = [...a];
  const [x] = r.splice(from, 1);
  r.splice(to, 0, x);
  return r;
}

function Workspace({ task, answer, onChange, disabled }: WorkspaceProps<OrderingTask, Answer>) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  // Після переміщення кнопками фокус лишається на тому самому елементі
  const focusRef = useRef<{ item: number; dir: 'up' | 'down' } | null>(null);
  const btns = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    const f = focusRef.current;
    if (!f) return;
    focusRef.current = null;
    const el = btns.current.get(`${f.item}-${f.dir}`);
    if (el && !el.disabled) el.focus();
    else btns.current.get(`${f.item}-${f.dir === 'up' ? 'down' : 'up'}`)?.focus();
  }, [answer]);

  const shift = (pos: number, dir: 'up' | 'down') => {
    const to = dir === 'up' ? pos - 1 : pos + 1;
    if (to < 0 || to >= answer.length) return;
    focusRef.current = { item: answer[pos], dir };
    onChange(move(answer, pos, to));
  };

  return (
    <>
      <p className="note">Перетягніть кроки мишею або переставляйте кнопками ↑ ↓. Перший крок – угорі</p>
      <ol className="order-list">
        {answer.map((item, pos) => (
          <li
            key={item}
            className={`order-item${dragging === pos ? ' dragging' : ''}${over === pos && dragging !== null && dragging !== pos ? ' drop-target' : ''}`}
            draggable={!disabled}
            onDragStart={(e) => {
              setDragging(pos);
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', String(pos));
            }}
            onDragOver={(e) => {
              if (dragging === null) return;
              e.preventDefault();
              setOver(pos);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragging !== null && dragging !== pos) onChange(move(answer, dragging, pos));
              setDragging(null);
              setOver(null);
            }}
            onDragEnd={() => {
              setDragging(null);
              setOver(null);
            }}
          >
            <span className="order-pos mono" aria-hidden>{pos + 1}</span>
            <span className="order-text">
              <InlineText text={task.items[item]} />
            </span>
            <span className="order-btns">
              {(['up', 'down'] as const).map((dir) => (
                <button
                  key={dir}
                  type="button"
                  className="icon-btn"
                  ref={(el) => {
                    const k = `${item}-${dir}`;
                    if (el) btns.current.set(k, el);
                    else btns.current.delete(k);
                  }}
                  aria-label={`${dir === 'up' ? 'Вище' : 'Нижче'}: крок ${pos + 1}`}
                  disabled={disabled || (dir === 'up' ? pos === 0 : pos === answer.length - 1)}
                  onClick={() => shift(pos, dir)}
                >
                  {dir === 'up' ? '↑' : '↓'}
                </button>
              ))}
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}

const inPlace = (a: Answer) => a.filter((x, i) => x === i).length;

export const ordering: TaskTypeDef<OrderingTask, Answer> = {
  label: 'Порядок',
  initialAnswer: (task) => shuffledIndices(task.items.length, task.id),
  isAnswered: () => true,
  check: (task, a) => a.length === task.items.length && inPlace(a) === task.items.length,
  feedback: (task, a) => `На своїх місцях ${inPlace(a)} з ${task.items.length} кроків.`,
  Workspace,
};
