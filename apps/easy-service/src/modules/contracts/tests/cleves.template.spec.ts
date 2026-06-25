import type { ClevesContractData } from '@easy-service/shared';
import { renderClevesTemplate } from '../templates/cleves.template';

const DATA: ClevesContractData = {
  fullName: 'JAMIL DA SILVA PINTO',
  nationality: 'brasileiro',
  maritalStatus: 'casado',
  profession: 'porteiro predial',
  cpf: '874.240.109-72',
  street: 'Rua Heitor Busato',
  streetNumber: '99',
  neighborhood: 'São Gabriel',
  postalCode: '83.407-060',
  city: 'COLOMBO',
  state: 'PR',
};

describe('renderClevesTemplate', (): void => {
  it('returns an object with html and footerTemplate strings', (): void => {
    const result = renderClevesTemplate(DATA);
    expect(typeof result.html).toBe('string');
    expect(result.html.length).toBeGreaterThan(0);
    expect(typeof result.footerTemplate).toBe('string');
    expect(result.footerTemplate.length).toBeGreaterThan(0);
  });

  it('contains the CONTRATANTE full name', (): void => {
    expect(renderClevesTemplate(DATA).html).toContain(DATA.fullName);
  });

  it('contains the CPF', (): void => {
    expect(renderClevesTemplate(DATA).html).toContain(DATA.cpf);
  });

  it('contains the city', (): void => {
    expect(renderClevesTemplate(DATA).html).toContain(DATA.city);
  });

  it('contains CLÉVES DOMINGOS GALLIASSI', (): void => {
    expect(renderClevesTemplate(DATA).html).toContain('CLÉVES DOMINGOS GALLIASSI');
  });

  it('contains OAB/RS sob nº 59.626', (): void => {
    expect(renderClevesTemplate(DATA).html).toContain('59.626');
  });

  it('contains the blue title box class', (): void => {
    expect(renderClevesTemplate(DATA).html).toContain('box-title');
  });

  it('footerTemplate contains website URL', (): void => {
    expect(renderClevesTemplate(DATA).footerTemplate).toContain('www.galliassi.adv.br');
  });

  it('html does not contain footer URL (only in footerTemplate)', (): void => {
    expect(renderClevesTemplate(DATA).html).not.toContain('www.galliassi.adv.br');
  });

  it('contains Procuração section', (): void => {
    expect(renderClevesTemplate(DATA).html).toContain('Procuração');
  });

  it('contains Declaração de Renda section', (): void => {
    expect(renderClevesTemplate(DATA).html).toContain('Declaração de Renda');
  });

  it('contains Natália Battistella in Procuração', (): void => {
    expect(renderClevesTemplate(DATA).html).toContain('NATÁLIA BATTISTELLA');
  });

  it('escapes HTML special characters in name', (): void => {
    const { html } = renderClevesTemplate({ ...DATA, fullName: '<script>alert(1)</script>' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('produces valid HTML with doctype', (): void => {
    expect(renderClevesTemplate(DATA).html).toMatch(/<!DOCTYPE html>/i);
  });

  it('PROCURAÇÃO and DECLARAÇÃO each have a forced page-break before them', (): void => {
    const { html } = renderClevesTemplate(DATA);
    const breaks = [...html.matchAll(/page-break/g)].map((m) => m.index ?? 0);
    const procIdx = html.indexOf('Procuração');
    const declIdx = html.indexOf('Declaração de Renda');
    expect(breaks.filter((pos) => pos < procIdx).length).toBeGreaterThan(0);
    expect(breaks.filter((pos) => pos < declIdx && pos > procIdx).length).toBeGreaterThan(0);
  });
});
