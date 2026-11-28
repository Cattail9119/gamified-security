import { Link, useParams } from 'react-router-dom';
import { getCourse, getTasks } from '../content';
import { STATUS_LABELS, useProgress } from '../progress';
import { getTaskTypeDef } from '../tasks';
import ProgressBar from '../components/ProgressBar';
import NotFoundPage from './NotFoundPage';
import type { Course } from '../types/content';

function Rank({ course, xp }: { course: Course; xp: number }) {
  const ranks = [...(course.ranks ?? [])].sort((a, b) => a.xp - b.xp);
  if (!ranks.length) return null;
  const idx = ranks.reduce((acc, r, i) => (xp >= r.xp ? i : acc), 0);
  const cur = ranks[idx];
  const next = ranks[idx + 1];
  return (
    <div className="rank">
      <span className="rank-label">Посада</span>
      <span className="rank-title">{cur.title}</span>
      <span className="rank-next">
        {next ? <>до «{next.title}» ще <span className="mono">{next.xp - xp}</span> XP</> : 'найвища посада курсу'}
      </span>
      <ol className="rank-steps" aria-label="Кар'єрні сходинки">
        {ranks.map((r, i) => (
          <li key={r.title} className={i <= idx ? 'reached' : ''} title={`${r.title} – від ${r.xp} XP`} />
        ))}
      </ol>
    </div>
  );
}

export default function CoursePage() {
  const { courseId = '' } = useParams();
  const { getTask } = useProgress();
  const course = getCourse(courseId);
  if (!course || course.status !== 'active') return <NotFoundPage />;

  const tasks = getTasks(course.id);
  const progress = tasks.map((t) => getTask(course.id, t.id));
  const solved = progress.filter((p) => p.status === 'solved').length;
  const earnedXp = progress.reduce((s, p) => s + p.xp, 0);
  const totalXp = tasks.reduce((s, t) => s + t.xp, 0);

  return (
    <>
      <Link to="/" className="back"><span className="nav-arrow" aria-hidden>←</span> До курсів</Link>
      <h1>{course.title}</h1>
      <p className="lead">{course.description}</p>

      {tasks.length === 0 ? (
        <div className="stub">У цьому курсі ще немає завдань.</div>
      ) : (
        <>
          <div className="course-summary">
            <span>
              Виконано <span className="mono">{solved}</span> з <span className="mono">{tasks.length}</span>
            </span>
            <span className="mono">{earnedXp} / {totalXp} XP</span>
          </div>
          <ProgressBar value={solved} max={tasks.length} label="Прогрес курсу" />
          <Rank course={course} xp={earnedXp} />

          <ol className="task-list">
            {tasks.map((t, i) => {
              const p = progress[i];
              const newModule = t.module && t.module !== tasks[i - 1]?.module;
              return (
                <li key={t.id}>
                  {newModule && <div className="task-module">{t.module}</div>}
                  <Link to={`/course/${course.id}/task/${t.id}`} className={`task-row status-${p.status}`}>
                    <span className="task-num">{i + 1}</span>
                    <span className="task-info">
                      <span className="task-title">{t.title}</span>
                      <span className="task-type">
                        {getTaskTypeDef(t)?.label ?? t.type}
                        {t.theory ? ' · з теорією' : ''}
                      </span>
                    </span>
                    <span className="status">
                      <span className={`dot dot-${p.status}`} />
                      {STATUS_LABELS[p.status]}
                    </span>
                    <span className="task-xp">
                      {p.status === 'solved' ? `+${p.xp}` : t.xp} XP
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </>
  );
}
