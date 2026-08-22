import { Injectable, Logger } from "@nestjs/common";
import nodemailer from "nodemailer";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
      this.logger.warn("SMTP not configured -- email notifications are disabled.");
      return;
    }
    this.transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }

  /** Best-effort and fire-and-forget -- never throws, so a failed or slow
   * send can never break the caller's transaction or request. */
  send(to: string, subject: string, text: string): void {
    if (!this.transporter || !to) return;
    this.transporter
      .sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, text })
      .catch((err: Error) => this.logger.warn(`Failed to send email to ${to}: ${err.message}`));
  }
}
