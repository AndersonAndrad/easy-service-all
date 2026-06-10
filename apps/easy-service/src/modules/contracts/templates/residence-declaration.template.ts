import type { ResidenceDeclarationData } from '@easy-service/shared';

export function renderResidenceDeclarationTemplate(data: ResidenceDeclarationData): string {
  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const dateLine = `${data.city}/${data.state}, ${today}`;

  return /* html */ `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <style>
    @page { margin: 30mm 25mm 30mm 25mm; size: A4; }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      color: #1a1a1a;
      line-height: 1.8;
    }

    h1 {
      font-size: 14pt;
      text-align: center;
      text-transform: uppercase;
      font-weight: bold;
      text-decoration: underline;
      margin-bottom: 40px;
    }

    .body-text {
      text-align: justify;
      margin-bottom: 50px;
    }

    .date-line {
      text-align: right;
      margin-bottom: 70px;
    }

    .sig-block {
      text-align: center;
    }

    .sig-line {
      display: inline-block;
      border-top: 1px solid #1a1a1a;
      min-width: 320px;
      padding-top: 6px;
      font-size: 12pt;
    }
  </style>
</head>
<body>

  <h1>Declaração de Residência</h1>

  <p class="body-text">
    Eu, <strong>${data.fullName}</strong>, ${data.maritalStatus}, ${data.profession}, portador(a) do RG nº. ${data.rg},
    SSP/${data.rgState}, CPF nº. ${data.cpf}, <strong>DECLARO</strong> para fins de comprovação de residência,
    sob as penas da Lei (art. 1º e 2º da Lei nº 7.115/83) residir na ${data.street}, n°. ${data.streetNumber},
    Bairro ${data.neighborhood}, Município ${data.city}, CEP ${data.postalCode}. Estou ciente de que a
    falsidade na prestação destas informações me sujeitará às penalidades previstas no artigo 299 do
    Código Penal Brasileiro (Crime de Falsidade Ideológica), que prevê pena de reclusão de um a cinco
    anos e multa.
  </p>

  <p class="date-line">${dateLine}.</p>

  <div class="sig-block">
    <div class="sig-line">${data.fullName}</div>
  </div>

</body>
</html>`;
}
