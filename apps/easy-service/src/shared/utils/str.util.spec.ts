import { isStringEmpty } from './str.util';

describe('str.util', (): void => {
  describe('isStringEmpty', (): void => {
    it('should return true for undefined and null', (): void => {
      expect(isStringEmpty(undefined as unknown as string)).toBe(true);
      expect(isStringEmpty(null as unknown as string)).toBe(true);
    });

    it('should return true for empty or whitespace-only strings', (): void => {
      expect(isStringEmpty('')).toBe(true);
      expect(isStringEmpty('   ')).toBe(true);
      expect(isStringEmpty('\n\t')).toBe(true);
    });

    it('should return false for non-empty strings with non-whitespace characters', (): void => {
      expect(isStringEmpty('a')).toBe(false);
      expect(isStringEmpty('  a  ')).toBe(false);
    });
  });
});
