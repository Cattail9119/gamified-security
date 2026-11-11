import { Link, useParams } from 'react-router-dom';
import { getCourse, getTasks } from '../content';
import { STATUS_LABELS, useProgress } from '../progress';
import { getTaskTypeDef } from '../tasks';
import ProgressBar from '../components/ProgressBar';
import NotFoundPage from './NotFoundPage';

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

          <ol className="task-list">
            {tasks.map((t, i) => {
              const p = progress[i];
              return (
                <li key={t.id}>
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
