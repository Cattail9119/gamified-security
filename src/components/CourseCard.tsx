import { Link } from 'react-router-dom';
import type { Course } from '../types/content';
import { getTasks } from '../content';
import { useProgress } from '../progress';
import ProgressBar from './ProgressBar';

export default function CourseCard({ course }: { course: Course }) {
  const { getTask } = useProgress();
  const tasks = getTasks(course.id);
  const solved = tasks.filter((t) => getTask(course.id, t.id).status === 'solved').length;

  const body = (
    <>
      <h2 className="card-title">{course.title}</h2>
      <p className="card-desc">{course.description}</p>
      {course.status === 'soon' ? (
        <span className="status"><span className="dot" />Скоро</span>
      ) : (
        <div className="card-footer">
          <span className="card-progress">
            Виконано <span className="mono">{solved}</span> з <span className="mono">{tasks.length}</span>
          </span>
          <ProgressBar value={solved} max={tasks.length} label="Прогрес курсу" />
        </div>
      )}
    </>
  );

  if (course.status === 'soon') {
    return <div className="card card-disabled" aria-disabled>{body}</div>;
  }
  return <Link to={`/course/${course.id}`} className="card">{body}</Link>;
}
