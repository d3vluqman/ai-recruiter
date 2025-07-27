import { supabase } from "../config/supabase";
import {
  EmailCommunication,
  EmailTemplate,
  SendEmailRequest,
  Candidate,
  JobPosting,
} from "../types";
import { APIError } from "../middleware/errorHandler";
import { logger } from "../utils/logger";

export class EmailService {
  private defaultTemplates: Record<string, EmailTemplate> = {
    shortlist_notification: {
      type: "shortlist_notification",
      subject: "Congratulations! You've been shortlisted for {{jobTitle}}",
      body: `Dear {{candidateName}},

We are pleased to inform you that you have been shortlisted for the position of {{jobTitle}} at {{organizationName}}.

Your application has been carefully reviewed and we are impressed with your qualifications and experience. We would like to move forward with the next steps in our hiring process.

Next Steps:
- Our hiring team will be in touch within the next 2-3 business days
- Please keep an eye on your email for further communication
- If you have any questions, feel free to reach out to us

Thank you for your interest in joining our team. We look forward to speaking with you soon.

Best regards,
{{recruiterName}}
{{organizationName}} Hiring Team`,
      variables: [
        "candidateName",
        "jobTitle",
        "organizationName",
        "recruiterName",
      ],
    },
    interview_invitation: {
      type: "interview_invitation",
      subject: "Interview Invitation - {{jobTitle}} Position",
      body: `Dear {{candidateName}},

Thank you for your interest in the {{jobTitle}} position at {{organizationName}}.

We would like to invite you for an interview to discuss your qualifications and learn more about your experience.

Interview Details:
- Position: {{jobTitle}}
- Date: {{interviewDate}}
- Time: {{interviewTime}}
- Location/Platform: {{interviewLocation}}

Please confirm your availability by replying to this email. If the proposed time doesn't work for you, please suggest alternative times that would be convenient.

We look forward to meeting with you and discussing this exciting opportunity.

Best regards,
{{recruiterName}}
{{organizationName}} Hiring Team`,
      variables: [
        "candidateName",
        "jobTitle",
        "organizationName",
        "recruiterName",
        "interviewDate",
        "interviewTime",
        "interviewLocation",
      ],
    },
    rejection: {
      type: "rejection",
      subject: "Update on your application for {{jobTitle}}",
      body: `Dear {{candidateName}},

Thank you for your interest in the {{jobTitle}} position at {{organizationName}} and for taking the time to apply.

After careful consideration of all applications, we have decided to move forward with other candidates whose qualifications more closely match our current requirements.

This decision was not easy, as we received many strong applications. We encourage you to apply for future opportunities that match your skills and experience.

We appreciate your interest in {{organizationName}} and wish you the best in your job search.

Best regards,
{{recruiterName}}
{{organizationName}} Hiring Team`,
      variables: [
        "candidateName",
        "jobTitle",
        "organizationName",
        "recruiterName",
      ],
    },
  };

  async sendShortlistEmails(
    request: SendEmailRequest,
    userId: string
  ): Promise<EmailCommunication[]> {
    try {
      // Get shortlist details
      const { data: shortlist, error: shortlistError } = await supabase
        .from("shortlists")
        .select(
          `
          *,
          job_postings (*),
          users (first_name, last_name)
        `
        )
        .eq("id", request.shortlistId)
        .single();

      if (shortlistError || !shortlist) {
        throw new APIError("Shortlist not found", 404, "SHORTLIST_NOT_FOUND");
      }

      // Get candidates to email
      let candidateQuery = supabase
        .from("shortlist_candidates")
        .select(
          `
          candidate_id,
          candidates (*)
        `
        )
        .eq("shortlist_id", request.shortlistId);

      if (request.candidateIds && request.candidateIds.length > 0) {
        candidateQuery = candidateQuery.in(
          "candidate_id",
          request.candidateIds
        );
      }

      const { data: shortlistCandidates, error: candidatesError } =
        await candidateQuery;

      if (candidatesError) {
        logger.error("Error fetching shortlist candidates:", candidatesError);
        throw new APIError(
          "Failed to fetch candidates",
          500,
          "CANDIDATES_FETCH_ERROR"
        );
      }

      if (!shortlistCandidates || shortlistCandidates.length === 0) {
        throw new APIError(
          "No candidates found for shortlist",
          404,
          "NO_CANDIDATES_FOUND"
        );
      }

      const emailCommunications: EmailCommunication[] = [];

      // Send email to each candidate
      for (const shortlistCandidate of shortlistCandidates) {
        const candidate = (
          shortlistCandidate.candidates as any
        )?.[0] as Candidate;
        if (!candidate) continue;

        try {
          const personalizedEmail = this.personalizeEmailTemplate(
            request.emailTemplate,
            candidate,
            shortlist.job_postings,
            shortlist.users
          );

          // Create email communication record
          const { data: emailComm, error: emailError } = await supabase
            .from("email_communications")
            .insert({
              shortlist_id: request.shortlistId,
              candidate_id: candidate.id,
              email_type: request.emailTemplate.type,
              subject: personalizedEmail.subject,
              body: personalizedEmail.body,
              delivery_status: "pending",
            })
            .select()
            .single();

          if (emailError) {
            logger.error(
              "Error creating email communication record:",
              emailError
            );
            continue;
          }

          // Simulate email sending (in a real implementation, you would integrate with an email service)
          const emailSent = await this.simulateEmailSending(
            candidate.email,
            personalizedEmail
          );

          // Update delivery status
          await supabase
            .from("email_communications")
            .update({
              sent_at: new Date().toISOString(),
              delivery_status: emailSent.success ? "sent" : "failed",
              error_message: emailSent.error,
            })
            .eq("id", emailComm.id);

          emailCommunications.push({
            id: emailComm.id,
            shortlistId: emailComm.shortlist_id,
            candidateId: emailComm.candidate_id,
            emailType: emailComm.email_type as any,
            subject: emailComm.subject,
            body: emailComm.body,
            sentAt: emailSent.success ? new Date() : undefined,
            deliveryStatus: emailSent.success ? "sent" : "failed",
            errorMessage: emailSent.error,
          });
        } catch (error) {
          logger.error(
            `Error sending email to candidate ${candidate.id}:`,
            error
          );
          continue;
        }
      }

      // Update shortlist status to 'sent' if emails were sent
      if (emailCommunications.some((ec) => ec.deliveryStatus === "sent")) {
        await supabase
          .from("shortlists")
          .update({ status: "sent" })
          .eq("id", request.shortlistId);
      }

      return emailCommunications;
    } catch (error) {
      if (error instanceof APIError) throw error;
      logger.error("Error in sendShortlistEmails:", error);
      throw new APIError("Internal server error", 500, "INTERNAL_ERROR");
    }
  }

  async getEmailCommunications(
    shortlistId: string
  ): Promise<EmailCommunication[]> {
    try {
      const { data, error } = await supabase
        .from("email_communications")
        .select("*")
        .eq("shortlist_id", shortlistId)
        .order("sent_at", { ascending: false });

      if (error) {
        logger.error("Error fetching email communications:", error);
        throw new APIError(
          "Failed to fetch email communications",
          500,
          "EMAIL_FETCH_ERROR"
        );
      }

      return data.map(this.mapEmailCommunicationFromDB);
    } catch (error) {
      if (error instanceof APIError) throw error;
      logger.error("Error in getEmailCommunications:", error);
      throw new APIError("Internal server error", 500, "INTERNAL_ERROR");
    }
  }

  async getEmailTemplates(): Promise<EmailTemplate[]> {
    return Object.values(this.defaultTemplates);
  }

  async getEmailTemplate(type: string): Promise<EmailTemplate | null> {
    return this.defaultTemplates[type] || null;
  }

  async updateEmailTemplate(
    type: string,
    template: Partial<EmailTemplate>
  ): Promise<EmailTemplate> {
    if (!this.defaultTemplates[type]) {
      throw new APIError("Email template not found", 404, "TEMPLATE_NOT_FOUND");
    }

    this.defaultTemplates[type] = {
      ...this.defaultTemplates[type],
      ...template,
      type: type as any,
    };

    return this.defaultTemplates[type];
  }

  private personalizeEmailTemplate(
    template: EmailTemplate,
    candidate: Candidate,
    jobPosting: JobPosting,
    recruiter: any
  ): { subject: string; body: string } {
    const variables = {
      candidateName: `${candidate.firstName} ${candidate.lastName}`,
      jobTitle: jobPosting.title,
      organizationName: "Your Organization", // This would come from organization data
      recruiterName: `${recruiter.first_name} ${recruiter.last_name}`,
      interviewDate: "TBD",
      interviewTime: "TBD",
      interviewLocation: "TBD",
    };

    let personalizedSubject = template.subject;
    let personalizedBody = template.body;

    // Replace variables in subject and body
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      personalizedSubject = personalizedSubject.replace(
        new RegExp(placeholder, "g"),
        value
      );
      personalizedBody = personalizedBody.replace(
        new RegExp(placeholder, "g"),
        value
      );
    });

    return {
      subject: personalizedSubject,
      body: personalizedBody,
    };
  }

  private async simulateEmailSending(
    email: string,
    emailContent: { subject: string; body: string }
  ): Promise<{ success: boolean; error?: string }> {
    // Simulate email sending with random success/failure
    // In a real implementation, you would integrate with services like:
    // - SendGrid
    // - AWS SES
    // - Mailgun
    // - Nodemailer with SMTP

    return new Promise((resolve) => {
      setTimeout(() => {
        const success = Math.random() > 0.1; // 90% success rate
        resolve({
          success,
          error: success ? undefined : "Simulated email delivery failure",
        });
      }, 100);
    });
  }

  private mapEmailCommunicationFromDB(data: any): EmailCommunication {
    return {
      id: data.id,
      shortlistId: data.shortlist_id,
      candidateId: data.candidate_id,
      emailType: data.email_type,
      subject: data.subject,
      body: data.body,
      sentAt: data.sent_at ? new Date(data.sent_at) : undefined,
      deliveryStatus: data.delivery_status,
      errorMessage: data.error_message,
    };
  }
}

export const emailService = new EmailService();
