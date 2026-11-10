import type { PasswordLabTask } from '../types/content';
import type { TaskTypeDef, WorkspaceProps } from './types';

const GUESSES_PER_SEC = 1e10; // швидкий офлайн-підбір по викраденому хешу
const SECONDS_PER_YEAR = 31_557_600;

const poolOf = (s: string) => {
  let pool = 0;
  if (/[a-z]/.test(s)) pool += 26;
  if (/[A-Z]/.test(s)) pool += 26;
  if (/[а-яіїєґ]/.test(s)) pool += 33;
  if (/[А-ЯІЇЄҐ]/.test(s)) pool += 33;
  if (/\d/.test(s)) pool += 10;
  if (/[^\p{L}\d]/u.test(s)) pool += 33;
  return Math.max(pool, 1);
};

/** Орієнтовна ентропія: слово зі словника ≈ 13 біт, решта — випадкові символи. */
export function estimateBits(pw: string): number {
  if (!pw) return 0;
  const parts = pw.split(/[\s\-_.,;:+=]+/).filter(Boolean);
  let bits = Math.max(parts.length - 1, 0) * 3;
  for (const p of parts) {
    const m = p.match(/^(\p{L}{3,10})([^\p{L}]*)$/u);
    if (m) {
      const [, word, suffix] = m;
      bits += 13 + (/^\p{Lu}/u.test(word) ? 1 : 0);
      if (suffix) bits += suffix.length * Math.log2(/\d/.test(suffix) && !/\D/.test(suffix) ? 10 : 43);
    } else {
      bits += p.length * Math.log2(poolOf(p));
    }
  }
  return bits;
}

export const yearsToCrack = (bits: number) => 2 ** bits / GUESSES_PER_SEC / SECONDS_PER_YEAR / 2;

export function formatTime(years: number): string {
  const sec = years * SECONDS_PER_YEAR;
  if (sec < 1) return 'миттєво';
  if (sec < 60) return `${Math.round(sec)} с`;
  if (sec < 3600) return `${Math.round(sec / 60)} хв`;
  if (sec < 86400) return `${Math.round(sec / 3600)} год`;
  if (years < 1) return `${Math.round(sec / 86400)} діб`;
  if (years < 1000) return `${Math.round(years)} років`;
  if (years < 1e6) return 'тисячі років';
  return 'мільйони років і більше';
}

// «Leet»-заміни (P@ssw0rd → password): атакувальники теж їх враховують
const unleet = (s: string) => s.toLowerCase().replace(/[@4]/g, 'a').replace(/0/g, 'o').replace(/[1!|]/g, 'i').replace(/3/g, 'e').replace(/[$5]/g, 's').replace(/7/g, 't');

const hasSequence = (s: string) => {
  const t = s.toLowerCase();
  for (let i = 0; i + 2 < t.length; i++) {
    const a = t.charCodeAt(i), b = t.charCodeAt(i + 1), c = t.charCodeAt(i + 2);
    if ((b - a === 1 && c - b === 1) || (a === b && b === c)) return true;
  }
  return /qwe|asd|zxc|йцу|фыв/i.test(t);
};

interface Rule { id: string; label: string; ok: boolean }

export function evaluate(task: PasswordLabTask, pw: string) {
  const low = pw.toLowerCase();
  const bits = estimateBits(pw);
  const years = yearsToCrack(bits);
  const plain = unleet(pw);
  const personal = task.forbidden.some((f) => low.includes(f.toLowerCase()) || plain.includes(f.toLowerCase()));
  const common = task.common.some((c) => low.includes(c.toLowerCase()) || plain.includes(c.toLowerCase())) || hasSequence(pw);
  const rules: Rule[] = [
    { id: 'len', label: `Щонайменше ${task.minLength} символів`, ok: pw.length >= task.minLength },
    { id: 'personal', label: 'Без особистих даних із профілю', ok: pw.length > 0 && !personal },
    { id: 'common', label: 'Без поширених слів, послідовностей і повторів (123, qwe, aaa)', ok: pw.length > 0 && !common },
    { id: 'time', label: `Орієнтовний час підбору — від ${task.minYears} років`, ok: years >= task.minYears },
  ];
  return { rules, bits, years };
}

function Workspace({ task, answer, onChange, disabled }: WorkspaceProps<PasswordLabTask, string>) {
  const { rules, bits, years } = evaluate(task, answer);
  const meter = Math.min(bits / 90, 1);
  return (
    <div className="pwlab">
      <div className="pw-profile">
        <div className="panel-label">Профіль власника акаунта</div>
        <ul>
          {task.profile.map((l, i) => <li key={i}>{l}</li>)}
        </ul>
      </div>
      <label className="pw-field">
        <span className="panel-label">Придумайте пароль</span>
        <input
          className="text-input mono pw-input"
          value={answer}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Введіть тестовий пароль"
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      <p className="note">Це навчальна форма: не вводіть сюди свої справжні паролі.</p>
      <div className="pw-meter" aria-hidden>
        <div className={`pw-meter-fill${years >= task.minYears ? ' ok' : ''}`} style={{ transform: `scaleX(${meter})` }} />
      </div>
      <div className="pw-time">
        Час підбору: <strong className="mono">{answer ? formatTime(years) : '—'}</strong>
        <span className="muted"> · ≈ {Math.round(bits)} біт, 10 млрд спроб/с</span>
      </div>
      <ul className="pw-rules">
        {rules.map((r) => (
          <li key={r.id} className={r.ok ? 'ok' : ''}>
            <span className="dot" />{r.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export const passwordLab: TaskTypeDef<PasswordLabTask, string> = {
  label: 'Лабораторія паролів',
  initialAnswer: () => '',
  isAnswered: (a) => a.length > 0,
  check: (task, a) => evaluate(task, a).rules.every((r) => r.ok),
  feedback: (task, a) => {
    const n = evaluate(task, a).rules.filter((r) => !r.ok).length;
    return `Не виконано умов: ${n}.`;
  },
  Workspace,
};
