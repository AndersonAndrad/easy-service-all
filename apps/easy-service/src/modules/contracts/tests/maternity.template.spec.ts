import type { MaternityContractData } from '@easy-service/shared';
import { renderMaternityTemplate } from '../templates/maternity.template';

const DATA: MaternityContractData = {
  fullName: 'Maria Silva Santos',
  cpf: '123.456.789-00',
  maritalStatus: 'Married',
  profession: 'Teacher',
  street: 'Rua das Flores, 123',
  neighborhood: 'Centro',
  postalCode: '12345-678',
  city: 'São Paulo',
};
const WORKSPACE_ID = 'ws-test-001';

describe('renderMaternityTemplate', (): void => {
  let html: string;

  beforeAll((): void => {
    html = renderMaternityTemplate(DATA, WORKSPACE_ID);
  });

  it('returns a non-empty HTML string', (): void => {
    expect(typeof html).toBe('string');
    expect(html.length).toBeGreaterThan(0);
    expect(html).toContain('<!DOCTYPE html>');
  });

  it('contains all client information fields', (): void => {
    expect(html).toContain(DATA.fullName);
    expect(html).toContain(DATA.cpf);
    expect(html).toContain(DATA.maritalStatus);
    expect(html).toContain(DATA.profession);
  });

  it('contains all address fields', (): void => {
    expect(html).toContain(DATA.street);
    expect(html).toContain(DATA.neighborhood);
    expect(html).toContain(DATA.postalCode);
    expect(html).toContain(DATA.city);
  });

  it('embeds the workspaceId', (): void => {
    expect(html).toContain(WORKSPACE_ID);
  });

  it('contains the contract placeholder block', (): void => {
    expect(html).toContain('Contract body');
  });

  it('contains signature blocks for client and provider', (): void => {
    expect(html).toContain(DATA.fullName);
    expect(html).toContain('Service Provider');
  });

  it('does not expose raw template literal placeholders', (): void => {
    expect(html).not.toContain('${');
  });
});
