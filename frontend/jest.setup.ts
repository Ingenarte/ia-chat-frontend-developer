/**
 * Jest setup file for React Testing Library and common mocks.
 */
import '@testing-library/jest-dom';

// Optional: mock next/navigation if your components use it
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));
