import { Link, useParams } from 'react-router-dom';
import { getCourse } from '../content';
import NotFoundPage from './NotFoundPage';

// Заглушка: список завдань, статус, XP — наступний крок roadmap
export default function CoursePage() {
  const { courseId = '' } = useParams();
  const course = getCourse(courseId);
  if (!course || course.status !== 'active') return <NotFoundPage />;

  return (
    <>
      <Link to="/" className="back">← До курсів</Link>
      <h1>{course.icon} {course.title}</h1>
      <p className="lead">{course.description}</p>
      <div className="stub">
        Тут буде список завдань зі статусом і XP.
        <br />
        <Link to={`/course/${course.id}/task/demo`}>Відкрити демо-завдання →</Link>
      </div>
    </>
  );
}
