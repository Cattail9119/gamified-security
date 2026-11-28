import RichText from '../components/RichText';
import type { IncidentSimTask } from '../types/content';
import { failedMeters, passed, play } from './incidentLogic';
import type { TaskTypeDef, WorkspaceProps } from './types';

function Meters({ task, values, lowest }: { task: IncidentSimTask; values: Record<string, number>; lowest: Record<string, number> }) {
  return (
    <div className="meters" role="group" aria-label="Стан об'єкта">
      {task.meters.map((m) => {
        const v = values[m.id];
        const failed = lowest[m.id] < m.min;
        const low = v < m.min + 10;
        return (
          <div key={m.id} className={`meter${failed ? ' failed' : low ? ' low' : ''}`}>
            <div className="meter-top">
              <span className="meter-label">{m.label}</span>
              <span className="meter-val mono">{v}</span>
            </div>
            <div className="meter-track" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={v} aria-label={m.label}>
              <div className="meter-fill" style={{ transform: `scaleX(${v / 100})` }} />
              <div className="meter-min" style={{ left: `${m.min}%` }} title={`Критичний рівень: ${m.min}`} />
            </div>
            {failed && <span className="meter-note">Падав нижче критичного рівня ({m.min})</span>}
          </div>
        );
      })}
    </div>
  );
}

function Workspace({ task, answer, onChange, disabled }: WorkspaceProps<IncidentSimTask, number[]>) {
  const p = play(task, answer);
  const label = (id: string) => task.meters.find((m) => m.id === id)?.label ?? id;
  const failed = failedMeters(task, p);

  return (
    <div className="incident">
      <div className="meters-sticky">
        <Meters task={task} values={p.values} lowest={p.lowest} />
      </div>
      <div className="scenario">
        {p.entries.map(({ step, choice }, i) => {
          const sum = choice ? Object.values(choice.effects).reduce((s, d) => s + d, 0) : 0;
          const tone = sum > 0 ? 'good' : sum < 0 ? 'bad' : 'mid';
          return (
            <section className="scn-step" key={`${i}-${step.id}`}>
              <div className="scn-label">
                <span className="scn-label-num">Крок {i + 1}</span>
                {step.title && <span className="scn-label-title">· {step.title}</span>}
              </div>
              <div className="scn-bubble">
                <RichText text={step.situation} />
              </div>
              {choice ? (
                <>
                  <div className="scn-chosen">{choice.text}</div>
                  <div className={`scn-outcome tone-${tone}`}>
                    <RichText text={choice.outcome} />
                    <div className="effects">
                      {Object.entries(choice.effects).filter(([, d]) => d !== 0).map(([id, d]) => (
                        <span key={id} className={`effect ${d > 0 ? 'up' : 'down'}`}>
                          {label(id)} <span className="mono">{d > 0 ? `+${d}` : d}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                !disabled && (
                  <div className="scn-choices" role="group" aria-label="Ваше рішення">
                    <p className="scn-ask">Що ви зробите?</p>
                    {step.choices.map((c, k) => (
                      <button type="button" key={k} className="scn-choice" onClick={() => onChange([...answer, k])}>
                        {c.text}
                      </button>
                    ))}
                  </div>
                )
              )}
            </section>
          );
        })}
      </div>
      {p.ended && (
        <div className={`scn-summary${failed.length ? ' sum-bad' : ' sum-ok'}`}>
          <span>
            {failed.length
              ? `Інцидент закрито, але ${failed.map(label).map((l) => `«${l}»`).join(', ')} опускалися нижче критичного рівня.`
              : 'Інцидент закрито, жоден показник не опустився нижче критичного рівня.'}
          </span>
          {!disabled && (
            <button type="button" className="link-button" onClick={() => onChange([])}>
              Почати спочатку
            </button>
          )}
        </div>
      )}
      {!p.ended && answer.length > 0 && !disabled && (
        <button type="button" className="link-button quiet" onClick={() => onChange([])}>
          Почати спочатку
        </button>
      )}
    </div>
  );
}

export const incidentSim: TaskTypeDef<IncidentSimTask, number[]> = {
  label: 'Інцидент',
  initialAnswer: () => [],
  isAnswered: (a, task) => play(task, a).ended,
  check: (task, a) => passed(task, a),
  feedback: (task, a) => {
    const f = failedMeters(task, play(task, a));
    const names = f.map((id) => task.meters.find((m) => m.id === id)?.label ?? id);
    return `Нижче критичного рівня опускалися: ${names.join(', ')}. Почніть спочатку й спробуйте інші рішення.`;
  },
  Workspace,
};
