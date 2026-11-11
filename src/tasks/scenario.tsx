import RichText from '../components/RichText';
import type { ScenarioTask } from '../types/content';
import type { TaskTypeDef, WorkspaceProps } from './types';

const maxPoints = (task: ScenarioTask) =>
  task.steps.reduce((sum, s) => sum + Math.max(...s.choices.map((c) => c.points)), 0);
const score = (task: ScenarioTask, a: number[]) =>
  a.reduce((sum, choice, i) => sum + (task.steps[i]?.choices[choice]?.points ?? 0), 0);

function Workspace({ task, answer, onChange, disabled }: WorkspaceProps<ScenarioTask, number[]>) {
  const total = task.steps.length;
  const max = maxPoints(task);
  const allDone = answer.length === total;
  const visible = task.steps.slice(0, Math.min(answer.length + 1, total));

  return (
    <div className="scenario">
      {visible.map((step, i) => {
        const chosenIdx = answer[i];
        const chosen = chosenIdx === undefined ? undefined : step.choices[chosenIdx];
        const best = Math.max(...step.choices.map((c) => c.points));
        const tone = chosen ? (chosen.points >= best ? 'good' : chosen.points === 0 ? 'bad' : 'mid') : '';
        return (
          <section className="scn-step" key={i}>
            <div className="scn-label">
              <span className="scn-label-num">Момент {i + 1} з {total}</span>
              {step.title && <span className="scn-label-title">· {step.title}</span>}
            </div>
            <div className="scn-bubble">
              <RichText text={step.situation} />
            </div>
            {chosen ? (
              <>
                <div className="scn-chosen">{chosen.text}</div>
                <div className={`scn-outcome tone-${tone}`}>
                  <RichText text={chosen.outcome} />
                  <span className="scn-points mono">+{chosen.points}</span>
                </div>
              </>
            ) : (
              !disabled && (
                <div className="scn-choices" role="group" aria-label="Ваше рішення">
                  <p className="scn-ask">Що ви зробите? Оберіть варіант:</p>
                  {step.choices.map((c, k) => (
                    <button
                      type="button"
                      key={k}
                      className="scn-choice"
                      onClick={() => onChange([...answer, k])}
                    >
                      {c.text}
                    </button>
                  ))}
                </div>
              )
            )}
          </section>
        );
      })}
      {allDone && (
        <div className="scn-summary">
          <span>
            Набрано <strong className="mono">{score(task, answer)}</strong> із <span className="mono">{max}</span> балів
            {' · '}потрібно щонайменше <span className="mono">{task.passScore}</span>
          </span>
          {!disabled && (
            <button type="button" className="link-button" onClick={() => onChange([])}>
              Почати спочатку
            </button>
          )}
        </div>
      )}
      {!allDone && answer.length > 0 && !disabled && (
        <button type="button" className="link-button quiet" onClick={() => onChange([])}>
          Почати спочатку
        </button>
      )}
    </div>
  );
}

export const scenario: TaskTypeDef<ScenarioTask, number[]> = {
  label: 'Сценарій',
  initialAnswer: () => [],
  isAnswered: (a, task) => a.length === task.steps.length,
  check: (task, a) => a.length === task.steps.length && score(task, a) >= task.passScore,
  feedback: (task, a) => `Набрано ${score(task, a)} із ${maxPoints(task)} балів, потрібно щонайменше ${task.passScore}. Спробуйте інші рішення.`,
  Workspace,
};
