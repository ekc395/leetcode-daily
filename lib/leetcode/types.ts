export interface AcSubmission {
    titleSlug: string;
    title: string;
    timestamp: number;
    statusDisplay: string;
    lang: string;
}

export interface ProblemDetail {
    questionId: string;
    title: string;
    titleSlug: string;
    difficulty: string;
    topicTags: { name: string; slug: string }[];
}

export interface ProblemListItem {
    stat: {
        question__title_slug: string;
        question__title: string;
    };
    
    difficulty: {
        level: number;
    };
}
