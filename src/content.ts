// Єдина точка доступу до даних із /content. Рушій не знає про конкретні теми.
import coursesJson from '../content/courses.json';
import type { Course } from './types/content';

export const courses = coursesJson as Course[];

export function getCourse(id: string): Course | undefined {
  return courses.find((c) => c.id === id);
}
