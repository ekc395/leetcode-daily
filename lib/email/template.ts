type EmailProblem = {
    slug: string;
    title: string;
    difficulty: string;
    tags: string[];
};

export type DailyReminderEmail = {
    subject: string;
    html: string;
    text: string;
};

const DIFFICULTY_COLOR: Record<string, string> = {
    Easy: "#00b8a3",
    Medium: "#ffb800",
    Hard: "#ff375f",
};

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export function buildDailyReminderEmail(problem: EmailProblem): DailyReminderEmail {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const leetcodeUrl = `https://leetcode.com/problems/${problem.slug}/`;
    const color = DIFFICULTY_COLOR[problem.difficulty] ?? "#666";
    const tagList = problem.tags.length ? problem.tags.join(", ") : "—";

    const subject = `LeetCode Daily: ${problem.title}`;

    const html = `<!doctype html>
<html>
  <body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;background:#fafafa;padding:24px;margin:0;">
    <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:8px;padding:24px;">
      <p style="margin:0 0 8px;color:#888;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;">Today's problem</p>
      <h1 style="margin:0 0 12px;font-size:22px;color:#111;">${escapeHtml(problem.title)}</h1>
      <p style="margin:0 0 16px;">
        <span style="display:inline-block;padding:3px 10px;border-radius:12px;background:${color};color:#fff;font-size:12px;font-weight:600;">${escapeHtml(problem.difficulty)}</span>
      </p>
      <p style="margin:0 0 24px;color:#444;font-size:14px;"><strong>Tags:</strong> ${escapeHtml(tagList)}</p>
      <p style="margin:0 0 12px;">
        <a href="${escapeHtml(appUrl)}" style="display:inline-block;background:#111;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">Start review</a>
      </p>
      <p style="margin:0;font-size:13px;">
        <a href="${escapeHtml(leetcodeUrl)}" style="color:#666;">View on LeetCode</a>
      </p>
    </div>
  </body>
</html>`;

    const text = [
        `Today's problem: ${problem.title}`,
        `Difficulty: ${problem.difficulty}`,
        `Tags: ${tagList}`,
        ``,
        `Start review: ${appUrl}`,
        `View on LeetCode: ${leetcodeUrl}`,
    ].join("\n");

    return { subject, html, text };
}
