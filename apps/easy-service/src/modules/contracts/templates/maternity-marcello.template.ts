import * as fs from 'fs';
import * as path from 'path';

import type { MaternityMarcelloContractData } from '@easy-service/shared';

function readImageAsDataUri(filePath: string): string {
  try {
    const resolved = path.resolve(process.cwd(), filePath);
    const buffer = fs.readFileSync(resolved);
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch {
    return '';
  }
}

function buildPersonBlock(data: MaternityMarcelloContractData): string {
  const rgPart = data.rg
    ? `, portador(a) da cédula de identidade RG nº ${data.rg}${data.rgState ? ` SSP/${data.rgState}` : ''}`
    : '';
  const numberPart = data.streetNumber ? `, nº ${data.streetNumber}` : '';
  const emailPart = data.email ? `, e-mail: ${data.email}` : '';
  const phonePart = data.phone ? `, Cel/Whatsapp: ${data.phone}` : '';

  if (data.isMinor) {
    return `${data.fullName}, menor relativamente incapaz, ${data.profession}${rgPart},
  inscrito(a) no CPF nº ${data.cpf}, residente e domiciliado(a) na ${data.street}${numberPart},
  Bairro ${data.neighborhood}, CEP: ${data.postalCode}${emailPart}${phonePart}, ${data.city}/${data.state},
  neste ato assistido(a) por seu responsável legal ${data.guardianName ?? ''},
  inscrito(a) no CPF nº ${data.guardianCpf ?? ''}, residente e domiciliado(a) no mesmo endereço.`;
  }

  return `${data.fullName}, maior, Estado Civil ${data.maritalStatus}, ${data.profession}${rgPart},
  inscrito(a) no CPF nº ${data.cpf}, residente e domiciliado(a) na ${data.street}${numberPart},
  Bairro ${data.neighborhood}, CEP: ${data.postalCode}${emailPart}${phonePart}, ${data.city}/${data.state}.`;
}

export type MarcelloTemplateResult = {
  html: string;
  headerTemplate: string;
  footerTemplate: string;
};

export function renderMaternityMarcelloTemplate(data: MaternityMarcelloContractData): MarcelloTemplateResult {
  const topoSrc = readImageAsDataUri('docs/images/topo-marcelo.jpg');
  const bottomSrc = readImageAsDataUri('docs/images/bottom-marcelo.jpg');
  const watermarkSrc = readImageAsDataUri('docs/images/marcelo-dgua.jpg');

  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const dateLine = `${data.city}/${data.state}, ${today}`;
  const personBlock = buildPersonBlock(data);

  const headerTemplate = topoSrc
    ? `<div style="width:100%;text-align:center;margin:-10px 0 0;padding:0;font-size:0;line-height:0;"><img src="${topoSrc}" style="height:32mm;display:inline-block;" /></div>`
    : '<span></span>';

  const footerTemplate = '<span></span>';

  const html = /* html */ `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9pt;
      color: #1a1a1a;
      line-height: 1.4;
      padding: 10px 15mm;
    }

    /* ── Watermark: top offset compensates for the 38mm Puppeteer header margin
          so the div covers the full physical page (0–297mm) ── */
    .watermark {
      position: fixed;
      top: -38mm;
      left: 0;
      width: 210mm;
      height: 297mm;
      z-index: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }
    .watermark img {
      width: 170mm;
      opacity: 0.09;
    }

    /* ── All text content gets white bg to stay readable over watermark ── */
    .section, h1, h2, .block, .clause {
      background: white;
      position: relative;
      z-index: 1;
    }

    h1 {
      font-size: 11pt;
      text-align: center;
      text-transform: uppercase;
      font-weight: bold;
      text-decoration: underline;
      margin-bottom: 10px;
      padding: 2px 0;
    }

    h2 {
      font-size: 9.5pt;
      text-transform: uppercase;
      font-weight: bold;
      margin: 10px 0 5px;
      padding: 1px 0;
    }

    .block {
      margin-bottom: 8px;
      text-align: justify;
      padding: 1px 0;
    }

    .label {
      font-weight: bold;
      text-transform: uppercase;
    }

    .clause {
      margin-bottom: 7px;
      text-align: justify;
      padding: 1px 0;
    }

    /* ── Signatures ── */
    .sig-main {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      margin-top: 24px;
      background: white;
      position: relative;
      z-index: 1;
    }
    .sig-main .sig {
      flex: 1;
      text-align: center;
    }
    .sig-line {
      border-top: 1px solid #1a1a1a;
      padding-top: 4px;
      margin-top: 22px;
      font-size: 9pt;
    }

    .date-line {
      margin-top: 10px;
      text-align: right;
      background: white;
      position: relative;
      z-index: 1;
    }
  </style>
</head>
<body>

  ${watermarkSrc ? `<div class="watermark"><img src="${watermarkSrc}" alt="" /></div>` : ''}

  <!-- ═══════════════════════════════════
       PÁGINA 1 — PROCURAÇÃO "AD JUDICIA"
       ═══════════════════════════════════ -->

  <div class="section">
    <h1>Procuração "Ad Judicia"</h1>

    <div class="block">
      <span class="label">Outorgante:</span> ${personBlock}
    </div>

    <div class="block">
      <span class="label">Outorgado:</span> MARCELLO RENAULT SOCIEDADE INDIVIDUAL DE ADVOCACIA, inscrito no CNPJ
      sob nº 57.800.921/0001-56, neste ato representado pelo proprietário: Marcello Renault Menezes, inscrito na
      OAB/RR sob nº 2352 e CPF nº 785.645.309-53, com escritório profissional na Rua Jose Pinheiro, 731, Liberdade, Boa
      Vista/RR, CEP 69.309-089, e-mail: dr.mrenault@hotmail.com, Cel/Whatsapp: (95) 99159-0771.
      Rômulo Mangabeira De Oliveira, inscrito na OAB/RR sob nº 2885 e CPF nº 684.552.832-20, com escritório
      profissional na Rua Jose Pinheiro, 731, Liberdade, Boa Vista/RR, CEP 69.309-089, Cel/Whatsapp: (95) 99159-0771.
    </div>

    <div class="block">
      <span class="label">Poderes:</span> Pelo presente instrumento particular de procuração, o outorgante nomeia e constitui seu bastante
      procurador o advogado acima, para o fim de agir judicialmente e extrajudicialmente, na forma da lei, promovendo
      quaisquer medidas judiciais ou administrativas necessárias à garantia dos direitos e interesses do outorgante, propondo
      em favor do mesmo as ações que julgar convenientes, perante qualquer juízo, instância ou tribunal (Estadual ou
      Federal) e defendê-lo nas contrárias, até final decisão, usando os recursos legais e acompanhando-os, assim como,
      requerer providências administrativas nos entes federativos (Prefeitura, Estado, União e Distrito Federal), Órgãos
      Públicos diversos, Autarquias, inclusive junto ao INSS, Empresas de Economia Mistas ou Privadas, todas as ações
      judiciais ou extrajudiciais, defende-lo nas que porventura por ele lhe sejam propostas, para o que lhe confere os
      poderes da cláusula "Ad judicia" para praticar, enfim, todos os atos necessários ao bom e fiel cumprimento do
      presente mandato.
    </div>

    <div class="block">
      <span class="label">Poderes Específicos:</span> A presente procuração outorga, ainda, os poderes especiais para confessar, reconhecer a
      procedência do pedido, transigir, desistir, renunciar ao direito sobre o qual se funda a ação, receber, dar quitação,
      firmar compromisso, receber bens, coisas ou importâncias objeto da lide e lhes dar quitações, pedir a justiça gratuita e
      assinar declaração de hipossuficiência econômica, bem como substabelecer com ou sem reserva de poderes, nos
      termos da lei.
    </div>

    <div class="date-line">${dateLine}.</div>

    <div class="sig-main" style="justify-content: center;">
      <div class="sig" style="max-width: 90mm;">
        <div class="sig-line">CONTRATANTE</div>
      </div>
      ${
        data.isMinor
          ? `<div class="sig" style="max-width: 90mm;">
        <div class="sig-line">ASSISTENTE/REPRESENTANTE LEGAL</div>
      </div>`
          : ''
      }
    </div>
  </div>

  <!-- ════════════════════════════════════════════
       CONTRATO DE PRESTAÇÃO DE SERVIÇO
       ════════════════════════════════════════════ -->

  <div class="section" style="page-break-before: always;">
    <h1>Contrato de Prestação de Serviço</h1>

    <h2>I – Das Partes</h2>

    <div class="block">
      Contrato de Prestação de Serviço que fazem de um lado;
    </div>

    <div class="block">
      <span class="label">Contratante:</span> ${personBlock}
    </div>

    <div class="block">
      De outro lado,
    </div>

    <div class="block">
      <span class="label">Contratado:</span> MARCELLO RENAULT SOCIEDADE INDIVIDUAL DE ADVOCACIA,
      inscrito no CNPJ sob nº 57.800.921/0001-56, neste ato representado pelo proprietário: Marcello Renault Menezes,
      inscrito na OAB/RR sob nº 2352 e CPF nº 785.645.309-53, com escritório profissional na Rua Jose Pinheiro, 731,
      Liberdade, Boa Vista/RR, CEP 69.309-089, e-mail: dr.mrenault@hotmail.com, Cel/Whatsapp: (95) 99159-0771.
    </div>

    <h2>II – Do Objeto</h2>

    <div class="clause">
      <span class="label">1ª Cláusula:</span> Por este instrumento particular, CONTRATANTE E CONTRATADO, têm, entre si, justo e
      contratado, o presente contrato de prestação de serviços profissionais advocatícios que se regerá pelos seguintes
      termos:
    </div>

    <div class="clause">
      <span class="label">2ª Cláusula:</span> O CONTRATADO prestará serviços à CONTRATANTE na forma de serviços advocatícios em
      ação de concessão de salário maternidade até o trâmite final do processo.
      <br/><br/>
      <strong>Parágrafo único</strong> – As atividades inclusas na prestação de serviço objeto deste instrumento são todas aquelas inerentes
      à profissão, quais sejam: praticar todos os atos inerentes ao exercício da advocacia e aqueles constantes no Estatuto da
      Ordem dos Advogados do Brasil, bem como os especificados no Instrumento Procuratório.
    </div>

    <h2>III – Deveres do Contratado</h2>

    <div class="clause">
      <span class="label">3ª Cláusula:</span> O Contratado se compromete a aplicar todo seu conhecimento jurídico e empenho a fim de obter o
      melhor resultado possível tanto na esfera administrativa quanto na esfera judicial.
    </div>

    <h2>IV – Deveres do Contratante</h2>

    <div class="clause">
      <span class="label">4ª Cláusula:</span> O Contratante, visando o melhor resultado possível do processo previdenciário, se compromete a:<br/>
      a) Fornecer todas as informações necessárias ao deslinde processual;<br/>
      b) Manter seus dados atualizados perante o Contratado, tendo a obrigação de informar imediatamente, pelo
      e-mail dr.mrenault@hotmail.com, toda e qualquer alteração de endereço, telefone ou e-mail;<br/>
      c) Caso necessite de prova testemunhal, indicar 3 testemunhas até 30 (trinta) dias antes da audiência, justificação
      judicial ou justificação administrativa;<br/>
      d) Comparecer em todas as audiências, justificações judiciais ou justificações administrativas;<br/>
      e) Notificar o Contratado de qualquer alteração contributiva, como: desligamento do emprego, novo emprego,
      modificação nas contribuições como contribuinte individual, recebimento de qualquer benefício previdenciário, etc.;<br/>
      f) Entregar ao Contratado todos os documentos necessários (expressamente solicitados pelo Contratado) para o
      ajuizamento da ação.
    </div>

    <h2>V – Dos Honorários Advocatícios</h2>

    <div class="clause">
      <span class="label">5ª Cláusula:</span> Em remuneração aos serviços prestados pelo Contratado, fica o Contratante obrigado, de forma
      irrevogável e irretratável, e irrepetível ao pagamento dos seguintes valores em favor do contratado, da seguinte forma:<br/><br/>
      a) A importância de 35% (trinta e cinco por cento), sobre o proveito econômico, cujo pagamento o contratado, por
      liberalidade, posterga o recebimento para após a implantação do benefício, tanto no âmbito administrativo quanto
      no âmbito judicial, das parcelas vencidas e vincendas do benefício efetivamente concedido, incidindo sobre o valor —
      juros e atualização monetária, a contar da data de protocolo administrativo junto ao INSS;<br/>
      b) 35% (trinta e cinco por cento) do valor do benefício caso seja fixado em tutela judicial de urgência,
      pagamento que perdurará enquanto perdurar o recebimento por tutela de Urgência (liminar);<br/>
      c) Os Honorários de 35% (trinta e cinco por cento) sobre o proveito econômico no caso de eventual processo
      judicial, terá vencimento na data do recebimento da RPV ou Precatório, sendo que o contratante concorda com o
      destaque dos honorários contratuais sobre o total do RPV ou Precatório.<br/><br/>
      <strong>Parágrafo Primeiro:</strong> O proveito econômico, sobre o qual incide os honorários advocatícios, é o valor bruto composto
      por todas as parcelas vencidas e parcelas vincendas do benefício concedido administrativamente junto ao INSS ou
      durante processo judicial, a contar da data de protocolo junto ao INSS, incidindo juros e atualização monetária
      calculadas até a data do trânsito em julgado, com dedução de benefícios previdenciários já recebidos caso tenha sido
      concedida a tutela de urgência liminar, sejam decorrentes do presente processo ou outros processos administrativos ou
      judiciais. Desta forma, proveito econômico não se confunde com o valor líquido recebido por meio de RPV ou
      Precatório.<br/><br/>
      <strong>Parágrafo Segundo:</strong> Os honorários incluídos na condenação por arbitramento ou sucumbência pertencem ao
      CONTRATADO, sem qualquer redução dos honorários contratuais.<br/><br/>
      <strong>Parágrafo Terceiro:</strong> Fica estipulado entre as partes que, se caso a contratada optar em separar a parte do valor devido
      a título de honorários cobrados do contratante, na referida ação, juntará o contrato de prestação de serviço no processo
      para que se cumpra sua finalidade do contrato. CASO NÃO SEJA DEFERIDO PELO JUDICIÁRIO O
      DESTAQUE DOS HONORÁRIOS, FICA ESTIPULADO QUE O CONTRATANTE COMPARECERÁ EM
      CONJUNTO COM O CONTRATADO NA AGÊNCIA BANCÁRIA PARA LEVANTAMENTO DO ALVARÁ E
      EM SEGUIDA O CONTRATADO FARÁ A TRANSFERÊNCIA DO PERCENTUAL ORA ESTIPULADO
      NESSE INSTRUMENTO CONTRATUAL PARA A CONTA BANCÁRIA QUE O CONTRATADO INDICAR
      OU OPTAR PELO SAQUE IMEDIATO.<br/><br/>
      <strong>Parágrafo Quarto:</strong> Os honorários recebidos enquanto perdurar o recebimento de benefícios por liminar em tutela de
      urgência são irrepetíveis, isto é, não serão devolvidos em nenhuma hipótese.<br/><br/>
      <strong>Parágrafo Quinto:</strong> O contratante está ciente dos riscos de eventual devolução de valores de benefícios recebidos em
      tutela de urgência.<br/><br/>
      <strong>Parágrafo Sexto:</strong> Fica o Contratado autorizado, desde já, no caso de recebimento de alvará judicial, a fazer a retenção
      de seus honorários quando do recebimento de valores devidos ao Contratante, advindos de êxito da demanda, ainda
      que parcial.<br/><br/>
      <strong>Parágrafo Sétimo:</strong> As partes estabelecem que havendo atraso no pagamento dos honorários, serão cobrados multa de
      10% (dez por cento) acrescido de juros de mora na proporção de 1% (um por cento) ao mês.<br/><br/>
      <strong>Parágrafo Oitavo:</strong> Caso haja morte ou incapacidade civil do CONTRATADO, seus sucessores ou representante legal
      receberão os honorários do trabalho realizado.
    </div>

    <h2>VI – Custas e Despesas</h2>

    <div class="clause">
      <span class="label">6ª Cláusula:</span> As despesas efetuadas pelo Contratado, decorrentes direta ou indiretamente do processo
      administrativo e/ou judicial, serão reembolsadas pelo Contratante no final do processo de conhecimento mediante
      apresentação de demonstrativo consolidado de custas e despesas acompanhado dos respectivos comprovantes de
      pagamento.<br/><br/>
      <strong>Parágrafo Primeiro:</strong> As despesas incluem custas judiciais, viagens, fotocópias, autenticações de documentos,
      expedição de certidões, assistentes técnicos, deslocamentos, interurbanos e quaisquer outras que decorrerem dos
      serviços prestados, objeto deste contrato.<br/><br/>
      <strong>Parágrafo Segundo:</strong> A não apresentação do demonstrativo consolidado de despesas ou dos comprovantes de
      pagamento desobriga o Contratante a reembolsar respectivas custas e despesas.
    </div>

    <h2>VII – Rescisão Contratual</h2>

    <div class="clause">
      <span class="label">7ª Cláusula:</span> Em caso de desistência da ação, expressa ou tácita, será devido ao contratado:<br/>
      a) O valor de R$ 2.000,00 (dois mil reais), se a desistência for antes do ingresso administrativo ou do ajuizamento da
      demanda;<br/>
      b) O valor integral dos honorários advocatícios, se a desistência for após o protocolo administrativo ou tiver ocorrido o
      ajuizamento da demanda.<br/><br/>
      <strong>Parágrafo primeiro:</strong> O presente contrato terá a duração até o final do processo, a partir da assinatura do presente.<br/><br/>
      <strong>Parágrafo segundo:</strong> O presente contrato não tem caráter personalíssimo, podendo o Contratado ser representado por
      outro(s) advogado(s) em qualquer ato processual.<br/><br/>
      <strong>Parágrafo terceiro:</strong> A parte que descumprir qualquer das cláusulas deste contrato, dará à outra, o direito desobrigada
      a parte inocente a dar continuidade a este contrato, ficando acordado entre as partes que, em caso de necessidade de
      ajuizamento de ações relativas a esse instrumento, a citação se dará por via postal, com aviso de recebimento (AR),
      cabendo ao vencedor, honorários, na razão de 20% (vinte por cento), sobre o valor da causa, a título de verba
      sucumbencial.
    </div>

    <h2>VIII – Da Mora, Vencimento Antecipado, Penalidades e Medidas de Cobrança dos Honorários</h2>

    <div class="clause">
      <span class="label">Cláusula 8ª:</span> O inadimplemento de qualquer parcela de honorários na data ajustada implicará a constituição
      automática do CONTRATANTE em mora, independentemente de aviso ou notificação, incidindo multa moratória de
      10% (dez por cento) sobre o valor devido, acrescida de juros de mora de 1% (um por cento) ao mês, pro rata die, além
      de correção monetária pelo índice legal aplicável.<br/><br/>
      Decorrido o prazo de 30 (trinta) dias de inadimplemento, considerar-se-ão automaticamente vencidas todas as parcelas
      vincendas, tornando-se imediatamente exigível o valor integral do contrato de honorários, independentemente da
      continuidade ou não da prestação dos serviços advocatícios.
    </div>

    <div class="clause">
      <span class="label">Cláusula 9ª:</span> O CONTRATANTE declara, de forma expressa, irrevogável e irretratável, que reconhece como
      líquido, certo e exigível o valor total dos honorários advocatícios pactuados no presente contrato, o qual possui
      eficácia plena e força executiva, confessando-se devedor da quantia ajustada, nos termos e condições aqui
      estabelecidos, independentemente de notificação prévia, renunciando expressamente a qualquer alegação futura de
      desconhecimento, inexigibilidade ou iliquidez da obrigação ora assumida, nos termos do art. 24 do Estatuto da
      Advocacia e do art. 784, XII, do Código de Processo Civil.
    </div>

    <div class="clause">
      <span class="label">Cláusula 10ª:</span> Fica expressamente autorizado ao CONTRATADO, em caso de inadimplemento, promover a
      inscrição do nome do CONTRATANTE nos cadastros de inadimplentes, tais como SPC Brasil e Serasa Experian, bem
      como proceder ao protesto do presente contrato ou dos valores dele decorrentes em cartório competente, nos termos da
      legislação vigente.
    </div>

    <div class="clause">
      <span class="label">Cláusula 11ª:</span> O CONTRATANTE arcará, ainda, com honorários advocatícios de cobrança fixados desde já em
      20% (vinte por cento) sobre o valor total do débito, além de todas as despesas decorrentes da cobrança judicial ou
      extrajudicial.<br/><br/>
      O inadimplemento injustificado poderá ensejar a suspensão da prestação dos serviços advocatícios, sem prejuízo da
      cobrança integral dos honorários contratados, conforme autorizado pela Ordem dos Advogados do Brasil e pela
      legislação aplicável.
    </div>

    <h2>IX – Foro</h2>

    <div class="clause">
      <span class="label">12ª Cláusula:</span> Fica eleito o Foro desta Comarca, como competente para qualquer ação judicial oriunda do
      presente contrato, ainda que diversos seja, ou venha a ser o da Contratante ou do Contratado.<br/><br/>
      Este instrumento contratual obriga aos seus contratantes e sucessores a qualquer título.<br/><br/>
      E por estarem assim justos e contratados, contratante e Contratado assinam o presente em duas vias de igual teor e forma.
    </div>

    <div class="date-line">${dateLine}.</div>

    <!-- Assinaturas principais: CONTRATANTE | MARCELLO -->
    <div class="sig-main">
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
      <div class="sig">
        <div class="sig-line">
          MARCELLO RENAULT MENEZES<br/>
          CONTRATADO
        </div>
      </div>
    </div>

  </div>

</body>
</html>`;

  return { html, headerTemplate, footerTemplate };
}
