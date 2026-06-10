import { Test, type TestingModule } from '@nestjs/testing';
import type { MaternityContractData, ResidenceDeclarationData } from '@easy-service/shared';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { RolesGuard } from 'src/shared/guards/roles.guard';
import { WorkspaceAccessGuard } from 'src/shared/guards/workspace-access.guard';
import { ContractsService } from '../app/contracts.service';
import { ContractsController } from '../rest/controllers/contracts.controller';

const PDF_BUFFER = Buffer.from('%PDF-1.4 test');

const mockContractsService = {
  generateMaternityContract: jest.fn().mockResolvedValue(PDF_BUFFER),
  generateResidenceDeclarationContract: jest.fn().mockResolvedValue(PDF_BUFFER),
};

function makeRes() {
  const res = {
    setHeader: jest.fn(),
    send: jest.fn(),
  };
  return res;
}

const DTO: MaternityContractData = {
  fullName: 'Ana Costa',
  cpf: '999.888.777-66',
  maritalStatus: 'Divorced',
  profession: 'Doctor',
  street: 'Av. Brasil, 500',
  neighborhood: 'Vila Nova',
  postalCode: '98765-432',
  city: 'Rio de Janeiro',
};

describe('ContractsController', (): void => {
  let controller: ContractsController;

  beforeEach(async (): Promise<void> => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContractsController],
      providers: [{ provide: ContractsService, useValue: mockContractsService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: (): boolean => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: (): boolean => true })
      .overrideGuard(WorkspaceAccessGuard)
      .useValue({ canActivate: (): boolean => true })
      .compile();

    controller = module.get<ContractsController>(ContractsController);
  });

  describe('generateMaternity', (): void => {
    it('calls service with dto and workspaceId', async (): Promise<void> => {
      const res = makeRes();
      await controller.generateMaternity('ws-abc', DTO as never, res as never);

      expect(mockContractsService.generateMaternityContract).toHaveBeenCalledWith(DTO, 'ws-abc');
    });

    it('sets Content-Type to application/pdf', async (): Promise<void> => {
      const res = makeRes();
      await controller.generateMaternity('ws-abc', DTO as never, res as never);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    });

    it('sets Content-Disposition as attachment with filename', async (): Promise<void> => {
      const res = makeRes();
      await controller.generateMaternity('ws-abc', DTO as never, res as never);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="maternity-contract.pdf"');
    });

    it('sets Content-Length equal to buffer length', async (): Promise<void> => {
      const res = makeRes();
      await controller.generateMaternity('ws-abc', DTO as never, res as never);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Length', PDF_BUFFER.length);
    });

    it('sends the PDF buffer', async (): Promise<void> => {
      const res = makeRes();
      await controller.generateMaternity('ws-abc', DTO as never, res as never);

      expect(res.send).toHaveBeenCalledWith(PDF_BUFFER);
    });

    it('propagates service errors', async (): Promise<void> => {
      mockContractsService.generateMaternityContract.mockRejectedValueOnce(new Error('generation failed'));
      const res = makeRes();

      await expect(controller.generateMaternity('ws-abc', DTO as never, res as never)).rejects.toThrow('generation failed');
    });
  });

  describe('generateResidenceDeclaration', (): void => {
    const RESIDENCE_DTO: ResidenceDeclarationData = {
      fullName: 'Ana Costa',
      maritalStatus: 'Solteiro(a)',
      profession: 'Enfermeira',
      rg: '9876543',
      rgState: 'RJ',
      cpf: '999.888.777-66',
      street: 'Av. Brasil',
      streetNumber: '500',
      neighborhood: 'Vila Nova',
      city: 'Rio de Janeiro',
      state: 'RJ',
      postalCode: '98765-432',
    };

    it('calls service with dto', async (): Promise<void> => {
      const res = makeRes();
      await controller.generateResidenceDeclaration(RESIDENCE_DTO as never, res as never);

      expect(mockContractsService.generateResidenceDeclarationContract).toHaveBeenCalledWith(RESIDENCE_DTO);
    });

    it('sets Content-Type to application/pdf', async (): Promise<void> => {
      const res = makeRes();
      await controller.generateResidenceDeclaration(RESIDENCE_DTO as never, res as never);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    });

    it('sets Content-Disposition as attachment with filename', async (): Promise<void> => {
      const res = makeRes();
      await controller.generateResidenceDeclaration(RESIDENCE_DTO as never, res as never);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="residence-declaration.pdf"');
    });

    it('sets Content-Length equal to buffer length', async (): Promise<void> => {
      const res = makeRes();
      await controller.generateResidenceDeclaration(RESIDENCE_DTO as never, res as never);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Length', PDF_BUFFER.length);
    });

    it('sends the PDF buffer', async (): Promise<void> => {
      const res = makeRes();
      await controller.generateResidenceDeclaration(RESIDENCE_DTO as never, res as never);

      expect(res.send).toHaveBeenCalledWith(PDF_BUFFER);
    });

    it('propagates service errors', async (): Promise<void> => {
      mockContractsService.generateResidenceDeclarationContract.mockRejectedValueOnce(new Error('generation failed'));
      const res = makeRes();

      await expect(controller.generateResidenceDeclaration(RESIDENCE_DTO as never, res as never)).rejects.toThrow('generation failed');
    });
  });
});
