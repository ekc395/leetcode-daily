export type Difficulty = "Easy" | "Medium" | "Hard";

export interface Problem {
  id: number;
  slug: string;
  title: string;
  difficulty: Difficulty;
  tags: string[];
}

export interface Streak {
  current: number;
  longest: number;
  totalDays: number;
  totalSolved: number;
}

export interface TagWeakness {
  tag: string;
  failures: number;
  total: number;
  weakness: number;
}

export interface AttemptSummary {
  attemptedAt: string;
  recallRating: number;
  solved: boolean;
}
