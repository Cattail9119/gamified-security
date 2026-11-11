import type { CipherLabTask } from '../types/content';
import type { TaskTypeDef, WorkspaceProps } from './types';

// Частотний аналіз: учень рахує літери, призначає заміни (шифр → текст), бачить, як проступають слова,
// і виводить ключ із замін. Повного розшифрування з довільним ключем немає — інакше це знову перебір.

const A = 65;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const idx = (ch: string) => ch.charCodeAt(0) - A;

/** Зсув між літерою шифровки і літерою відкритого тексту */
const shiftOf = (cipher: string, plain: string) => (idx(cipher) - idx(plain) + 26) % 26;

/** Справжній ключ: з першої пари літер шифровки й відкритого тексту */
function trueKey(task: CipherLabTask): number {
  const c = task.ciphertext.toUpperCase();
  const p = task.plaintext.toUpperCase();
  for (let i = 0; i < c.length; i++) {
    if (/[A-Z]/.test(c[i]) && /[A-Z]/.test(p[i] ?? '')) return shiftOf(c[i], p[i]);
  }
  return 0;
}

function frequencies(text: string): { letter: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const ch of text.toUpperCase()) if (/[A-Z]/.test(ch)) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  return ALPHABET.filter((l) => counts.has(l))
    .map((letter) => ({ letter, count: counts.get(letter)! }))
    .sort((a, b) => b.count - a.count || a.letter.localeCompare(b.letter));
}

export interface CipherLabAnswer {
  /** Обрана літера шифровки */
  selected: string | null;
  /** Заміни: літера шифровки → літера відкритого тексту */
  map: Record<string, string>;
  key: string;
}

const parseKey = (s: string) => (/^\s*\d{1,2}\s*$/.test(s) ? Number(s) : NaN);

function Workspace({ task, answer, onChange, disabled }: WorkspaceProps<CipherLabTask, CipherLabAnswer>) {
  const freq = frequencies(task.ciphertext);
  const max = freq[0]?.count ?? 1;
  const { selected, map } = answer;
  const pairs = Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  const shifts = [...new Set(pairs.map(([c, p]) => shiftOf(c, p)))];
  const used = new Set(Object.values(map));

  const setMap = (cipher: string, plain: string) => {
    const next = { ...map };
    if (plain) next[cipher] = plain;
    else delete next[cipher];
    onChange({ ...answer, map: next });
  };

  return (
    <div className="cipherlab">
      <section className="freq-panel">
        <div className="panel-label">Крок 1. Частоти літер у шифровці</div>
        <div className="freq" role="group" aria-label="Оберіть літеру шифровки">
          {freq.map(({ letter, count }) => (
            <button
              type="button"
              key={letter}
              disabled={disabled}
              className={`freq-bar${selected === letter ? ' selected' : ''}${map[letter] ? ' mapped' : ''}`}
              onClick={() => onChange({ ...answer, selected: letter })}
              aria-pressed={selected === letter}
              aria-label={`${letter}: ${count} разів${map[letter] ? `, замінено на ${map[letter]}` : ''}`}
            >
              <span className="freq-count mono">{count}</span>
              <span className="freq-col"><span className="freq-fill" style={{ transform: `scaleY(${count / max})` }} /></span>
              <span className="freq-letter mono">{letter}</span>
              <span className="freq-plain mono">{map[letter] ?? '·'}</span>
            </button>
          ))}
        </div>
        <p className="note">Натисніть на стовпчик, щоб обрати літеру. Під літерою видно її заміну.</p>
      </section>

      <section className="cipher-control">
        <div className="panel-label">Крок 2. Що означає ця літера?</div>
        {selected ? (
          <div className="map-row">
            <span className="mono map-from">{selected}</span>
            <span aria-hidden>→</span>
            <select
              className="slot mono"
              aria-label={`Літера відкритого тексту для ${selected}`}
              value={map[selected] ?? ''}
              disabled={disabled}
              onChange={(e) => setMap(selected, e.target.value)}
            >
              <option value="">—</option>
              {ALPHABET.map((l) => (
                <option key={l} value={l} disabled={used.has(l) && map[selected] !== l}>{l}</option>
              ))}
            </select>
            {map[selected] && (
              <span className="map-shift">зсув <span className="mono">{shiftOf(selected, map[selected])}</span></span>
            )}
          </div>
        ) : (
          <p className="note">Спершу оберіть літеру на кроці 1. Почніть із найчастішої.</p>
        )}
        {pairs.length > 0 && (
          <ul className="map-list">
            {pairs.map(([c, p]) => (
              <li key={c}>
                <span className="mono">{c} → {p}</span>
                <span className="map-shift">зсув <span className="mono">{shiftOf(c, p)}</span></span>
                {!disabled && (
                  <button type="button" className="map-remove" onClick={() => setMap(c, '')} aria-label={`Прибрати заміну ${c}`}>×</button>
                )}
              </li>
            ))}
          </ul>
        )}
        {shifts.length > 1 && (
          <p className="note warn-note">Заміни дають різні зсуви ({shifts.join(', ')}). У шифрі Цезаря зсув для всіх літер однаковий — одна із замін хибна.</p>
        )}
      </section>

      <div className="editor">
        <div className="editor-bar">
          <span>Шифровка з вашими замінами</span>
          <span>замін: {pairs.length}</span>
        </div>
        <pre className="query cipher-text">
          {task.ciphertext.split('').map((ch, i) => {
            const up = ch.toUpperCase();
            if (!/[A-Z]/.test(up)) return ch;
            const p = map[up];
            return p
              ? <span key={i} className="ct-plain">{p}</span>
              : <span key={i} className={`ct-raw${selected === up ? ' ct-sel' : ''}`}>{up}</span>;
          })}
        </pre>
      </div>

      <section className="cipher-control">
        <div className="panel-label">Крок 3. Ключ</div>
        <div className="map-row">
          <label htmlFor="cipher-key" className="note" style={{ margin: 0 }}>Ключ (зсув від 0 до 25)</label>
          <input
            id="cipher-key"
            className="text-input mono key-input"
            inputMode="numeric"
            autoComplete="off"
            value={answer.key}
            disabled={disabled}
            onChange={(e) => onChange({ ...answer, key: e.target.value.replace(/[^\d]/g, '').slice(0, 2) })}
          />
        </div>
      </section>
    </div>
  );
}

export const cipherLab: TaskTypeDef<CipherLabTask, CipherLabAnswer> = {
  label: 'Лабораторія шифру',
  initialAnswer: () => ({ selected: null, map: {}, key: '' }),
  isAnswered: (a) => !Number.isNaN(parseKey(a.key)) && parseKey(a.key) <= 25,
  check: (task, a) => parseKey(a.key) === trueKey(task),
  feedback: (task, a) => {
    const pairs = Object.entries(a.map);
    if (pairs.length === 0) return 'Спершу знайдіть найчастішу літеру і припустіть, яку літеру вона означає.';
    const k = trueKey(task);
    const wrong = pairs.filter(([c, p]) => shiftOf(c, p) !== k).length;
    if (wrong > 0) return 'Перевірте заміни: чи складаються з них справжні англійські слова?';
    return 'Заміни правильні — порахуйте зсув між літерою шифровки і літерою тексту.';
  },
  Workspace,
};
