import type { AccidentAssistanceFormData } from '@easy-service/shared';
import { renderAccidentAssistanceFormTemplate } from '../templates/accident-assistance-form.template';

const DATA: AccidentAssistanceFormData = {
  fullName: 'Maria da Silva',
  cpf: '123.456.789-00',
  postalCode: '69309-089',
  street: 'Rua José Pinheiro',
  streetNumber: '731',
  neighborhood: 'Liberdade',
  city: 'Boa Vista',
  state: 'RR',
  phone: '(95) 99999-9999',
  secondaryPhone: '(95) 98888-8888',
  accidentType: 'Acidente de Trabalho (91)',
  receivedSicknessBenefit: true,
  sicknessBenefitEndDate: '2026-06-22',
  caseDescription: 'Descrição detalhada do caso.',
};

describe('renderAccidentAssistanceFormTemplate', (): void => {
  it('renders the supplied form data in a vector HTML layout', (): void => {
    const html = renderAccidentAssistanceFormTemplate(DATA);

    expect(html).toContain(DATA.fullName);
    expect(html).toContain(DATA.cpf);
    expect(html).toContain(DATA.accidentType);
    expect(html).toContain('22/06/2026');
    expect(html).toContain(DATA.caseDescription);
    expect(html).toContain('class="card"');
    expect(html).toContain('Ficha de Atendimento');
    expect(html).not.toContain('data:image/png;base64,');
  });

  it('escapes user-provided HTML', (): void => {
    const html = renderAccidentAssistanceFormTemplate({
      ...DATA,
      fullName: '<script>alert(1)</script>',
    });

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('renders non-applicable cessation date when no benefit was received', (): void => {
    const html = renderAccidentAssistanceFormTemplate({
      ...DATA,
      receivedSicknessBenefit: false,
      sicknessBenefitEndDate: undefined,
    });

    expect(html).toContain('Não se aplica');
  });

  it('normalizes phone numbers and unnecessary description spaces', (): void => {
    const html = renderAccidentAssistanceFormTemplate({
      ...DATA,
      phone: '95999999999',
      caseDescription: 'Primeira   linha\n  Segunda     linha',
    });

    expect(html).toContain('(95) 99999-9999');
    expect(html).toContain('Primeira linha\nSegunda linha');
    expect(html).not.toContain('Primeira   linha');
  });

  it('keeps long addresses in a vertically centered wrapping block', (): void => {
    const html = renderAccidentAssistanceFormTemplate({
      ...DATA,
      street: 'Avenida com um nome excepcionalmente longo para validar a apresentação integral do endereço',
      complement: 'Edifício Central, bloco 10, apartamento 123',
    });

    expect(html).toContain('class="personal-row address-row"');
    expect(html).toContain('align-items: center');
    expect(html).toContain('font-size: 9.5pt');
  });

  it('renders personal data without field lines and keeps the contact separator', (): void => {
    const html = renderAccidentAssistanceFormTemplate(DATA);

    expect(html).not.toContain('line-cover');
    expect(html).toContain('<span class="label">Nome:</span>');
    expect(html).toContain('<span class="label">CPF:</span>');
    expect(html).toContain('<span class="label">Endereço:</span>');
    expect(html).toContain('<span class="label">Contatos:</span>');
    expect(html).toContain('<span class="separator">/</span>');
    expect(html).toContain('.case-title { top: 123.5mm; width: 79mm; text-align: right; }');
  });
});
