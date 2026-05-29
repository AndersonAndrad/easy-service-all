import * as fs from 'fs';
import * as path from 'path';

import type { MaternityContractData } from '@easy-service/shared';

function readImageAsDataUri(filename: string): string {
  try {
    const filePath = path.resolve(process.cwd(), 'docs/contracts', filename);
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filename).slice(1).toLowerCase();
    const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch {
    return '';
  }
}

export function renderMaternityTemplate(data: MaternityContractData): string {
  const topImageSrc = readImageAsDataUri('top.jpg');
  const bottomImageSrc = readImageAsDataUri('bottom.jpg');
  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const cityUf = `${data.city} - ${data.state}`;
  const dateLine = `${data.city}/${data.state}, ${today}`;
  const address = `${data.street}, Bairro ${data.neighborhood}`;

  return /* html */ `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <style>
    @page { margin: 14mm 13mm 14mm 13mm; size: A4; }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 9pt;
      color: #1a1a1a;
      line-height: 1.35;
    }

    /* ── imagens fixas em todas as páginas ── */
    .img-top-right {
      position: fixed;
      top: 0;
      right: 0;
      width: 38mm;
    }
    .img-bottom-right {
      position: fixed;
      bottom: 0;
      right: 0;
      width: 55mm;
    }
    .img-top-right img,
    .img-bottom-right img {
      width: 100%;
      display: block;
    }

    /* ── título ── */
    h1 {
      font-size: 10.5pt;
      text-align: center;
      text-transform: uppercase;
      font-weight: bold;
      text-decoration: underline;
      margin-top: 17mm;
      margin-bottom: 7px;
    }

    /* ── grid de dados ── */
    .data-grid {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 7px;
    }
    .data-grid td {
      border: 1px solid #1a1a1a;
      padding: 2px 5px 3px;
      vertical-align: top;
    }
    .data-grid .lbl {
      font-weight: bold;
      text-transform: uppercase;
      font-size: 6.5pt;
      display: block;
      letter-spacing: 0.2px;
      line-height: 1.2;
    }
    .data-grid .val {
      font-size: 9pt;
      display: block;
    }

    /* ── parágrafos do contrato ── */
    .block {
      margin-bottom: 9px;
      text-align: justify;
    }
    .ctitle {
      font-weight: bold;
      text-transform: uppercase;
    }

    /* ── data e assinaturas ── */
    .date-line {
      margin-top: 8px;
      text-align: right;
    }
    .sigs {
      margin-top: 18px;
      display: flex;
      justify-content: space-between;
      gap: 20px;
    }
    .sig {
      text-align: center;
      flex: 1;
    }
    .sig-line {
      border-top: 1px solid #1a1a1a;
      padding-top: 4px;
      margin-top: 20px;
      font-size: 9pt;
    }

    /* ── lista de poderes ── */
    .pow { margin-left: 10px; margin-bottom: 2px; }

    /* ── wrapper de página (empurra assinaturas para o rodapé) ── */
    .page-content {
      display: flex;
      flex-direction: column;
      height: calc(297mm - 28mm); /* A4 - (14mm topo + 14mm base) */
      padding-bottom: 12mm;       /* respeita a imagem fixa de baixo (~10mm) */
    }
    .spacer { flex: 1; }
  </style>
</head>
<body>

  <!-- imagens fixas em todas as páginas -->
  ${topImageSrc ? `<div class="img-top-right"><img src="${topImageSrc}" alt="" /></div>` : ''}
  ${bottomImageSrc ? `<div class="img-bottom-right"><img src="${bottomImageSrc}" alt="" /></div>` : ''}

  <!-- ═══════════════════════════════════════════════
       PÁGINA 1 — CONTRATO DE HONORÁRIOS ADVOCATÍCIOS
       ═══════════════════════════════════════════════ -->

  <div class="page-content">
    <h1>Contrato de Honorários Advocatícios</h1>

    ${
      !data.isMinor
        ? `<table class="data-grid">
      <tr>
        <td colspan="3">
          <span class="lbl">Contratante</span>
          <span class="val">${data.fullName}</span>
        </td>
      </tr>
      <tr>
        <td><span class="lbl">CPF</span><span class="val">${data.cpf}</span></td>
        <td><span class="lbl">Profissão</span><span class="val">${data.profession}</span></td>
        <td><span class="lbl">Estado Civil</span><span class="val">${data.maritalStatus}</span></td>
      </tr>
      <tr>
        <td colspan="3">
          <span class="lbl">Endereço</span>
          <span class="val">${address}</span>
        </td>
      </tr>
      <tr>
        <td colspan="2" style="border-right:0;">
          <span class="lbl">Cidade / UF</span>
          <span class="val">${cityUf}</span>
        </td>
        <td style="border-left:0;">
          <span class="lbl">Benefício Contratado</span>
          <span class="val">SALÁRIO MATERNIDADE</span>
        </td>
      </tr>
    </table>`
        : ''
    }

    ${
      data.isMinor
        ? `<div class="block">
      <span class="ctitle">Contratante:</span> ${data.fullName}, brasileiro(a), menor relativamente incapaz, inscrito(a) no
      CPF nº ${data.cpf}, residente e domiciliado(a) na ${address},
      ${data.city}/${data.state}, neste ato assistido(a) por seu responsável legal ${data.guardianName ?? ''},
      brasileiro(a), inscrito(a) no CPF nº ${data.guardianCpf ?? ''},
      residente e domiciliado(a) no mesmo endereço.
    </div>`
        : ''
    }

    <div class="block">
      <span class="ctitle">Contratado:</span> THIAGO RIBEIRO EVANGELISTA SOCIEDADE INDIVIDUAL DE ADVOCACIA – inscrita no CNPJ
      33.178.744/0001-50, representada pelo Advogado Thiago ribeiro evangelista, inscrito na OAB/PI 5.371 e na OAB/MA
      19092 – A, brasileiro, casado, inscrito no CPF: 877.753.873 – 00 e no RG: 2.055.520 SSP/PI, e-mail:
      prevdrthiagoe@gmail.com, com endereço profissional localizado na avenida senador Arêa Leão, Edifício Manhattan
      River Center número 2185, Torre I, sala 1006, bairro Jóquei, CEP: 64051 – 090, Teresina/PI, fone: 86 99990-4707.
    </div>

    <div class="block">
      <span class="ctitle">Cláusula Primeira – Do Objeto:</span> O CONTRATADO obriga-se a prestar serviços profissionais de advocacia em
      favor do(a) CONTRATANTE, consistentes na assessoria, consultoria, acompanhamento e propositura de medidas
      administrativas e/ou judiciais relacionadas à concessão, restabelecimento, revisão ou manutenção de 
      <b>benefício previdenciário de salário maternidade.</b>
    </div>

    <div class="block">
      <span class="ctitle">Cláusula Segunda – Dos Honorários:</span> Pela atuação administrativa e/ou judicial, o(a) CONTRATANTE pagará ao CONTRATADO honorários advocatícios no
      percentual de 35% (trinta e cinco por cento) sobre o valor total bruto recebido, decorrente do benefício de
      salário-maternidade, acrescido do valor correspondente à(s) guia(s) de recolhimento mensal, a(s) qual(is) será(ão)
      custeada(s) pelo escritório contratado, bem como eventuais despesas necessárias ao regular andamento do
      processo.
    </div>

    <div class="block">
      <span class="ctitle">Cláusula Terceira – Da Retenção Destacada e Pagamento Direto:</span> 
      O(A) CONTRATANTE autoriza, de forma expressa, irrevogável e irretratável, que, em caso de recebimento de valores
      por meio de RPV, precatório, alvará judicial ou qualquer outra forma de levantamento, seja realizado o destaque e a
      retenção da parcela correspondente a 35% (trinta e cinco por cento) a título de honorários advocatícios contratuais,
      com pagamento direto BANCO BRADESCO - AG: 0405 - CC: 0165885-9 - PIX/CNPJ: 33178744000150 em favor de
      THIAGO RIBEIRO EVANGELISTA SOCIEDADE IND ADVOCACIA, independentemente de nova autorização,
      inclusive mediante expedição de alvará em seu nome, nos termos do art. 22, §4º, da Lei nº 8.906/94.
    </div>

    <div class="block">
      <span class="ctitle">Cláusula Quarta:</span> 
      <b>O CONTRATANTE</b> autoriza expressamente que o pagamento dos honorários ora contratados
      seja efetuado por meio de débito direto em sua conta bancária, mantida junto ao BANCO MERCANTIL DO BRASIL
      S.A., com repasse automático dos valores à conta do <b>CONTRATADO</b>, conforme dados bancários informados neste
      contrato. A execução do débito e do repasse será realizada de acordo com as instruções encaminhadas pela
      empresa <b>PREVSEMPRE ASSESSORIA E TREINAMENTOS LTDA</b>, com base nas condições aqui estabelecidas. A
      frequência dos débitos, os percentuais aplicáveis e o período de vigência da autorização serão aqueles
      expressamente estipulados neste contrato.
      O CONTRATANTE autoriza expressamente o tratamento e compartilhamento de seus dados pessoais e bancários
      com a PREVSEMPRE e com a instituição financeira, exclusivamente para execução desta cláusula, nos termos da
      Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
    </div>

    <div class="block">
      <span class="ctitle">Da Rescisão:</span> 
      O CONTRATANTE poderá rescindir o presente contrato a qualquer tempo, mediante comunicação
      expressa, no entanto, em caso de desistência imotivada, <b>será devida multa compensatória no valor de R$ 1.000,00 (mil reais).</b>
      <br/>
      <b>Parágrafo único:</b> Na hipótese de já ter sido iniciado procedimento administrativo ou judicial, serão devidos os
      honorários integrais contratados, podendo ser compensados os valores eventualmente já pagos.
    </div>

    <div class="date-line">${dateLine}.</div>

    <div class="spacer"></div>

    <div class="sigs">
      <div class="sig">
        <div class="sig-line">
          THIAGO RIBEIRO EVANGELISTA<br/>
          OAB/MA 19092-A &nbsp; OAB/PI 5.371
        </div>
      </div>
      <div class="sig">
        <div class="sig-line">CONTRATANTE</div>
      </div>
      ${
        data.isMinor
          ? `<div class="sig">
        <div class="sig-line">ASSISTENTE/REPRESENTANTE LEGAL</div>
      </div>`
          : ''
      }
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════
       PÁGINA 2 — PROCURAÇÃO "AD JUDICIA"
       ═══════════════════════════════════════════════ -->

  <div class="page-content" style="page-break-before: always;">
    <h1>Procuração "Ad Judicia"</h1>

    ${
      !data.isMinor
        ? `<table class="data-grid">
      <tr>
        <td colspan="2">
          <span class="lbl">Outorgante</span>
          <span class="val">${data.fullName}</span>
        </td>
      </tr>
      <tr>
        <td><span class="lbl">Estado Civil</span><span class="val">${data.maritalStatus}</span></td>
        <td><span class="lbl">Profissão</span><span class="val">${data.profession}</span></td>
      </tr>
      <tr>
        <td><span class="lbl">CPF</span><span class="val">${data.cpf}</span></td>
        <td><span class="lbl">CEP</span><span class="val">${data.postalCode}</span></td>
      </tr>
      <tr>
        <td colspan="2">
          <span class="lbl">Endereço</span>
          <span class="val">${address}</span>
        </td>
      </tr>
      <tr>
        <td>
          <span class="lbl">Cidade / UF</span>
          <span class="val">${cityUf}</span>
        </td>
        <td>
          <span class="lbl">Benefício</span>
          <span class="val">SALÁRIO MATERNIDADE</span>
        </td>
      </tr>
    </table>`
        : ''
    }

    ${
      data.isMinor
        ? `<div class="block">
      <span class="ctitle">Outorgante:</span> ${data.fullName}, brasileiro(a), menor relativamente incapaz, inscrito(a) no
      CPF nº ${data.cpf}, residente e domiciliado(a) na ${address},
      ${data.city}/${data.state}, neste ato assistido(a) por seu responsável legal ${data.guardianName ?? ''},
      brasileiro(a), inscrito(a) no CPF nº ${data.guardianCpf ?? ''},
      residente e domiciliado(a) no mesmo endereço.
    </div>`
        : ''
    }

    <div class="block">
      <span class="ctitle">Outorgado:</span>
      <b>THIAGO RIBEIRO EVANGELISTA SOCIEDADE INDIVIDUAL DE ADVOCACIA</b>, inscrita no
      CNPJ nº <b>33.178.744/0001-50</b>, neste ato representada por <b>Dr. THIAGO RIBEIRO EVANGELISTA</b>, inscrito na
      OAB/PI nº <b>5.371</b> e OAB/MA nº <b>19.092-A</b>, brasileiro, casado, CPF nº <b>877.753.873-00</b>, RG nº <b>2.055.520 SSP/PI</b>,
      e-mail <b>prevdrthiagoe@gmail.com</b>, com endereço profissional na Avenida Senador Arêa Leão, nº 2185, Ed.
      Manhattan River Center, Torre I, Sala 1006, Bairro Jóquei, CEP 64051-090, Teresina/PI. Telefone: 86
      99990-4707.
    </div>

    <div class="block">
      <span class="ctitle">Poderes</span>
      O(a) OUTORGANTE nomeia e constitui a sociedade de advocacia acima qualificada como sua
      bastante procuradora, representada por seu advogado, até o encerramento definitivo dos procedimentos
      administrativos ou judiciais referentes ao benefício previdenciário objeto do mandato, salvo revogação
      expressa, conferindo-lhe os seguintes poderes:
    </div>

    <div class="block">
      <strong>1. Poderes Gerais – Cláusula Ad Judicia et Extra</strong><br/>
      Poderes para o foro em geral e quaisquer repartições administrativas, para propor, acompanhar e praticar
      todos os atos processuais e administrativos necessários à defesa de seus direitos perante o INSS e o Poder
      Judiciário.
  </div>

    <div class="block">
      <strong>2. Poderes Especiais (art. 105 do CPC)</strong><br/>
      <div class="pow">• requerer concessão, restabelecimento, revisão ou manutenção de benefícios previdenciários; • protocolar;</div>
      <div class="pow">• protocolar requerimentos, apresentar documentos, interpor recursos, obter acesso a processos administrativos e judiciais;</div>
      <div class="pow">• acessar sistemas (MEU INSS/INSS Digital);</div>
      <div class="pow">• firmar declarações, petições e requerimentos;</div>
      <div class="pow">• receber notificações e intimações;</div>
      <div class="pow">• firmar acordos, transigir, desistir, renunciar ao direito sobre que se funda a ação;</div>
      <div class="pow">• levantar valores via alvará, RPV ou precatório, prestando contas posteriormente;</div>
      <div class="pow">• praticar todos os atos necessários ao bom e fiel desempenho do mandato;</div>
      <div class="pow">• O OUTORGADO poderá substabelecer <b>com ou sem reserva de poderes</b>, sempre que necessário ao bom andamento do caso.</div>
    </div>

    <div class="block">
      <strong>3. Da Retenção Destacada:</strong> 
      O(a) OUTORGANTE autoriza expressamente que, em caso de pagamento
      decorrente de <b>RPV, precatório ou alvará judicial</b>, seja realizada a <b>retenção destacada</b> da parcela
      correspondente a <b>35% (trinta e cinco por cento)</b> referente aos honorários contratuais, em favor do advogado
      <b>THIAGO RIBEIRO EVANGELISTA – OAB/PI 5.371 – OAB/MA 19.092 – OAB/BA — CPF 877.753.873-00</b>, nos
      termos do art. 22, §4º, da Lei nº 8.906/94.
    </div>

    <div class="date-line">${dateLine}.</div>

    <div class="spacer"></div>

    <div class="sigs" style="margin-bottom: 10px;">
      <div class="sig">
        <div class="sig-line">OUTORGANTE</div>
      </div>
      ${
        data.isMinor
          ? `<div class="sig">
        <div class="sig-line">ASSISTENTE/REPRESENTANTE LEGAL</div>
      </div>`
          : ''
      }
    </div>
  </div>

</body>
</html>`;
}
