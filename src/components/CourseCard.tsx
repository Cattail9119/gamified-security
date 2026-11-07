import { Link } from 'react-router-dom';
import type { Course } from '../types/content';

export default function CourseCard({ course }: { course: Course }) {
  const body = (
    <>
      <div className="card-icon" aria-hidden>{course.icon}</div>
      <h2 className="card-title">{course.title}</h2>
      <p className="card-desc">{course.description}</p>
      {course.status === 'soon' ? (
        <span className="tag tag-soon">Скоро</span>
      ) : (
        <span className="tag">Почати →</span>
      )}
    </>
  );

  if (course.status === 'soon') {
    return <div className="card card-disabled" aria-disabled>{body}</div>;
  }
  return <Link to={`/course/${course.id}`} className="card">{body}</Link>;
}
