import { useState } from 'react';
import type { CipherLabTask } from '../types/content';
import type { TaskTypeDef, WorkspaceProps } from './types';

const A = 65;
export function decrypt(text: string, shift: number): string {
  return text.replace(/[a-z]/gi, (ch) => {
    const upper = ch === ch.toUpperCase();
    const base = upper ? A : A + 32;
    return String.fromCharCode(((ch.charCodeAt(0) - base - shift + 26) % 26) + base);
  });
}
const norm = (s: string) => s.toUpperCase().replace(/\s+/g, ' ').trim();
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function Workspace({ task, answer, onChange, disabled }: WorkspaceProps<CipherLabTask, number>) {
  const [tried, setTried] = useState<number[]>([0]);
  const set = (v: number) => {
    const shift = Math.min(25, Math.max(0, v));
    onChange(shift);
    setTried((t) => (t.includes(shift) ? t : [...t, shift]));
  };
  return (
    <div className="cipherlab">
      <div className="editor">
        <div className="editor-bar"><span>Перехоплене повідомлення</span></div>
        <pre className="query cipher-text">{task.ciphertext}</pre>
      </div>
      <div className="cipher-control">
        <label htmlFor="shift">Ключ (зсув)</label>
        <input id="shift" type="range" min={0} max={25} value={answer} disabled={disabled}
          onChange={(e) => set(Number(e.target.value))} />
        <div className="stepper">
          <button type="button" className="btn btn-secondary" disabled={disabled || answer <= 0} onClick={() => set(answer - 1)} aria-label="Зменшити ключ">−</button>
          <span className="mono shift-value">{answer}</span>
          <button type="button" className="btn btn-secondary" disabled={disabled || answer >= 25} onClick={() => set(answer + 1)} aria-label="Збільшити ключ">+</button>
        </div>
      </div>
      <div className="editor">
        <div className="editor-bar">
          <span>Результат розшифрування з ключем {answer}</span>
          <span>Випробувано ключів: {tried.length} із 26</span>
        </div>
        <pre className="query cipher-text plain">{decrypt(task.ciphertext, answer)}</pre>
      </div>
      <div className="alphabet" aria-hidden>
        <div className="alphabet-row"><span className="alphabet-key">шифр</span>{ALPHABET.map((c) => <span key={c}>{c}</span>)}</div>
        <div className="alphabet-row"><span className="alphabet-key">текст</span>{ALPHABET.map((c, i) => <span key={c} className="plain">{ALPHABET[(i - answer + 26) % 26]}</span>)}</div>
      </div>
    </div>
  );
}

export const cipherLab: TaskTypeDef<CipherLabTask, number> = {
  label: 'Лабораторія шифру',
  initialAnswer: () => 0,
  isAnswered: () => true,
  check: (task, a) => norm(decrypt(task.ciphertext, a)) === norm(task.plaintext),
  feedback: () => 'Це ще не зв’язний текст. Продовжуйте підбирати ключ.',
  Workspace,
};
