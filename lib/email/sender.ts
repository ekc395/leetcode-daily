import nodemailer, { type Transporter } from "nodemailer";

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter {
    if (cachedTransporter) return cachedTransporter;

    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    if (!user || !pass) {
        throw new Error("GMAIL_USER and GMAIL_APP_PASSWORD must be set to send email");
    }

    cachedTransporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user, pass },
    });
    return cachedTransporter;
}

export type SendEmailInput = {
    to?: string;
    subject: string;
    html: string;
    text: string;
};

export async function sendEmail({ to, subject, html, text }: SendEmailInput): Promise<void> {
    const recipient = to ?? process.env.NOTIFICATION_EMAIL;
    if (!recipient) {
        throw new Error("Recipient is required (pass `to` or set NOTIFICATION_EMAIL)");
    }

    const transporter = getTransporter();
    await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: recipient,
        subject,
        html,
        text,
    });
}
