import {
    AcSubmissionsResponseSchema,
    ProblemDetailSchema,
    ProblemListResponseSchema,
    type AcSubmission,
    type ProblemDetail,
    type ProblemListItem,
} from "./schemas";

const LEETCODE_API_URL = process.env.LEETCODE_API_URL ?? "https://alfa-leetcode-api.onrender.com/";

export async function getAcceptedSubmissions(username: string, limit = 50): Promise<AcSubmission[]> {
    const response = await fetch(`${LEETCODE_API_URL}${username}/acSubmission?limit=${limit}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch accepted submissions for ${username}: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return AcSubmissionsResponseSchema.parse(data).submission;
}

export async function getProblemDetail(titleSlug: string): Promise<ProblemDetail> {
    const response = await fetch(`${LEETCODE_API_URL}select?titleSlug=${titleSlug}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch problem detail for "${titleSlug}": ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return ProblemDetailSchema.parse(data);
}

export async function getProblemList(limit = 100, skip = 0): Promise<ProblemListItem[]> {
    const response = await fetch(`${LEETCODE_API_URL}problems?limit=${limit}&skip=${skip}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch problem list: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return ProblemListResponseSchema.parse(data).problemsetQuestionList;
}
