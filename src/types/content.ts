export type CourseStatus = 'active' | 'soon';

export interface Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  status: CourseStatus;
}
