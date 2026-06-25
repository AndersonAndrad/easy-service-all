import fs from 'fs';
import path from 'path';
import type { ClevesContractData } from '@easy-service/shared';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function renderClevesTemplate(data: ClevesContractData): {
  html: string;
  footerTemplate: string;
} {
  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const dateLine = `${escapeHtml(data.city)}/${escapeHtml(data.state)}, ${today}`;

  const contratante = `${escapeHtml(data.fullName)}, ${escapeHtml(data.nationality)}, ${escapeHtml(data.maritalStatus)}, ${escapeHtml(data.profession)}, inscrito no CPF n\u00ba ${escapeHtml(data.cpf)}, residente e domiciliado na ${escapeHtml(data.street)}, n\u00ba ${escapeHtml(data.streetNumber)}, Bairro ${escapeHtml(data.neighborhood)}, CEP ${escapeHtml(data.postalCode)}, ${escapeHtml(data.city)}/${escapeHtml(data.state)}.`;

  let oabB64 = '';
  try { oabB64 = fs.readFileSync(path.join(__dirname, 'assets', 'oab-logo.png')).toString('base64'); } catch { /* logo optional */ }
  const oabImg = oabB64
    ? `<img src="data:image/png;base64,${oabB64}" alt="OAB" class="oab-badge" />`
    : '';

  const BOX_TITLE = (text: string): string =>
    `<div class="box-title">${text}</div>`;

  const footerTemplate = `<div style="width:100%;-webkit-print-color-adjust:exact;print-color-adjust:exact;background:#b8d8f0;border:2px solid #000;text-align:center;font-weight:bold;font-size:9pt;padding:5px 16px;font-family:Arial,Helvetica,sans-serif;box-sizing:border-box;">www.galliassi.adv.br</div>`;

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
      line-height: 1.5;
      padding: 12mm 18mm 10mm;
    }
    .box-title {
      background: #b8d8f0;
      border: 2px solid #000;
      text-align: center;
      font-weight: bold;
      font-size: 11pt;
      text-transform: uppercase;
      padding: 6px 16px;
      letter-spacing: .04em;
      margin-bottom: 14px;
    }
    .box-footer {
      background: #b8d8f0;
      border: 2px solid #000;
      text-align: center;
      font-weight: bold;
      font-size: 9pt;
      padding: 5px 16px;
      margin-top: 14px;
    }
    .page-break { page-break-before: always; }
    .parties { margin-bottom: 8px; text-align: justify; }
    .label { font-weight: bold; text-transform: uppercase; }
    .clause { margin-bottom: 8px; text-align: justify; }
    .clause-title { font-weight: bold; text-transform: uppercase; margin-bottom: 3px; }
    .clause-body p { margin-bottom: 4px; text-align: justify; }
    .clause-body ul { padding-left: 18px; margin: 4px 0; }
    .clause-body li { margin-bottom: 2px; }
    .date-line { margin-top: 14px; text-align: right; }
    .sig-section { margin-top: 52px; }
    .sig-client { text-align: center; margin-bottom: 44px; }
    .sig-client strong { display: block; }
    .sig-attorney { display: flex; align-items: center; gap: 14px; }
    .sig-attorney-spacer { flex-shrink: 0; width: 80px; }
    .oab-badge { height: 72px; width: auto; flex-shrink: 0; }
    .attorney-info { text-align: center; flex: 1; }
    .attorney-info strong { display: block; }
    .sig-line-block { display: flex; align-items: center; gap: 14px; margin-top: 52px; }
    .sig-line-block--bottom { margin-top: 180px; }
    .sig-line-block--decl { margin-top: 100px; }
    .sig-line-name { flex: 1; text-align: center; }
    .sig-line-spacer { flex-shrink: 0; width: 80px; }
    .section-title { font-weight: bold; text-transform: uppercase; margin-bottom: 3px; }
    .proc-row { display: flex; gap: 12px; margin-bottom: 14px; align-items: flex-start; }
    .proc-row--stretch { align-items: stretch; }
    .proc-icon-col { flex-shrink: 0; width: 90px; border: 2px solid #000; }
    .proc-icon-label { background: #b8d8f0; border-bottom: 2px solid #000; font-weight: bold; font-size: 7pt; text-align: center; padding: 3px 2px; text-transform: uppercase; letter-spacing: .04em; }
    .proc-icon-body { display: flex; justify-content: center; align-items: center; padding: 8px 4px; min-height: 70px; flex: 1; }
    .proc-icon-body svg { width: 60px; height: 70px; }
    .proc-text-col { flex: 1; text-align: justify; font-size: 9pt; line-height: 1.5; }
  </style>
</head>
<body>

  <!-- ═══ PAGE 1 ═══ -->
  ${BOX_TITLE('Contrato de Servi\u00e7os Jur\u00eddicos')}

  <div class="parties">
    <p><span class="label">Contratante:</span> ${contratante}</p>
  </div>

  <div class="parties">
    <p><span class="label">Contratados:</span> CL\u00c9VES DOMINGOS GALLIASSI, brasileiro, solteiro, advogado inscrito na OAB/RS sob n\u00ba 59.626, CPF n\u00ba 754.026.880-87, integrante da CL\u00c9VES GALLIASSI SOCIEDADE INDIVIDUAL DE ADVOCACIA, CNPJ n\u00ba 25.248.509/0001-89, registrada na OAB/RS sob n\u00ba 6.113, com endere\u00e7o profissional na Rua Manoel Francisco Guerreiro n\u00ba 1.298, salas 205/206, Edif\u00edcio Platina, Centro, Guapor\u00e9/RS, CEP 99.200-000, telefone/WhatsApp (54) 9-9941-3818, e-mail cgalliassi@terra.com.br. As partes ajustam o presente contrato, mediante as cl\u00e1usulas seguintes.</p>
  </div>

  <div class="clause">
    <p class="clause-title">Cl\u00e1usula 1\u00aa \u2014 Objeto, Extens\u00e3o da Atua\u00e7\u00e3o e Limites do Patrocínio</p>
    <div class="clause-body">
      <p>O presente contrato tem por objeto a presta\u00e7\u00e3o de servi\u00e7os advogat\u00edcios consistentes na an\u00e1lise, instru\u00e7\u00e3o, formula\u00e7\u00e3o, acompanhamento e defesa de pedido administrativo e/ou a\u00e7\u00e3o judicial destinada \u00e0 concess\u00e3o, implanta\u00e7\u00e3o, restabelecimento ou revis\u00e3o do benef\u00edcio previdenci\u00e1rio de AUX\u00cdLIO-ACIDENTE, em raz\u00e3o de acidente de qualquer natureza, doen\u00e7a ocupacional ou sequela com alegada redu\u00e7\u00e3o da capacidade laborativa habitual, perante o INSS e/ou perante o ju\u00edzo competente. A atua\u00e7\u00e3o compreende as medidas ordin\u00e1rias necess\u00e1rias \u00e0 busca do reconhecimento do direito ao benef\u00edcio, inclusive requerimento de parcelas vencidas, atrasadas, retroativas, acumuladas e vincendas no curso do procedimento ou processo, desde a data juridicamente reconhecida como devida, incluindo DIB, DER, data de cessa\u00e7\u00e3o de benef\u00edcio anterior ou outra fixada administrativa ou judicialmente. A contrata\u00e7\u00e3o limita-se \u00e0 atua\u00e7\u00e3o administrativa e judicial at\u00e9 o julgamento em segunda inst\u00e2ncia, n\u00e3o abrangendo recursos aos Tribunais Superiores, a\u00e7\u00e3o rescis\u00f3ria, reclama\u00e7\u00e3o, mandado de seguran\u00e7a aut\u00f4nomo, cumprimento de obriga\u00e7\u00e3o diversa, revis\u00e3o futura de benef\u00edcio n\u00e3o abrangida pelo objeto, a\u00e7\u00e3o indenizat\u00f3ria, demanda trabalhista ou qualquer medida aut\u00f4noma n\u00e3o expressamente prevista neste instrumento, salvo contrata\u00e7\u00e3o complementar por escrito.</p>
    </div>
  </div>

  <div class="clause">
    <p class="clause-title">Cl\u00e1usula 2\u00aa \u2014 Obriga\u00e7\u00f5es do Contratante</p>
    <div class="clause-body">
      <p>O CONTRATANTE obriga-se a fornecer documentos, informa\u00e7\u00f5es, laudos, exames, comprovantes, comunica\u00e7\u00f5es do INSS e demais elementos necess\u00e1rios \u00e0 atua\u00e7\u00e3o profissional, responsabilizando-se pela veracidade, completude e atualiza\u00e7\u00e3o das informa\u00e7\u00f5es prestadas. O CONTRATANTE dever\u00e1 comparecer a per\u00edcias, audi\u00eancias, entrevistas, avalia\u00e7\u00f5es, atendimentos e atos administrativos ou judiciais para os quais for convocado, bem como manter os CONTRATADOS informados sobre altera\u00e7\u00e3o de endere\u00e7o, telefone, conta banc\u00e1ria, recebimento de valores, comunica\u00e7\u00f5es do INSS, propostas de acordo, concess\u00e3o administrativa, pagamento, alvar\u00e1, RPV, precat\u00f3rio ou qualquer fato relacionado ao objeto contratado. A omiss\u00e3o, atraso, aus\u00eancia injustificada, fornecimento de informa\u00e7\u00e3o incorreta, contrata\u00e7\u00e3o paralela sem comunica\u00e7\u00e3o ou recebimento direto de valores sem repasse dos honor\u00e1rios n\u00e3o prejudicar\u00e1 o direito dos CONTRATADOS aos honor\u00e1rios, multa e demais encargos previstos neste contrato.</p>
    </div>
  </div>



  <div class="clause">
    <p class="clause-title">Cl\u00e1usula 3\u00aa \u2014 Honor\u00e1rios Contratuais de \u00caxito</p>
    <div class="clause-body">
      <p>Pelos servi\u00e7os contratados, os CONTRATADOS far\u00e3o jus a honor\u00e1rios contratuais correspondentes a 30% (trinta por cento) sobre o proveito econ\u00f4mico bruto efetivamente obtido pelo CONTRATANTE, na esfera administrativa ou judicial, inclusive em caso de concess\u00e3o, implanta\u00e7\u00e3o, restabelecimento, revis\u00e3o, acordo, transa\u00e7\u00e3o, concilia\u00e7\u00e3o, senten\u00e7a, ac\u00f3rd\u00e3o, cumprimento de decis\u00e3o ou pagamento espont\u00e2neo. Considera-se proveito econ\u00f4mico bruto o montante total das parcelas vencidas, atrasadas, retroativas ou acumuladas reconhecidas em favor do CONTRATANTE, antes de descontos legais, reten\u00e7\u00f5es, compensa\u00e7\u00f5es, dedu\u00e7\u00f5es, restitui\u00e7\u00f5es, abatimentos ou qualquer outra subtra\u00e7\u00e3o. Os honor\u00e1rios incidirão sobre valores recebidos por RPV, precat\u00f3rio, alvar\u00e1, dep\u00f3sito judicial, ordem banc\u00e1ria, pagamento administrativo, acordo, implanta\u00e7\u00e3o/reimplanta\u00e7\u00e3o de benef\u00edcio, pagamento direto pelo INSS ou qualquer outra forma de libera\u00e7\u00e3o de valores vinculada ao objeto deste contrato. Al\u00e9m dos honor\u00e1rios de 30% sobre os valores vencidos, atrasados, retroativos ou acumulados, o CONTRATANTE pagar\u00e1 aos CONTRATADOS honor\u00e1rios complementares equivalentes a 03 (tr\u00eas) parcelas mensais do benef\u00edcio efetivamente concedido, implantado, restabelecido ou revisado, calculadas sobre o valor bruto da mensalidade do benef\u00edcio.</p>
      <p>O CONTRATANTE autoriza, desde j\u00e1, a reten\u00e7\u00e3o, destaque, reserva, bloqueio, dedu\u00e7\u00e3o, repasse ou pagamento direto dos honor\u00e1rios contratuais aos CONTRATADOS, inclusive nos autos administrativos ou judiciais, sobre valores liberados por alvar\u00e1, RPV, precat\u00f3rio, dep\u00f3sito, ordem banc\u00e1ria, implanta\u00e7\u00e3o ou pagamento administrativo. Os honor\u00e1rios contratuais n\u00e3o se confundem com honor\u00e1rios de sucumb\u00eancia eventualmente fixados, os quais pertencem aos advogados que atuarem no feito, na forma da legisla\u00e7\u00e3o aplic\u00e1vel.</p>
    </div>
  </div>

  <div class="clause">
    <p class="clause-title">Cl\u00e1usula 4\u00aa \u2014 Acordo, Transa\u00e7\u00e3o, Concess\u00e3o Administrativa ou Recebimento Direto</p>
    <div class="clause-body">
      <p>A celebra\u00e7\u00e3o de acordo, transa\u00e7\u00e3o, concilia\u00e7\u00e3o, reconhecimento administrativo, implanta\u00e7\u00e3o do benef\u00edcio, pagamento direto ao CONTRATANTE, desist\u00eancia parcial ou total, ren\u00fancia a valores ou solu\u00e7\u00e3o extrajudicial n\u00e3o reduzir\u00e1 nem afastar\u00e1 os honor\u00e1rios contratados, que permanecer\u00e3o devidos sobre o proveito econ\u00f4mico obtido ou disponibilizado.</p>
      <p>Caso o CONTRATANTE receba valores diretamente, sem reten\u00e7\u00e3o pr\u00e9via dos honor\u00e1rios, dever\u00e1 repassar aos CONTRATADOS, no prazo de 48 horas do recebimento, os percentuais e parcelas previstos neste contrato, sob pena de mora autom\u00e1tica, cobran\u00e7a, execu\u00e7\u00e3o, protesto do t\u00edtulo juridicamente h\u00e1bil, inscri\u00e7\u00e3o nos cadastros de inadimplentes quando cab\u00edvel e ado\u00e7\u00e3o das medidas judiciais necess\u00e1rias.</p>
    </div>
  </div>

  <div class="clause">
    <p class="clause-title">Cl\u00e1usula 5\u00aa \u2014 Revoga\u00e7\u00e3o, Substitui\u00e7\u00e3o de Advogado, Desist\u00eancia e Multa</p>
    <div class="clause-body">
      <p>Se, ap\u00f3s a contrata\u00e7\u00e3o e especialmente ap\u00f3s a pr\u00e1tica de atos profissionais \u00fateis, o CONTRATANTE revogar imotivadamente os poderes outorgados, contratar outro advogado para substituir os CONTRATADOS, desistir injustificadamente do pedido administrativo ou judicial, abandonar o processo, realizar acordo direto, receber valores sem repassar os honor\u00e1rios ou praticar ato que frustre a continuidade da atua\u00e7\u00e3o contratada, permanecer\u00e3o devidos os honor\u00e1rios proporcionais e/ou integrais incidentes sobre o proveito econ\u00f4mico obtido ou pass\u00edvel de obten\u00e7\u00e3o em raz\u00e3o do trabalho j\u00e1 desenvolvido.</p>
      <p>Nessas hip\u00f3teses, sem preju\u00edzo dos honor\u00e1rios contratuais, das despesas, dos encargos de mora e da cobran\u00e7a judicial ou extrajudicial, o CONTRATANTE pagar\u00e1 aos CONTRATADOS multa contratual n\u00e3o compensat\u00f3ria de R$ 10.000,00 (dez mil reais), destinada a resguardar o trabalho t\u00e9cnico realizado, a disponibilidade profissional, os custos de oportunidade e os preju\u00edzos decorrentes da ruptura imotivada.</p>
      <p>A contrata\u00e7\u00e3o de novo advogado para atuar em conjunto, sem revoga\u00e7\u00e3o dos poderes dos CONTRATADOS, n\u00e3o implicar\u00e1 rateio, redu\u00e7\u00e3o, compensa\u00e7\u00e3o ou divis\u00e3o dos honor\u00e1rios ora contratados, cabendo ao CONTRATANTE ajustar separadamente eventual remunera\u00e7\u00e3o do novo profissional.</p>
      <p>Havendo revoga\u00e7\u00e3o, substitui\u00e7\u00e3o, desist\u00eancia, acordo direto ou recebimento de valores, o CONTRATANTE autoriza os CONTRATADOS a requererem, no procedimento administrativo ou nos autos judiciais competentes, a reserva, destaque, bloqueio ou reten\u00e7\u00e3o dos honor\u00e1rios contratuais e demais valores previstos neste instrumento, at\u00e9 delibera\u00e7\u00e3o do ju\u00edzo competente ou pagamento integral.</p>
    </div>
  </div>



  <div class="clause">
    <p class="clause-title">Cl\u00e1usula 6\u00aa \u2014 T\u00edtulo Executivo, Mora e Cobran\u00e7a</p>
    <div class="clause-body">
      <p>O presente instrumento constitui contrato escrito de honor\u00e1rios advogat\u00edcios, apto \u00e0 cobran\u00e7a e execu\u00e7\u00e3o pelos CONTRATADOS, sem preju\u00edzo de outras medidas judiciais ou extrajudiciais cab\u00edveis.</p>
      <p>O inadimplemento de qualquer valor devido acarretar\u00e1 mora autom\u00e1tica, independentemente de interpela\u00e7\u00e3o, autorizando cobran\u00e7a do principal, multa, honor\u00e1rios, despesas de cobran\u00e7a, custas, atualiza\u00e7\u00e3o monet\u00e1ria, juros legais e demais encargos admitidos em lei.</p>
      <p>Recomenda-se que o contrato seja assinado pelo CONTRATANTE, pelos CONTRATADOS e por duas testemunhas, para refor\u00e7o probat\u00f3rio e executivo, sem preju\u00edzo da for\u00e7a pr\u00f3pria do contrato escrito de honor\u00e1rios advogat\u00edcios.</p>
    </div>
  </div>

  <div class="clause">
    <p class="clause-title">Cl\u00e1usula 7\u00aa \u2014 Foro</p>
    <div class="clause-body">
      <p>As partes elegem o Foro da Comarca de Guapor\u00e9/RS para dirimir controv\u00e9rsias decorrentes deste contrato, com ren\u00fancia a qualquer outro, por mais privilegiado que seja, ressalvadas compet\u00eancias absolutas ou hip\u00f3teses legais de compet\u00eancia inderrog\u00e1vel.</p>
      <p>E, por estarem justas e contratadas, firmam o presente instrumento em duas vias de igual teor e forma, obrigando-se por si e por seus sucessores.</p>
    </div>
  </div>

  <div class="date-line">${dateLine}.</div>

  <div class="sig-section">
    <div class="sig-client">
      <strong>${escapeHtml(data.fullName)}</strong>
      CPF n\u00ba ${escapeHtml(data.cpf)}
    </div>
    <div class="sig-attorney">
      ${oabImg}
      <div class="attorney-info">
        <strong>Dr. CL\u00c9VES DOMINGOS GALLIASSI</strong>
        OAB/RS sob n\u00ba 59.626
      </div>
      <div class="sig-attorney-spacer"></div>
    </div>
  </div>


  <div class="page-break"></div>
  <!-- ═══ PAGE 4 ═══ -->
  ${BOX_TITLE('Procura\u00e7\u00e3o')}

  <div class="proc-row">
    <div class="proc-icon-col">
      <div class="proc-icon-label">Outorgante</div>
      <div class="proc-icon-body">
        <svg viewBox="0 0 24 24" fill="#2a2a2a" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
      </svg>
      </div>
    </div>
    <div class="proc-text-col">
      <p>${contratante}</p>
    </div>
  </div>

  <div class="proc-row proc-row--stretch">
    <div class="proc-icon-col">
      <div class="proc-icon-label">Outorgados</div>
      <div class="proc-icon-body">
        <svg viewBox="0 0 40 52" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="12" r="10" fill="#2a2a2a"/>
        <path d="M4 52 L4 35 Q4 24 20 21 Q36 24 36 35 L36 52Z" fill="#1c1c1c"/>
        <path d="M20 21 L13 30 L17 52 L20 52Z" fill="#2a2a2a"/>
        <path d="M20 21 L27 30 L23 52 L20 52Z" fill="#2a2a2a"/>
        <path d="M13 30 L20 26 L27 30 L25 39 L15 39Z" fill="white"/>
        <polygon points="20,26 17,38 20,44 23,38" fill="#888888"/>
      </svg>
      </div>
    </div>
    <div class="proc-text-col">
      <p>A presente procura\u00e7\u00e3o \u00e9 outorgada, nos termos do art. 15, \u00a7 3\u00ba, da Lei n\u00ba 8.906/1994 e do art. 105, \u00a7\u00a7 2\u00ba e 3\u00ba, do C\u00f3digo de Processo Civil, individualmente ao advogado CL\u00c9VES DOMINGOS GALLIASSI, brasileiro, solteiro, advogado, inscrito na OAB/RS sob n\u00ba 59.626, CPF n\u00ba 754.026.880-87, integrante da CL\u00c9VES GALLIASSI SOCIEDADE INDIVIDUAL DE ADVOCACIA, inscrita no CNPJ sob n\u00ba 25.248.509/0001-89, registrada na OAB/RS sob n\u00ba 6.113, com endere\u00e7o profissional na Rua Manoel Francisco Guerreiro n\u00ba 1.298, salas n\u00ba 205-206, Edif\u00edcio Platina, Centro, Guapor\u00e9/RS, CEP 99.200-000, telefone/WhatsApp (54) 9-9941-3818, e-mail cgalliassi@terra.com.br, a quem confere poderes para o foro em geral, com a cl\u00e1usula <em>ad judicia et extra</em> e tamb\u00e9m \u00e0 advogada NAT\u00c1LIA BATTISTELLA, brasileira, solteira, inscrita na OAB/RS sob n\u00ba 134.838, CPF n\u00ba 017.473.720-30, com domic\u00edlio profissional na Rua Manoel Francisco Guerreiro n\u00ba 1.298, salas n\u00ba 205-206, Edif\u00edcio Platina, Centro, Guapor\u00e9/RS, CEP 99.200-000, telefone/WhatsApp (54) 9-9195-5747, e-mail advo.54@hotmail.com.</p>
    </div>
  </div>

  <div class="proc-row">
    <div class="proc-icon-col">
      <div class="proc-icon-label">Poderes</div>
      <div class="proc-icon-body">
        <svg viewBox="0 0 68 85" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="2" width="44" height="56" rx="3" fill="white" stroke="#2a2a2a" stroke-width="2.5"/>
        <line x1="16" y1="14" x2="44" y2="14" stroke="#2a2a2a" stroke-width="2"/>
        <line x1="16" y1="22" x2="44" y2="22" stroke="#2a2a2a" stroke-width="2"/>
        <line x1="16" y1="30" x2="36" y2="30" stroke="#2a2a2a" stroke-width="2"/>
        <path d="M2 82 Q2 68 12 66 L28 66" stroke="#2a2a2a" stroke-width="3" stroke-linecap="round" fill="none"/>
        <rect x="24" y="56" width="7" height="16" rx="3.5" fill="#2a2a2a"/>
        <rect x="32" y="54" width="7" height="18" rx="3.5" fill="#2a2a2a"/>
        <path d="M66 82 Q66 68 56 66 L40 66" stroke="#2a2a2a" stroke-width="3" stroke-linecap="round" fill="none"/>
        <rect x="37" y="56" width="7" height="16" rx="3.5" fill="#2a2a2a"/>
        <rect x="29" y="54" width="7" height="18" rx="3.5" fill="#2a2a2a"/>
        <rect x="24" y="64" width="20" height="10" rx="3" fill="#2a2a2a"/>
      </svg>
      </div>
    </div>
    <div class="proc-text-col">
      <p>Declara expressamente neste instrumento particular que nomeia, autoriza, habilita e constitui como seu representante, mandat\u00e1rio, procurador, assistente e advogado o outorgado acima qualificado, conferindo-lhe poderes para atuar na esfera extrajudicial (setor p\u00fablico e privado), administrativa e judicial mediante esta procura\u00e7\u00e3o geral para o foro que o habilita a praticar todos os atos do processo de conhecimento e para o cumprimento de senten\u00e7a na forma do art. 105 da Lei Federal n\u00ba 13.105/2015 e art. 653 da Lei Federal n\u00ba 10.406/2002, podendo transigir, fazer acordo e dar quita\u00e7\u00e3o em nome do outorgante.</p>
    </div>
  </div>

  <div class="date-line">${dateLine}.</div>

  <div class="sig-line-block sig-line-block--bottom">
    ${oabImg}
    <div class="sig-line-name">${escapeHtml(data.fullName)}<br/>CPF n\u00ba ${escapeHtml(data.cpf)}</div>
    <div class="sig-line-spacer"></div>
  </div>

  <div class="page-break"></div>
  ${BOX_TITLE('Declara\u00e7\u00e3o de Renda')}

  <div class="proc-row">
    <div class="proc-icon-col">
      <div class="proc-icon-label">Declarante</div>
      <div class="proc-icon-body">
        <svg viewBox="0 0 24 24" fill="#2a2a2a" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
      </div>
    </div>
    <div class="proc-text-col">
      <p>${contratante}</p>
    </div>
  </div>

  <div class="clause">
    <div class="clause-body">
      <p>Declaro, expressamente, para os fins do art. 219 do C\u00f3digo Civil Brasileiro, Lei Federal n\u00ba 10.406/2002, do art. 99, \u00a7 3\u00ba, do C\u00f3digo de Processo Civil, Lei Federal n\u00ba 13.105/2015, que, atualmente, minha renda mensal l\u00edquida, consideradas as despesas ordin\u00e1rias de subsist\u00eancia, n\u00e3o ultrapassa 5 (cinco) sal\u00e1rios-m\u00ednimos mensais.</p>
      <p>Declaro, ainda, que n\u00e3o possuo condi\u00e7\u00f5es financeiras de arcar com as custas processuais e demais despesas do processo sem preju\u00edzo do meu pr\u00f3prio sustento e de minha fam\u00edlia, raz\u00e3o pela qual requeiro a concess\u00e3o do benef\u00edcio da gratuidade da justi\u00e7a.</p>
      <p>Por ser express\u00e3o da verdade, firmo a presente declara\u00e7\u00e3o.</p>
    </div>
  </div>

  <div class="date-line">${dateLine}.</div>

  <div class="sig-line-block sig-line-block--decl" style="justify-content:center;">
    <div class="sig-line-name">${escapeHtml(data.fullName)}<br/>CPF n\u00ba ${escapeHtml(data.cpf)}</div>
  </div>


</body>
</html>`;

  return { html, footerTemplate };
}
