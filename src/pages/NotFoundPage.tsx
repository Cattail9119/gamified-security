import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <>
      <h1>Сторінку не знайдено</h1>
      <Link to="/">← На головну</Link>
    </>
  );
}
