import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  async generateFromHtml(html: string): Promise<Buffer> {
    let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
      });
      return Buffer.from(pdf);
    } catch (err) {
      this.logger.error('Failed to generate PDF', err);
      throw new InternalServerErrorException('Failed to generate PDF');
    } finally {
      if (browser) await browser.close();
    }
  }
}
