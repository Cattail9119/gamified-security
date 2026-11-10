import { Link, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CoursePage from './pages/CoursePage';
import TaskPage from './pages/TaskPage';
import NotFoundPage from './pages/NotFoundPage';
import ProgressBar from './components/ProgressBar';
import { useProgress, XP_PER_LEVEL } from './progress';

function Header() {
  const { totalXp, level, levelXp, reset } = useProgress();

  const onReset = () => {
    if (window.confirm('Скинути весь прогрес? XP, рівень і статуси завдань буде видалено.')) reset();
  };

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <Link to="/" className="logo">Безпека</Link>
        <div className="header-right">
          <div className="level" title={`До наступного рівня: ${XP_PER_LEVEL - levelXp} XP`}>
            <span className="level-num">Рівень {level}</span>
            <ProgressBar value={levelXp} max={XP_PER_LEVEL} label="Прогрес рівня" />
            <span className="level-xp">{totalXp} XP</span>
          </div>
          <button type="button" className="link-button quiet" onClick={onReset}>
            Скинути прогрес
          </button>
        </div>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <div className="app">
      <Header />
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
