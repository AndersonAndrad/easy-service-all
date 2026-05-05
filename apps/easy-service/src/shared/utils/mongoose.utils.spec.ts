import { parseDocumentToObj } from './mongoose.utils';

describe('mongoose.utils', (): void => {
  describe('parseDocumentToObj', (): void => {
    it('should return result of document.toObject()', (): void => {
      const plain = { _id: '1', name: 'test' };
      const document = { toObject: (): typeof plain => plain };

      const result = parseDocumentToObj(document);

      expect(result).toEqual(plain);
    });
  });
});
