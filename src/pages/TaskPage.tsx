import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCourse, getTasks } from '../content';
import { useProgress } from '../progress';
import { getTaskTypeDef, type AnyTaskTypeDef } from '../tasks';
import type { Task } from '../types/content';
import RichText from '../components/RichText';
import NotFoundPage from './NotFoundPage';

export default function TaskPage() {
  const { courseId = '', taskId = '' } = useParams();
  const course = getCourse(courseId);
  const tasks = getTasks(courseId);
  const index = tasks.findIndex((t) => t.id === taskId);
  if (!course || course.status !== 'active' || index < 0) return <NotFoundPage />;

  const task = tasks[index];
  const def = getTaskTypeDef(task);

  return (
    <>
      <Link to={`/course/${course.id}`} className="back">← {course.title}</Link>
      {def ? (
        // key — щоб при переході до наступного завдання стан скидався
        <TaskView
          key={`${course.id}/${task.id}`}
          courseId={course.id}
          task={task}
          def={def}
          number={index + 1}
          total={tasks.length}
          next={tasks[index + 1]}
        />
      ) : (
        <div className="feedback wrong">
          Невідомий тип завдання «{(task as { type: string }).type}». Перевірте JSON.
        </div>
      )}
    </>
  );
}

interface TaskViewProps {
  courseId: string;
  task: Task;
  def: AnyTaskTypeDef;
  number: number;
  total: number;
  next?: Task;
}

function TaskView({ courseId, task, def, number, total, next }: TaskViewProps) {
  const progress = useProgress();
  const [wasDone] = useState(() => {
    const s = progress.getTask(courseId, task.id).status;
    return s === 'solved' || s === 'revealed';
  });
  const [step, setStep] = useState<'theory' | 'task'>(task.theory && !wasDone ? 'theory' : 'task');
  const [answer, setAnswer] = useState<unknown>(() => def.initialAnswer(task));
  const [result, setResult] = useState<null | 'correct' | 'wrong'>(null);
  const [wrongCount, setWrongCount] = useState(0);
  const [wrongNote, setWrongNote] = useState<string | undefined>();
  const [revealed, setRevealed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [gained, setGained] = useState(0);

  const finished = result === 'correct' || revealed;
  const Workspace = def.Workspace;

  const onChange = (a: unknown) => {
    setAnswer(a);
    if (result === 'wrong') setResult(null);
  };

  const onCheck = (e: FormEvent) => {
    e.preventDefault();
    if (finished || !def.isAnswered(answer, task)) return;
    const ok = def.check(task, answer);
    setResult(ok ? 'correct' : 'wrong');
    if (!ok) setWrongCount((n) => n + 1);
    setWrongNote(ok ? undefined : def.feedback?.(task, answer));
    setGained(progress.recordAttempt(courseId, task, ok));
  };

  const onHint = () => {
    setShowHint(true);
    progress.markHintUsed(courseId, task.id);
  };

  const onReveal = () => {
    setRevealed(true);
    setResult(null);
    progress.reveal(courseId, task.id);
  };

  return (
    <>
      <div className="task-meta">
        Завдання {number} з {total} · {def.label} · {task.xp} XP
      </div>
      <h1>{task.title}</h1>

      {wasDone && (
        <div className="notice">
          Ви вже проходили це завдання. Можна спробувати ще раз, але XP повторно не нараховується.
        </div>
      )}

      {step === 'theory' && task.theory ? (
        <section className="panel theory">
          <h2 className="panel-label">Теорія</h2>
          <RichText text={task.theory} />
          <div className="actions">
            <button type="button" className="btn" onClick={() => setStep('task')}>
              До завдання
            </button>
          </div>
        </section>
      ) : (
        <>
          {task.theory && (
            <button type="button" className="link-button back-to-theory" onClick={() => setStep('theory')}>
              ← Повернутися до теорії
            </button>
          )}

          <section className="panel prompt">
            <RichText text={task.prompt} />
          </section>

          <form onSubmit={onCheck}>
            <Workspace task={task} answer={answer} onChange={onChange} disabled={finished} />
            {!finished && (
              <div className="actions">
                <button type="submit" className="btn" disabled={!def.isAnswered(answer, task)}>
                  Перевірити
                </button>
                {task.hint && (
                  <button type="button" className="btn btn-secondary" onClick={onHint} disabled={showHint}>
                    Підказка
                  </button>
                )}
              </div>
            )}
          </form>

          {showHint && task.hint && !finished && (
            <div className="hint">
              <div className="panel-label"><span className="dot dot-revealed" />Підказка</div>
              <RichText text={task.hint} />
            </div>
          )}

          {result === 'wrong' && (
            <div className="feedback wrong" role="status">
              <span className="dot dot-wrong" />
              <span>
                Неправильно. Спробуйте ще раз{task.hint && !showHint ? ' або скористайтеся підказкою' : ''}.
                {wrongNote && <span className="feedback-note">{wrongNote}</span>}
              </span>
            </div>
          )}

          {wrongCount > 0 && !finished && (
            <button type="button" className="link-button quiet" onClick={onReveal}>
              Здатися й показати розбір (без XP)
            </button>
          )}

          {result === 'correct' && (
            <div className="feedback correct" role="status">
              <span className="dot dot-solved" />
              Правильно
              {gained > 0 && <span className="xp">+{gained} XP</span>}
            </div>
          )}
          {revealed && (
            <div className="feedback neutral" role="status">
              <span className="dot dot-revealed" />
              Розбір відкрито, XP за це завдання не нараховано
            </div>
          )}

          {finished && (
            <>
              <section className="panel explanation">
                <h2 className="panel-label"><span className="dot dot-solved" />Розбір</h2>
                <RichText text={task.explanation} />
              </section>
              <div className="actions">
                {next ? (
                  <Link className="btn" to={`/course/${courseId}/task/${next.id}`}>
                    Наступне завдання
                  </Link>
                ) : (
                  <Link className="btn" to={`/course/${courseId}`}>
                    До списку завдань
                  </Link>
                )}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
