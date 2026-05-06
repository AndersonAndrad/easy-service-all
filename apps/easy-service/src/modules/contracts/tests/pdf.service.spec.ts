import { InternalServerErrorException, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer';
import { PdfService } from '../pdf/pdf.service';

jest.mock('puppeteer');

const mockPdf = jest.fn().mockResolvedValue(Buffer.from('%PDF-placeholder'));
const mockSetContent = jest.fn().mockResolvedValue(undefined);
const mockNewPage = jest.fn().mockResolvedValue({ setContent: mockSetContent, pdf: mockPdf });
const mockClose = jest.fn().mockResolvedValue(undefined);
const mockBrowser = { newPage: mockNewPage, close: mockClose };

describe('PdfService', (): void => {
  let service: PdfService;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach((): void => {
    jest.clearAllMocks();
    (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);
    service = new PdfService();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation((): void => {});
  });

  afterEach((): void => {
    loggerErrorSpy.mockRestore();
  });

  describe('generateFromHtml', (): void => {
    it('returns a Buffer from Puppeteer PDF output', async (): Promise<void> => {
      const html = '<html><body>Contract</body></html>';
      const result = await service.generateFromHtml(html);

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.toString()).toBe('%PDF-placeholder');
    });

    it('launches browser with sandbox flags', async (): Promise<void> => {
      await service.generateFromHtml('<p>test</p>');

      expect(puppeteer.launch).toHaveBeenCalledWith({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
    });

    it('sets page content with networkidle0 and A4 margins', async (): Promise<void> => {
      const html = '<p>test</p>';
      await service.generateFromHtml(html);

      expect(mockSetContent).toHaveBeenCalledWith(html, { waitUntil: 'networkidle0' });
      expect(mockPdf).toHaveBeenCalledWith({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
      });
    });

    it('always closes the browser even on page error', async (): Promise<void> => {
      mockSetContent.mockRejectedValueOnce(new Error('page crash'));

      await expect(service.generateFromHtml('<p>err</p>')).rejects.toThrow(InternalServerErrorException);
      expect(mockClose).toHaveBeenCalledTimes(1);
    });

    it('throws InternalServerErrorException when Puppeteer fails', async (): Promise<void> => {
      (puppeteer.launch as jest.Mock).mockRejectedValueOnce(new Error('no chrome'));

      await expect(service.generateFromHtml('<p>x</p>')).rejects.toThrow(InternalServerErrorException);
      expect(loggerErrorSpy).toHaveBeenCalledWith('Failed to generate PDF', expect.any(Error));
    });
  });
});
