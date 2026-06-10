import { ForbiddenException, Injectable, Scope } from '@nestjs/common';
import type { MaternityContractData, MaternityMarcelloContractData, ResidenceDeclarationData } from '@easy-service/shared';
import { Roles } from 'src/shared/enums/roles.enum';
import { CurrentAuthContextProvider } from 'src/shared/guards/current-auth-context.provider';
import { PdfService } from '../pdf/pdf.service';
import { renderMaternityTemplate } from '../templates/maternity.template';
import { renderMaternityWeCoreTemplate } from '../templates/maternity-we-core.template';
import { renderMaternityMarcelloTemplate } from '../templates/maternity-marcello.template';
import { renderResidenceDeclarationTemplate } from '../templates/residence-declaration.template';

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

  async generateMarcelloMaternityContract(data: MaternityMarcelloContractData): Promise<Buffer> {
    const auth = this.getAuth();
    if (!this.hasAdminRole(auth.roles)) throw new ForbiddenException('Insufficient roles');

    const { html, headerTemplate, footerTemplate } = renderMaternityMarcelloTemplate(data);
    return this.pdfService.generateFromHtmlWithLayout(html, {
      headerTemplate,
      footerTemplate,
      marginTop: '38mm',
      marginBottom: '0',
    });
  }

  async generateResidenceDeclarationContract(data: ResidenceDeclarationData): Promise<Buffer> {
    const auth = this.getAuth();
    if (!this.hasAdminRole(auth.roles)) throw new ForbiddenException('Insufficient roles');

    const html = renderResidenceDeclarationTemplate(data);
    return this.pdfService.generateFromHtml(html);
  }
}
