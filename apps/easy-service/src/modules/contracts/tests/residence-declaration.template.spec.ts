import type { ResidenceDeclarationData } from '@easy-service/shared';
import { renderResidenceDeclarationTemplate } from '../templates/residence-declaration.template';

const DATA: ResidenceDeclarationData = {
  fullName: 'Maria Silva Santos',
  maritalStatus: 'Solteiro(a)',
  profession: 'Professora',
  cpf: '123.456.789-00',
  street: 'Rua das Flores',
  neighborhood: 'Centro',
  city: 'São Paulo',
  state: 'SP',
  postalCode: '12345-678',
  rg: '1234567',
  rgState: 'SP',
  streetNumber: '123',
};

const DATA_WITHOUT_OPTIONAL: ResidenceDeclarationData = {
  fullName: 'João Pereira',
  maritalStatus: 'Casado(a)',
  profession: 'Engenheiro',
  cpf: '987.654.321-00',
  street: 'Avenida Brasil',
  neighborhood: 'Jardim América',
  city: 'Curitiba',
  state: 'PR',
  postalCode: '80000-000',
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

  describe('without optional fields', (): void => {
    let htmlWithout: string;

    beforeAll((): void => {
      htmlWithout = renderResidenceDeclarationTemplate(DATA_WITHOUT_OPTIONAL);
    });

    it('renders without rg and rgState', (): void => {
      expect(htmlWithout).not.toContain('RG nº');
      expect(htmlWithout).not.toContain('SSP/');
      expect(htmlWithout).toContain(DATA_WITHOUT_OPTIONAL.cpf);
    });

    it('renders without streetNumber', (): void => {
      expect(htmlWithout).not.toContain('n°.');
      expect(htmlWithout).toContain(DATA_WITHOUT_OPTIONAL.street);
    });

    it('renders required fields correctly', (): void => {
      expect(htmlWithout).toContain(DATA_WITHOUT_OPTIONAL.fullName);
      expect(htmlWithout).toContain(DATA_WITHOUT_OPTIONAL.maritalStatus);
      expect(htmlWithout).toContain(DATA_WITHOUT_OPTIONAL.profession);
      expect(htmlWithout).toContain(DATA_WITHOUT_OPTIONAL.neighborhood);
      expect(htmlWithout).toContain(DATA_WITHOUT_OPTIONAL.city);
      expect(htmlWithout).toContain(DATA_WITHOUT_OPTIONAL.postalCode);
    });

    it('does not expose raw template literal placeholders', (): void => {
      expect(htmlWithout).not.toContain('${');
    });
  });
});
