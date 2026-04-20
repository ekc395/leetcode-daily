export interface AcSubmission {
    titleSlug: string;
    title: string;
    timestamp: number;
    statusDisplay: string;
    lang: string;
}

export interface ProblemDetail {
    questionId: string;
    questionTitle: string;
    titleSlug: string;
    difficulty: string;
    topicTags: { name: string; slug: string }[];
}

export interface ProblemListItem {
    title: string;
    titleSlug: string;
    difficulty: "Easy" | "Medium" | "Hard";
}
