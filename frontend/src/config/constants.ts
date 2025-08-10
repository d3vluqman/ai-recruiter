/**
 * Application constants and configuration values
 */

// File upload configuration
export const FILE_UPLOAD = {
  MAX_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  MAX_SIZE_DISPLAY: "10MB",
  ALLOWED_TYPES: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ],
  ALLOWED_EXTENSIONS: ["PDF", "DOC", "DOCX", "TXT"],
} as const;

// API configuration
export const API_CONFIG = {
  DEFAULT_BACKEND_URL: "http://localhost:3001",
  DEFAULT_SUPABASE_URL: "http://localhost:54321",
  REQUEST_TIMEOUT: 30000, // 30 seconds
} as const;

// UI configuration
export const UI_CONFIG = {
  PAGINATION_SIZE: 10,
  DEBOUNCE_DELAY: 300, // milliseconds
  TOAST_DURATION: 5000, // milliseconds
} as const;

// Validation rules
export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_FILE_NAME_LENGTH: 255,
  MAX_DESCRIPTION_LENGTH: 5000,
  MIN_JOB_TITLE_LENGTH: 3,
} as const;

// Error messages
export const ERROR_MESSAGES = {
  FILE_TOO_LARGE: `File size must be less than ${FILE_UPLOAD.MAX_SIZE_DISPLAY}`,
  INVALID_FILE_TYPE: `Please select a ${FILE_UPLOAD.ALLOWED_EXTENSIONS.join(
    ", "
  )} file`,
  REQUIRED_FIELDS: "Please fill in all required fields",
  NETWORK_ERROR: "Network error. Please check your connection and try again",
  GENERIC_ERROR: "An unexpected error occurred. Please try again",
} as const;
