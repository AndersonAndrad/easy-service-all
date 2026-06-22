import { formatBrazilianPhone, normalizeTextLines, type AccidentAssistanceFormData } from '@easy-service/shared';

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function formatDate(value?: string): string {
  if (!value) return 'Não se aplica';
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export function renderAccidentAssistanceFormTemplate(data: AccidentAssistanceFormData): string {
  const address = [`${data.street}, ${data.streetNumber}`, data.complement, data.neighborhood, `${data.city}/${data.state}`, `CEP ${data.postalCode}`].filter(Boolean).join(' - ');
  const description = normalizeTextLines(data.caseDescription).trim();
  const descriptionWords = description.split(/\s+/u).length;
  const descriptionClass = descriptionWords > 350 ? 'very-long' : descriptionWords > 220 ? 'long' : descriptionWords > 120 ? 'medium' : '';

  return /* html */ `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    html, body { width: 210mm; height: 297mm; margin: 0; padding: 0; }
    body {
      background: #fff;
      color: #111;
      font-family: Arial, Helvetica, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      position: relative;
      width: 210mm;
      height: 297mm;
      overflow: hidden;
      border: 0.25mm solid #e7e7e7;
      background: #fff;
    }
    .card {
      position: absolute;
      inset: 17mm 9.5mm 7mm;
      overflow: hidden;
      border-radius: 10mm;
      background: #fffaf6;
    }
    .heading {
      position: absolute;
      top: 22.5mm;
      left: 25mm;
      width: 160mm;
      text-align: center;
      color: #333;
    }
    .heading h1 {
      margin: 0;
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 20pt;
      font-weight: 700;
      line-height: 1;
    }
    .heading p {
      margin: 2mm 0 0;
      font-size: 9pt;
      letter-spacing: 1.6mm;
      line-height: 1;
    }
    .section-title {
      position: absolute;
      left: 0;
      z-index: 2;
      height: 11.5mm;
      padding: 2.4mm 5mm 0 6.5mm;
      border-radius: 0 2.5mm 2.5mm 0;
      background: #000;
      color: #fff;
      font-size: 14pt;
      font-weight: 700;
      line-height: 1;
    }
    .personal-title { top: 49.5mm; width: 79mm; text-align: right; }
    .case-title { top: 123.5mm; width: 79mm; text-align: right; }
    .personal-data {
      position: absolute;
      top: 65mm;
      left: 21mm;
      width: 165mm;
      font-size: 11pt;
    }
    .personal-row {
      display: flex;
      min-height: 15mm;
      align-items: center;
      gap: 3mm;
    }
    .personal-row .label {
      flex: 0 0 auto;
      font-size: 14pt;
      line-height: 1;
    }
    .personal-row .value {
      min-width: 0;
      font-size: 10pt;
      line-height: 1.15;
    }
    .address-row { min-height: 15mm; }
    .address-row .value {
      display: flex;
      min-height: 10mm;
      flex: 1;
      align-items: center;
      overflow-wrap: anywhere;
      font-size: 9.5pt;
    }
    .contacts-row { gap: 4mm; }
    .contacts-row .contact {
      width: 46mm;
      text-align: center;
    }
    .contacts-row .separator {
      font-size: 14pt;
      line-height: 1;
    }
    .case-data {
      position: absolute;
      top: 139mm;
      left: 21mm;
      width: 168mm;
    }
    .case-field { position: absolute; left: 0; width: 100%; }
    .case-field .label {
      display: block;
      margin-bottom: 2.5mm;
      font-size: 14pt;
      line-height: 1;
    }
    .case-field .value {
      display: block;
      font-size: 11pt;
      line-height: 1.15;
    }
    .accident-type { top: 0; }
    .received-benefit { top: 20mm; }
    .benefit-end { top: 44mm; }
    .description-field { top: 74mm; }
    .description {
      width: 158mm;
      height: 43mm;
      overflow: hidden;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      text-align: justify;
      font-size: 9pt !important;
      line-height: 1.2 !important;
    }
    .description.medium { font-size: 7.5pt !important; line-height: 1.12 !important; }
    .description.long { font-size: 6.2pt !important; line-height: 1.08 !important; }
    .description.very-long { font-size: 5.2pt !important; line-height: 1.04 !important; }
    .brand {
      position: absolute;
      right: 6mm;
      bottom: 8mm;
      width: 49mm;
      text-align: center;
      line-height: 1;
    }
    .brand-mark {
      display: flex;
      height: 23mm;
      align-items: flex-end;
      justify-content: center;
      gap: 0;
      letter-spacing: -3mm;
    }
    .brand-a {
      color: #f5f5f5;
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 50pt;
      font-style: italic;
      font-weight: 400;
      line-height: .75;
      text-shadow: -0.2mm 0 #aaa, 0 0.2mm #aaa, 0.2mm 0 #aaa, 0 -0.2mm #aaa;
    }
    .brand-w {
      color: #ffbd27;
      font-size: 53pt;
      font-weight: 800;
      line-height: .72;
    }
    .brand-name {
      margin-top: 1.2mm;
      color: #f5b91f;
      font-size: 9pt;
      font-weight: 800;
    }
    .brand-subtitle {
      margin-top: .8mm;
      color: #999;
      font-size: 7pt;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <main class="page">
    <div class="card"></div>

    <header class="heading">
      <h1>Ficha de Atendimento</h1>
      <p>AUXÍLIO ACIDENTE</p>
    </header>

    <div class="section-title personal-title">Dados Pessoais</div>
    <section class="personal-data">
      <div class="personal-row"><span class="label">Nome:</span><span class="value">${escapeHtml(data.fullName)}</span></div>
      <div class="personal-row"><span class="label">CPF:</span><span class="value">${escapeHtml(data.cpf)}</span></div>
      <div class="personal-row address-row"><span class="label">Endereço:</span><span class="value">${escapeHtml(address)}</span></div>
      <div class="personal-row contacts-row">
        <span class="label">Contatos:</span>
        <span class="value contact">${escapeHtml(formatBrazilianPhone(data.phone))}</span>
        <span class="separator">/</span>
        <span class="value contact">${escapeHtml(formatBrazilianPhone(data.secondaryPhone ?? ''))}</span>
      </div>
    </section>

    <div class="section-title case-title">Dados do caso</div>
    <section class="case-data">
      <div class="case-field accident-type"><span class="label">Tipo de acidente</span><span class="value">${escapeHtml(data.accidentType)}</span></div>
      <div class="case-field received-benefit"><span class="label">Recebeu Auxílio Doença?</span><span class="value">${data.receivedSicknessBenefit ? 'Sim' : 'Não'}</span></div>
      <div class="case-field benefit-end"><span class="label">Data da cessação do Auxílio Doença</span><span class="value">${escapeHtml(data.receivedSicknessBenefit ? formatDate(data.sicknessBenefitEndDate) : 'Não se aplica')}</span></div>
      <div class="case-field description-field"><span class="label">Descrição do caso</span><span class="value description ${descriptionClass}">${escapeHtml(description)}</span></div>
    </section>

    <footer class="brand" aria-label="Agência WE CORE Assessoria Digital">
      <div class="brand-mark"><span class="brand-a">A</span><span class="brand-w">W</span></div>
      <div class="brand-name">AGÊNCIA WE CORE</div>
      <div class="brand-subtitle">ASSESSORIA DIGITAL</div>
    </footer>
  </main>
</body>
</html>`;
}
