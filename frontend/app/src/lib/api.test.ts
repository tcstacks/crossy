import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { puzzleApi } from './api';

// Create a mock for axios
vi.mock('axios', async () => {
  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };

  return {
    default: {
      create: vi.fn(() => mockAxiosInstance),
    },
  };
});

describe('puzzleApi', () => {
  let mockAxiosGet: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Get the mocked axios instance
    const mockInstance = (axios.create as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    if (mockInstance) {
      mockAxiosGet = mockInstance.get;
      mockAxiosGet.mockReset();
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getPuzzleByDate', () => {
    it('should call the correct URL pattern /api/puzzles/:date (not /api/puzzles/date/:date)', async () => {
      // This test documents the bug: the frontend calls /api/puzzles/date/:date
      // but the backend expects /api/puzzles/:date

      // Re-import to get fresh module with mocks
      vi.resetModules();

      // Create a spy on the actual URL being called
      const mockGet = vi.fn().mockResolvedValue({ data: { id: 'test-puzzle' } });

      // Mock axios.create to return our controlled mock
      vi.doMock('axios', () => ({
        default: {
          create: vi.fn(() => ({
            get: mockGet,
            post: vi.fn(),
            interceptors: {
              request: { use: vi.fn() },
              response: { use: vi.fn() },
            },
          })),
        },
      }));

      // Re-import the api module with fresh mocks
      const { puzzleApi: freshApi } = await import('./api');

      // Call getPuzzleByDate with a specific date
      const testDate = '2024-01-15';
      try {
        await freshApi.getPuzzleByDate({ date: testDate });
      } catch {
        // Expected to fail since mocks aren't fully set up
      }

      // The CORRECT URL should be /api/puzzles/2024-01-15
      // NOT /api/puzzles/date/2024-01-15
      const calledUrl = mockGet.mock.calls[0]?.[0];

      // This assertion will FAIL if the bug exists (calling /api/puzzles/date/:date)
      // and PASS once we fix it to call /api/puzzles/:date
      expect(calledUrl).toBe(`/api/puzzles/${testDate}`);
      expect(calledUrl).not.toContain('/date/');
    });

    it('should work with timestamp format dates from archive', async () => {
      // Archive API returns dates like "2024-01-15T00:00:00Z"
      // This test ensures the URL still works correctly

      vi.resetModules();

      const mockGet = vi.fn().mockResolvedValue({ data: { id: 'test-puzzle' } });

      vi.doMock('axios', () => ({
        default: {
          create: vi.fn(() => ({
            get: mockGet,
            post: vi.fn(),
            interceptors: {
              request: { use: vi.fn() },
              response: { use: vi.fn() },
            },
          })),
        },
      }));

      const { puzzleApi: freshApi } = await import('./api');

      // Date from archive API (with timezone)
      const archiveDate = '2024-01-15T00:00:00Z';
      try {
        await freshApi.getPuzzleByDate({ date: archiveDate });
      } catch {
        // Expected
      }

      const calledUrl = mockGet.mock.calls[0]?.[0];

      // URL should contain the date, not /date/ prefix
      expect(calledUrl).toBe(`/api/puzzles/${archiveDate}`);
      expect(calledUrl).not.toContain('/date/');
    });
  });
});
