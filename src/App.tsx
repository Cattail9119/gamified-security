import { Link, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CoursePage from './pages/CoursePage';
import TaskPage from './pages/TaskPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <Link to="/" className="logo">🎯 Безпека</Link>
        {/* TODO: XP і рівень з localStorage */}
        <span className="xp-badge">Рівень 1 · 0 XP</span>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/course/:courseId" element={<CoursePage />} />
          <Route path="/course/:courseId/task/:taskId" element={<TaskPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  );
}
