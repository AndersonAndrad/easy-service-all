import { ForbiddenException, Injectable, Scope } from '@nestjs/common';
import type { MaternityContractData } from '@easy-service/shared';
import { Roles } from 'src/shared/enums/roles.enum';
import { CurrentAuthContextProvider } from 'src/shared/guards/current-auth-context.provider';
import { PdfService } from '../pdf/pdf.service';
import { renderMaternityTemplate } from '../templates/maternity.template';
import { renderMaternityWeCoreTemplate } from '../templates/maternity-we-core.template';

type AuthContext = { userId: string; roles: Roles[] };

@Injectable({ scope: Scope.REQUEST })
export class ContractsService {
  constructor(
    private readonly pdfService: PdfService,
    private readonly currentAuthContext: CurrentAuthContextProvider,
  ) {}

  private getAuth(): AuthContext {
    return this.currentAuthContext.getAuthContext() as AuthContext;
  }

  private hasAdminRole(roles: Roles[]): boolean {
    return roles.includes(Roles.ADMIN) || roles.includes(Roles.SUPER_ADMIN);
  }

  async generateMaternityContract(data: MaternityContractData): Promise<Buffer> {
    const auth = this.getAuth();
    if (!this.hasAdminRole(auth.roles)) throw new ForbiddenException('Insufficient roles');

    const html = renderMaternityTemplate(data);
    return this.pdfService.generateFromHtml(html);
  }

  async generateWeCoreMaternityContract(data: MaternityContractData): Promise<Buffer> {
    const auth = this.getAuth();
    if (!this.hasAdminRole(auth.roles)) throw new ForbiddenException('Insufficient roles');

    const html = renderMaternityWeCoreTemplate(data);
    return this.pdfService.generateFromHtml(html);
  }
}
