import { z } from "zod";

export const DifficultySchema = z.enum(["Easy", "Medium", "Hard"]);

export const AcSubmissionSchema = z.object({
    titleSlug: z.string(),
    title: z.string(),
    timestamp: z.coerce.number(),
    statusDisplay: z.string(),
    lang: z.string(),
});

export const AcSubmissionsResponseSchema = z.object({
    submission: z.array(AcSubmissionSchema),
});

export const ProblemDetailSchema = z.object({
    questionId: z.string(),
    questionTitle: z.string(),
    titleSlug: z.string(),
    difficulty: DifficultySchema,
    topicTags: z.array(z.object({
        name: z.string(),
        slug: z.string(),
    })),
});

export const ProblemListItemSchema = z.object({
    title: z.string(),
    titleSlug: z.string(),
    difficulty: DifficultySchema,
});

export const ProblemListResponseSchema = z.object({
    problemsetQuestionList: z.array(ProblemListItemSchema),
});

export type Difficulty = z.infer<typeof DifficultySchema>;
export type AcSubmission = z.infer<typeof AcSubmissionSchema>;
export type ProblemDetail = z.infer<typeof ProblemDetailSchema>;
export type ProblemListItem = z.infer<typeof ProblemListItemSchema>;
