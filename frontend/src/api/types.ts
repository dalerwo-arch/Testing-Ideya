export type Role = "STUDENT" | "ADMIN";
export type UserStatus = "PENDING" | "ACTIVE" | "REJECTED" | "LOCKED";
export type AttemptStatus = "IN_PROGRESS" | "SUBMITTED" | "EXITED" | "EXPIRED" | "TERMINATED";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  status: UserStatus;
  lockReason: string | null;
  groupId: string | null;
  group: { id: string; name: string } | null;
  hasGoogle: boolean;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  _count?: { users: number; assignments: number };
}

export interface TestSummary {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  isPublished: boolean;
  groups: { id: string; name: string }[];
  _count: { questions: number; attempts: number };
}

export interface OptionDto {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface QuestionDto {
  id: string;
  text: string;
  position: number;
  options: OptionDto[];
}

export interface TestDetail extends TestSummary {
  questions: QuestionDto[];
}

export interface ResultRow {
  id: string;
  status: AttemptStatus;
  attemptNo: number;
  entryCount: number;
  retakeGranted: boolean;
  startedAt: string;
  finishedAt: string | null;
  score: number | null;
  total: number | null;
  isLatest: boolean;
  user: { id: string; fullName: string; email: string; group: string | null };
  test: { id: string; title: string };
}

export interface StudentTest {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  questionCount: number;
  state: "AVAILABLE" | "IN_PROGRESS" | "DONE";
  attemptId: string | null;
  retakeGranted: boolean;
}

export interface ExamPayload {
  attemptId: string;
  testTitle: string;
  durationMinutes: number;
  startedAt: string;
  endsAt: string;
  serverNow: string;
  entryCount: number;
  maxEntries: number;
  questions: { id: string; text: string; options: { id: string; text: string }[] }[];
  answers: Record<string, string>;
}
