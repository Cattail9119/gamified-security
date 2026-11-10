// Єдина точка доступу до даних із /content. Рушій не знає про конкретні теми.
import coursesJson from '../content/courses.json';
import type { Course, Task } from './types/content';

export const courses = coursesJson as Course[];

// Усі файли content/tasks/<id-курсу>.json підхоплюються автоматично
const taskModules = import.meta.glob<{ default: Task[] }>('../content/tasks/*.json', { eager: true });

const tasksByCourse: Record<string, Task[]> = {};
for (const [path, mod] of Object.entries(taskModules)) {
  const courseId = path.split('/').pop()!.replace(/\.json$/, '');
  tasksByCourse[courseId] = mod.default;
}

export function getCourse(id: string): Course | undefined {
  return courses.find((c) => c.id === id);
}

export function getTasks(courseId: string): Task[] {
  return tasksByCourse[courseId] ?? [];
}
