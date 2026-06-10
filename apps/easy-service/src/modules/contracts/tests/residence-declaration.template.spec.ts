import type { ResidenceDeclarationData } from '@easy-service/shared';
import { renderResidenceDeclarationTemplate } from '../templates/residence-declaration.template';

const DATA: ResidenceDeclarationData = {
  fullName: 'Maria Silva Santos',
  maritalStatus: 'Solteiro(a)',
  profession: 'Professora',
  rg: '1234567',
  rgState: 'SP',
  cpf: '123.456.789-00',
  street: 'Rua das Flores',
  streetNumber: '123',
  neighborhood: 'Centro',
  city: 'São Paulo',
  state: 'SP',
  postalCode: '12345-678',
};

describe('renderResidenceDeclarationTemplate', (): void => {
  let html: string;

  beforeAll((): void => {
    html = renderResidenceDeclarationTemplate(DATA);
  });

  it('returns a non-empty HTML string', (): void => {
    expect(typeof html).toBe('string');
    expect(html.length).toBeGreaterThan(0);
    expect(html).toContain('<!DOCTYPE html>');
  });

  it('contains the declaration title', (): void => {
    expect(html).toContain('Declaração de Residência');
  });

  it('contains all personal data fields', (): void => {
    expect(html).toContain(DATA.fullName);
    expect(html).toContain(DATA.maritalStatus);
    expect(html).toContain(DATA.profession);
    expect(html).toContain(DATA.rg);
    expect(html).toContain(DATA.rgState);
    expect(html).toContain(DATA.cpf);
  });

  it('contains all address fields', (): void => {
    expect(html).toContain(DATA.street);
    expect(html).toContain(DATA.streetNumber);
    expect(html).toContain(DATA.neighborhood);
    expect(html).toContain(DATA.city);
    expect(html).toContain(DATA.postalCode);
  });

  it('contains the declarant name in the signature block', (): void => {
    const sigIndex = html.indexOf('sig-line');
    expect(sigIndex).toBeGreaterThan(-1);
    expect(html.slice(sigIndex)).toContain(DATA.fullName);
  });

  it('does not expose raw template literal placeholders', (): void => {
    expect(html).not.toContain('${');
  });
});
