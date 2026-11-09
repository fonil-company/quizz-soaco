/**
 * Webhook de Leads - Só Aço
 * Recebe leads via POST e grava cada um como uma nova linha,
 * com títulos de coluna bonitos e estilo aplicado automaticamente.
 *
 * O quiz envia pelo servidor (Nginx: /api/lead-sheets -> SHEETS_WEBHOOK_URL).
 * Publicar: Implantar > Nova implantação > App da Web
 *   Executar como: Eu | Quem pode acessar: Qualquer pessoa
 * e colar a URL (termina em /exec) em Easypanel > Environment > SHEETS_WEBHOOK_URL.
 */

const FIELD_LABELS = {
  'datahora': 'Data/Hora',
  'nome': 'Nome',
  'whatsapp': 'WhatsApp',
  'telefone': 'Telefone',
  'email': 'E-mail',
  'uf': 'UF',
  'cidade': 'Cidade',
  'empresa': 'Empresa',
  'cnpj': 'CNPJ',
  'segmento': 'Segmento',
  'gclid': 'GCLID',
  'utmsource': 'UTM Source',
  'utmmedium': 'UTM Medium',
  'utmcampaign': 'UTM Campaign',
  'utmterm': 'UTM Term',
  'utmcontent': 'UTM Content',
  // Campos do quiz
  'cargo': 'Cargo',
  'contatopreferido': 'Contato preferido',
  'carga': 'Tipo de carga',
  'peso': 'Peso por nível',
  'desafio': 'Principal desafio',
  'pedireito': 'Altura disponível',
  'prazo': 'Prazo',
  'solucao': 'Solução recomendada',
  'solucaoalternativa': 'Solução alternativa',
  'temperatura': 'Temperatura',
  'fbclid': 'FBCLID',
  'pagina': 'Página'
};

function norm_(s) {
  return String(s === undefined || s === null ? '' : s)
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function label_(keyOrHeader) {
  const n = norm_(keyOrHeader);
  return FIELD_LABELS[n] || String(keyOrHeader);
}

// Texto que começa com = + - @ viraria fórmula na planilha: grava como texto puro
function safe_(v) {
  return (typeof v === 'string' && /^[=+\-@]/.test(v)) ? "'" + v : v;
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Página1') || ss.getSheets()[0];

    let data = {};
    if (e && e.postData && e.postData.contents) {
      try { data = JSON.parse(e.postData.contents); }
      catch (err) { data = e.parameter || {}; }
    } else if (e && e.parameter) {
      data = e.parameter;
    }
    data = flatten_(data);

    const normData = {};
    Object.keys(data).forEach(function (k) { normData[norm_(k)] = data[k]; });

    let headers = [];
    if (sheet.getLastColumn() >= 1) {
      headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
        .filter(function (h) { return h !== '' && h !== null; });
    }
    if (headers.length === 0) headers = ['Data/Hora'];

    if (headers.map(norm_).indexOf('datahora') === -1) headers.unshift('Data/Hora');

    const existingNorms = headers.map(norm_);
    let addedNew = false;
    Object.keys(normData).forEach(function (n) {
      if (existingNorms.indexOf(n) === -1) {
        headers.push(label_(n));
        existingNorms.push(n);
        addedNew = true;
      }
    });

    const niceHeaders = headers.map(label_);
    sheet.getRange(1, 1, 1, niceHeaders.length).setValues([niceHeaders]);

    const row = niceHeaders.map(function (h) {
      const n = norm_(h);
      if (n === 'datahora') return new Date();
      const v = normData[n];
      if (v === undefined || v === null) return '';
      if (typeof v === 'object') return JSON.stringify(v);
      return safe_(v);
    });
    sheet.appendRow(row);

    styleHeader_(sheet, niceHeaders.length);
    if (addedNew) formatSheet();

    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return ContentService.createTextOutput('Webhook de leads da Só Aço esta ativo.');
}

function flatten_(obj, prefix) {
  const out = {};
  prefix = prefix || '';
  Object.keys(obj || {}).forEach(function (k) {
    const val = obj[k];
    const key = prefix ? prefix + ' ' + k : k;
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const nested = flatten_(val, key);
      Object.keys(nested).forEach(function (nk) { out[nk] = nested[nk]; });
    } else {
      out[key] = val;
    }
  });
  return out;
}

function styleHeader_(sheet, nCols) {
  const h = sheet.getRange(1, 1, 1, nCols);
  h.setBackground('#263238').setFontColor('#ffffff').setFontWeight('bold')
    .setFontSize(11).setVerticalAlignment('middle');
  sheet.setFrozenRows(1);
  sheet.setRowHeight(1, 36);
}

/**
 * Deixa a planilha bonita. Pode rodar manualmente pelo editor.
 */
function formatSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Página1') || ss.getSheets()[0];
  const lastCol = Math.max(1, sheet.getLastColumn());

  const hdr = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  sheet.getRange(1, 1, 1, lastCol).setValues([hdr.map(function (x) { return x === '' ? '' : label_(x); })]);

  sheet.getBandings().forEach(function (b) { b.remove(); });
  const band = sheet.getRange(1, 1, sheet.getMaxRows(), lastCol).applyRowBanding();
  band.setHeaderRowColor('#263238').setFirstRowColor('#ffffff').setSecondRowColor('#ECEFF1');

  sheet.getDataRange().setFontFamily('Arial').setFontSize(10).setVerticalAlignment('middle');
  styleHeader_(sheet, lastCol);

  sheet.autoResizeColumns(1, lastCol);
  for (var c = 1; c <= lastCol; c++) {
    var w = sheet.getColumnWidth(c);
    if (w < 100) sheet.setColumnWidth(c, 120);
    if (w > 320) sheet.setColumnWidth(c, 320);
  }
}
