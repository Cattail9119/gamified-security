import CourseCard from '../components/CourseCard';
import { courses } from '../content';

export default function HomePage() {
  return (
    <>
      <h1>Курси</h1>
      <p className="lead">Обери курс і заробляй XP, виконуючи завдання.</p>
      <div className="grid">
        {courses.map((c) => (
          <CourseCard key={c.id} course={c} />
        ))}
      </div>
    </>
  );
}
