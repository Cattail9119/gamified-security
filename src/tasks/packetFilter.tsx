import { useState } from 'react';
import type { FilterPort, FilterRule, PacketFilterTask } from '../types/content';
import { evaluate, failingTests, protoHasPort } from './packetFilterSim';
import { plural, type TaskTypeDef, type WorkspaceProps } from './types';

type Answer = FilterRule[];

const NEW_RULE: FilterRule = { action: 'deny', proto: 'ip', src: 'any', dst: 'any', port: 'any' };

function hostLabel(task: PacketFilterTask, id: string) {
  return id === 'any' ? 'any' : task.hosts.find((h) => h.id === id)?.label ?? id;
}

function Workspace({ task, answer, onChange, disabled }: WorkspaceProps<PacketFilterTask, Answer>) {
  // Без liveTests результати видно після натискання «Прогнати» – і лише доки правила не змінилися
  const [shownFor, setShownFor] = useState<Answer | null>(null);
  const showResults = task.liveTests || disabled || shownFor === answer;
  const max = task.maxRules ?? 8;

  const set = (i: number, patch: Partial<FilterRule>) =>
    onChange(answer.map((r, j) => {
      if (j !== i) return r;
      const n = { ...r, ...patch };
      if (!protoHasPort(n.proto)) n.port = 'any';
      return n;
    }));
  const swap = (i: number, j: number) => {
    const r = [...answer];
    [r[i], r[j]] = [r[j], r[i]];
    onChange(r);
  };

  const sel = (i: number, field: keyof FilterRule, value: string, options: { v: string; l: string }[], label: string, off = false) => (
    <label className={`pf-field pf-${field}`}>
      <span className="pf-cap">{label}</span>
      <select
        className="slot"
        value={value}
        disabled={disabled || off}
        aria-label={`${label}, правило ${i + 1}`}
        onChange={(e) => {
          const v = e.target.value;
          set(i, { [field]: field === 'port' ? (v === 'any' ? 'any' : Number(v)) : v } as Partial<FilterRule>);
        }}
      >
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
  );

  const hostOpts = [{ v: 'any', l: 'any (будь-хто)' }, ...task.hosts.map((h) => ({ v: h.id, l: h.label }))];
  const protoOpts = task.protocols.map((p) => ({ v: p, l: p === 'ip' || p === 'any' ? `${p} (усі)` : p }));
  const portOpts = task.ports.map((p: FilterPort) => ({ v: String(p), l: String(p) }));

  const verdicts = task.tests.map((t) => evaluate(answer, t, task.hosts));
  const bad = verdicts.filter((v, i) => v.action !== task.tests[i].expect).length;

  return (
    <div className="pf">
      <div className="editor pf-rules">
        <div className="editor-bar">
          <span>{task.device ?? 'Список правил'}</span>
          <span>Перше правило, що збіглося, вирішує</span>
        </div>
        <ol className="pf-list">
          {answer.map((r, i) => (
            <li key={i} className={`pf-rule act-${r.action}`}>
              <span className="pf-num mono">{(i + 1) * 10}</span>
              <div className="pf-fields">
                {sel(i, 'action', r.action, [{ v: 'permit', l: 'permit' }, { v: 'deny', l: 'deny' }], 'Дія')}
                {sel(i, 'proto', r.proto, protoOpts, 'Протокол')}
                {sel(i, 'src', r.src, hostOpts, 'Звідки')}
                {sel(i, 'dst', r.dst, hostOpts, 'Куди')}
                {sel(i, 'port', String(r.port), portOpts, 'Порт', !protoHasPort(r.proto))}
              </div>
              <div className="pf-tools">
                <button type="button" className="icon-btn" aria-label={`Вище: правило ${i + 1}`} disabled={disabled || i === 0} onClick={() => swap(i, i - 1)}>↑</button>
                <button type="button" className="icon-btn" aria-label={`Нижче: правило ${i + 1}`} disabled={disabled || i === answer.length - 1} onClick={() => swap(i, i + 1)}>↓</button>
                <button type="button" className="icon-btn danger" aria-label={`Видалити правило ${i + 1}`} disabled={disabled} onClick={() => onChange(answer.filter((_, j) => j !== i))}>✕</button>
              </div>
            </li>
          ))}
          <li className="pf-rule pf-implicit">
            <span className="pf-num mono">∞</span>
            <span className="mono">deny ip any any</span>
            <span className="pf-implicit-note">неявне правило в кінці – його не видно, але воно є завжди</span>
          </li>
        </ol>
        {!disabled && (
          <div className="pf-add">
            <button type="button" className="btn btn-secondary" disabled={answer.length >= max} onClick={() => onChange([...answer, { ...NEW_RULE }])}>
              + Додати правило
            </button>
            <span className="note">Правил: {answer.length} з {max}</span>
          </div>
        )}
      </div>

      <section className="pf-tests">
        <div className="pf-tests-head">
          <span className="panel-label">Тестові пакети · <span className="mono">{task.tests.length}</span></span>
          {!task.liveTests && !disabled && (
            <button type="button" className="btn btn-secondary" onClick={() => setShownFor(answer)}>
              Прогнати пакети
            </button>
          )}
        </div>
        <ul className="pf-test-list">
          {task.tests.map((t, i) => {
            const v = verdicts[i];
            const ok = v.action === t.expect;
            return (
              <li key={i} className={`pf-test${showResults ? (ok ? ' ok' : ' bad') : ''}`}>
                <div className="pf-test-main">
                  <span className="pf-test-label">{t.label}</span>
                  <span className="pf-test-pkt mono">
                    {hostLabel(task, t.src)} → {hostLabel(task, t.dst)} · {t.proto}{t.port !== undefined && protoHasPort(t.proto) ? `/${t.port}` : ''}
                  </span>
                </div>
                <div className="pf-test-res">
                  <span className="pf-expect">очікується <b className={`mono act-${t.expect}`}>{t.expect}</b></span>
                  {showResults && (
                    <span className="pf-got">
                      <span className={`dot ${ok ? 'dot-solved' : 'dot-wrong'}`} />
                      <b className={`mono act-${v.action}`}>{v.action}</b>
                      <span className="muted"> · {v.rule === null ? 'неявне deny' : `правило ${(v.rule + 1) * 10}`}</span>
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {showResults && (
          <p className={`pf-sum${bad ? ' bad' : ' ok'}`} role="status">
            {bad
              ? `Не так обробляються ${bad} ${plural(bad, 'пакет', 'пакети', 'пакетів')} з ${task.tests.length}`
              : 'Усі пакети обробляються як слід'}
          </p>
        )}
      </section>
    </div>
  );
}

export const packetFilter: TaskTypeDef<PacketFilterTask, Answer> = {
  label: 'Симулятор ACL',
  initialAnswer: (task) => (task.initialRules ?? []).map((r) => ({ ...r })),
  isAnswered: () => true,
  check: (task, a) => failingTests(a, task.tests, task.hosts).length === 0,
  feedback: (task, a) => {
    const f = failingTests(a, task.tests, task.hosts);
    return `Не так обробляються ${f.length} ${plural(f.length, 'пакет', 'пакети', 'пакетів')}. Перший із них: «${task.tests[f[0]].label}».`;
  },
  Workspace,
};
