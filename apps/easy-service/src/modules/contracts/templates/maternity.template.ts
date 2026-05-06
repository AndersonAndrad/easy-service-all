import type { MaternityContractData } from '@easy-service/shared';

export function renderMaternityTemplate(data: MaternityContractData, workspaceId: string): string {
  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return /* html */ `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; color: #1a1a1a; line-height: 1.6; }
    .page { max-width: 170mm; margin: 0 auto; }
    h1 { font-size: 16pt; text-align: center; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 4px; }
    .subtitle { text-align: center; font-size: 10pt; color: #555; margin-bottom: 24px; }
    .divider { border: none; border-top: 2px solid #1a1a1a; margin: 12px 0 24px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 11pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 6px 8px; vertical-align: top; }
    td:first-child { font-weight: bold; width: 40%; color: #333; }
    tr:nth-child(even) td { background: #f9f9f9; }
    .placeholder-box { background: #f5f5f5; border: 1px dashed #bbb; border-radius: 4px; padding: 16px; margin: 20px 0; color: #666; font-style: italic; text-align: center; font-size: 10pt; line-height: 1.8; }
    .signatures { margin-top: 48px; display: flex; justify-content: space-between; }
    .sig-block { text-align: center; width: 45%; }
    .sig-line { border-top: 1px solid #1a1a1a; padding-top: 6px; margin-top: 40px; font-size: 10pt; }
    .footer { margin-top: 32px; text-align: center; font-size: 9pt; color: #777; }
    .workspace-id { font-size: 8pt; color: #aaa; text-align: right; margin-bottom: 4px; }
  </style>
</head>
<body>
  <div class="page">
    <div class="workspace-id">Workspace: ${workspaceId}</div>
    <h1>Maternity Services Agreement</h1>
    <p class="subtitle">Generated on ${today}</p>
    <hr class="divider" />

    <div class="section">
      <div class="section-title">Client Information</div>
      <table>
        <tr><td>Full Name</td><td>${data.fullName}</td></tr>
        <tr><td>CPF</td><td>${data.cpf}</td></tr>
        <tr><td>Marital Status</td><td>${data.maritalStatus}</td></tr>
        <tr><td>Profession</td><td>${data.profession}</td></tr>
      </table>
    </div>

    <div class="section">
      <div class="section-title">Address</div>
      <table>
        <tr><td>Street</td><td>${data.street}</td></tr>
        <tr><td>Neighborhood</td><td>${data.neighborhood}</td></tr>
        <tr><td>Postal Code</td><td>${data.postalCode}</td></tr>
        <tr><td>City</td><td>${data.city}</td></tr>
      </table>
    </div>

    <div class="placeholder-box">
      [ Contract body — to be filled in ]<br/>
      The clauses and conditions of the maternity services agreement<br/>
      will be inserted here as defined by the contracting party.
    </div>

    <div class="signatures">
      <div class="sig-block">
        <div class="sig-line">${data.fullName}<br/><span style="color:#555">Client — CPF ${data.cpf}</span></div>
      </div>
      <div class="sig-block">
        <div class="sig-line">_______________________________<br/><span style="color:#555">Service Provider</span></div>
      </div>
    </div>

    <div class="footer">${data.city}, ${today}</div>
  </div>
</body>
</html>`;
}
