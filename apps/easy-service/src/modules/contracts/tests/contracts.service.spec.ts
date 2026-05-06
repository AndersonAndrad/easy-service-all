import { ForbiddenException } from '@nestjs/common';
import type { MaternityContractData } from '@easy-service/shared';
import { Roles } from 'src/shared/enums/roles.enum';
import { ContractsService } from '../app/contracts.service';

const PDF_BUFFER = Buffer.from('%PDF-1.4');

const mockPdfService = { generateFromHtml: jest.fn().mockResolvedValue(PDF_BUFFER) };

function makeAuthContext(roles: Roles[] = [Roles.ADMIN]) {
  return { getAuthContext: jest.fn().mockReturnValue({ userId: 'user-1', roles }) };
}

const DATA: MaternityContractData = {
  fullName: 'Maria Silva',
  cpf: '111.222.333-44',
  maritalStatus: 'Single',
  profession: 'Nurse',
  street: 'Rua A, 10',
  neighborhood: 'Jardim',
  postalCode: '00000-000',
  city: 'Campinas',
};

describe('ContractsService', (): void => {
  let service: ContractsService;
  let authContext: ReturnType<typeof makeAuthContext>;

  beforeEach((): void => {
    jest.clearAllMocks();
    authContext = makeAuthContext();
    service = new ContractsService(mockPdfService as never, authContext as never);
  });

  describe('generateMaternityContract', (): void => {
    it('returns PDF buffer for ADMIN role', async (): Promise<void> => {
      const result = await service.generateMaternityContract(DATA, 'ws-1');

      expect(result).toBe(PDF_BUFFER);
      expect(mockPdfService.generateFromHtml).toHaveBeenCalledTimes(1);
    });

    it('returns PDF buffer for SUPER_ADMIN role', async (): Promise<void> => {
      authContext = makeAuthContext([Roles.SUPER_ADMIN]);
      service = new ContractsService(mockPdfService as never, authContext as never);

      const result = await service.generateMaternityContract(DATA, 'ws-2');
      expect(result).toBe(PDF_BUFFER);
    });

    it('throws ForbiddenException when caller has no admin role', async (): Promise<void> => {
      authContext = makeAuthContext([]);
      service = new ContractsService(mockPdfService as never, authContext as never);

      await expect(service.generateMaternityContract(DATA, 'ws-1')).rejects.toThrow(ForbiddenException);
      expect(mockPdfService.generateFromHtml).not.toHaveBeenCalled();
    });

    it('passes HTML containing all contract data to PdfService', async (): Promise<void> => {
      await service.generateMaternityContract(DATA, 'ws-3');

      const [html] = mockPdfService.generateFromHtml.mock.calls[0] as [string];
      expect(html).toContain(DATA.fullName);
      expect(html).toContain(DATA.cpf);
      expect(html).toContain(DATA.city);
      expect(html).toContain('ws-3');
    });

    it('propagates errors from PdfService', async (): Promise<void> => {
      mockPdfService.generateFromHtml.mockRejectedValueOnce(new Error('pdf failed'));

      await expect(service.generateMaternityContract(DATA, 'ws-1')).rejects.toThrow('pdf failed');
    });
  });
});
