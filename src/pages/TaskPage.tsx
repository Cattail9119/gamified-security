import { Link, useParams } from 'react-router-dom';
import { getCourse } from '../content';
import NotFoundPage from './NotFoundPage';

// Заглушка: умова, робоча зона за типом, «Перевірити», «Підказка», розбір
export default function TaskPage() {
  const { courseId = '', taskId = '' } = useParams();
  const course = getCourse(courseId);
  if (!course || course.status !== 'active') return <NotFoundPage />;

  return (
    <>
      <Link to={`/course/${course.id}`} className="back">← {course.title}</Link>
      <h1>Завдання: {taskId}</h1>
      <div className="stub">Тут буде умова завдання та робоча зона.</div>
      <div className="actions">
        <button disabled>Перевірити</button>
        <button disabled className="secondary">Підказка</button>
      </div>
    </>
  );
}
