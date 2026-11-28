import { useState, type DragEvent } from 'react';
import { InlineText } from '../components/RichText';
import type { SortBinsTask } from '../types/content';
import type { TaskTypeDef, WorkspaceProps } from './types';

/** answer[i] – id кошика для task.items[i] або null (ще не розкладено) */
type Answer = (string | null)[];

function Workspace({ task, answer, onChange, disabled }: WorkspaceProps<SortBinsTask, Answer>) {
  const [picked, setPicked] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const place = (item: number, bin: string | null) => {
    onChange(answer.map((x, i) => (i === item ? bin : x)));
    setPicked(null);
  };

  const dropProps = (bin: string | null) => ({
    onDragOver: (e: DragEvent) => {
      if (disabled) return;
      e.preventDefault();
      setDragOver(bin ?? '');
    },
    onDragLeave: () => setDragOver(null),
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      setDragOver(null);
      const i = Number(e.dataTransfer.getData('text/plain'));
      if (!Number.isNaN(i)) place(i, bin);
    },
  });

  const chip = (i: number) => (
    <button
      type="button"
      key={i}
      className={`bin-chip${picked === i ? ' picked' : ''}`}
      aria-pressed={picked === i}
      disabled={disabled}
      draggable={!disabled}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(i));
      }}
      onClick={() => setPicked(picked === i ? null : i)}
    >
      <InlineText text={task.items[i].text} />
    </button>
  );

  const pool = task.items.map((_, i) => i).filter((i) => answer[i] === null);

  return (
    <div className="sortbins">
      <p className="note">
        Оберіть елемент, а потім кошик, у який його покласти (або перетягніть мишею). Щоб перекласти, оберіть елемент знову.
      </p>
      <div
        className={`bin-pool${dragOver === '' ? ' over' : ''}${picked !== null && answer[picked] !== null ? ' can-return' : ''}`}
        {...dropProps(null)}
      >
        <div className="bin-pool-head">
          <span className="panel-label">Нерозкладені · <span className="mono">{pool.length}</span></span>
          {picked !== null && answer[picked] !== null && !disabled && (
            <button type="button" className="link-button" onClick={() => place(picked, null)}>
              Повернути сюди
            </button>
          )}
        </div>
        {pool.length ? <div className="bin-chips">{pool.map(chip)}</div> : <p className="note bin-empty">Усе розкладено</p>}
      </div>

      <div className={`bins bins-${task.layout ?? 'columns'}`}>
        {task.bins.map((b) => {
          const inside = task.items.map((_, i) => i).filter((i) => answer[i] === b.id);
          const target = picked !== null && answer[picked] !== b.id && !disabled;
          return (
            <section key={b.id} className={`bin${dragOver === b.id ? ' over' : ''}${target ? ' target' : ''}`} {...dropProps(b.id)}>
              <button
                type="button"
                className="bin-head"
                disabled={!target}
                onClick={() => picked !== null && place(picked, b.id)}
                aria-label={target ? `Покласти в «${b.label}»` : b.label}
              >
                <span className="bin-label">{b.label}</span>
                {b.note && <span className="bin-note">{b.note}</span>}
                {target && <span className="bin-put">Покласти сюди</span>}
              </button>
              <div className="bin-chips">{inside.map(chip)}</div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

const wrongCount = (task: SortBinsTask, a: Answer) => task.items.filter((it, i) => a[i] !== it.bin).length;

export const sortBins: TaskTypeDef<SortBinsTask, Answer> = {
  label: 'Розклади по кошиках',
  initialAnswer: (task) => task.items.map(() => null),
  isAnswered: (a) => a.every((x) => x !== null),
  check: (task, a) => wrongCount(task, a) === 0,
  feedback: (task, a) => `Не на своїх місцях: ${wrongCount(task, a)} з ${task.items.length}.`,
  Workspace,
};
