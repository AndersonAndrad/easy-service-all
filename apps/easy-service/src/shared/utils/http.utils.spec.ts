import { normalizeCompleteUrl, normalizeUrl } from './http.utils';

describe('http.utils', (): void => {
  describe('normalizeUrl', (): void => {
    it('should return empty string for falsy input', (): void => {
      expect(normalizeUrl('')).toBe('');
      expect(normalizeUrl(undefined as unknown as string)).toBe('');
    });

    it('should collapse duplicate slashes when there is no protocol', (): void => {
      expect(normalizeUrl('api///v1//users')).toBe('api/v1/users');
    });

    it('should preserve protocol and collapse duplicate slashes only in path', (): void => {
      expect(normalizeUrl('https://example.com///v1//users')).toBe('https://example.com/v1/users');
    });

    it('should return url unchanged when split by :// has more than two parts', (): void => {
      const malformed = 'http://example.com://extra';
      expect(normalizeUrl(malformed)).toBe(malformed);
    });
  });

  describe('normalizeCompleteUrl', (): void => {
    it('should join baseURL and relative url and normalize', (): void => {
      const result = normalizeCompleteUrl('https://example.com//', '//v1//users');
      expect(result).toBe('https://example.com/v1/users');
    });

    it('should return normalized absolute url when url is already absolute', (): void => {
      const result = normalizeCompleteUrl('https://base-ignored.com', 'https://example.com///v1//users');
      expect(result).toBe('https://example.com/v1/users');
    });

    it('should handle empty path', (): void => {
      const result = normalizeCompleteUrl('https://example.com///', '');
      expect(result).toBe('https://example.com');
    });
  });
});
