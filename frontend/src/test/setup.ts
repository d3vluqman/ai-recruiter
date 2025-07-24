import "@testing-library/jest-dom";

// Mock environment variables
Object.defineProperty(import.meta, "env", {
  value: {
    VITE_SUPABASE_URL: "http://localhost:54321",
    VITE_SUPABASE_ANON_KEY: "test-anon-key",
    VITE_API_BASE_URL: "http://localhost:3001",
  },
  writable: true,
});

// Mock fetch for tests
import { vi } from "vitest";
global.fetch = vi.fn();
