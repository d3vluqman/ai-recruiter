/**
 * Error handling utilities for the frontend application
 */

export interface AppError {
  message: string;
  code?: string;
  details?: any;
}

export class ErrorHandler {
  /**
   * Log error to console in development, send to monitoring in production
   */
  static logError(error: any, context?: string): void {
    const errorInfo = {
      message: error?.message || "Unknown error",
      stack: error?.stack,
      context,
      timestamp: new Date().toISOString(),
    };

    if (import.meta.env.DEV) {
      console.error(`[${context || "Error"}]:`, errorInfo);
    } else {
      // In production, you could send to monitoring service
      // Example: sendToMonitoring(errorInfo);
    }
  }

  /**
   * Create user-friendly error message
   */
  static getUserMessage(error: any): string {
    if (error?.response?.data?.message) {
      return error.response.data.message;
    }

    if (error?.message) {
      return error.message;
    }

    return "An unexpected error occurred. Please try again.";
  }

  /**
   * Handle API errors with user feedback
   */
  static handleApiError(error: any, context: string): AppError {
    this.logError(error, context);

    return {
      message: this.getUserMessage(error),
      code: error?.response?.status?.toString(),
      details: error?.response?.data,
    };
  }
}

/**
 * Toast notification utility (can be enhanced with a proper toast library)
 */
export class NotificationService {
  static showError(message: string): void {
    // For now, use alert. In production, replace with proper toast notifications
    alert(`Error: ${message}`);
  }

  static showSuccess(message: string): void {
    // For now, use alert. In production, replace with proper toast notifications
    alert(`Success: ${message}`);
  }

  static showInfo(message: string): void {
    // For now, use alert. In production, replace with proper toast notifications
    alert(`Info: ${message}`);
  }
}
