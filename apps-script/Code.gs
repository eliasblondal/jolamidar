/** @OnlyCurrentDoc */
/**
 * Jólamiðar 5. flokks kvenna – Þróttur
 * ------------------------------------
 * Tekur við pöntunum af vefnum og skráir þær í Google Sheet.
 *
 *  doPost  → skráir pöntun, úthlutar pöntunarnúmeri og sendir staðfestingarpóst
 *  doGet   → skilar samtölum fyrir „Staðan“ á vefnum (engin nöfn eða netföng)
 *
 * Uppsetning: keyrðu fallið `uppsetning` einu sinni og birtu svo sem vefforrit
 * (Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone).
 */

const TAFLA_ID = '';               // tómt = taflan sem scriptið er bundið við
const BLAD_PANTANIR = 'Pantanir';
const BLAD_STILLINGAR = 'Stillingar';
const TIMABELTI = 'Atlantic/Reykjavik';
const MANUDIR = ['janúar', 'febrúar', 'mars', 'apríl', 'maí', 'júní', 'júlí', 'ágúst', 'september', 'október', 'nóvember', 'desember'];

const DALKAR = ['Pöntunarnr.', 'Tími', 'Nafn', 'Netfang', 'Pakkar', 'Upphæð (kr.)', 'Til flokksins (kr.)', 'Greitt', 'Afhent', 'Hætt við', 'Athugasemd'];
const D = { NR: 1, TIMI: 2, NAFN: 3, NETFANG: 4, PAKKAR: 5, UPPHAED: 6, TIL_FLOKKS: 7, GREITT: 8, AFHENT: 9, HAETT: 10, ATH: 11 };

const SJALFGEFNAR_STILLINGAR = [
  ['Pöntunarfrestur', new Date(Date.UTC(2026, 11, 1, 23, 59)), 'Síðasti pöntunardagur og tími'],
  ['Pantanir opnar', true, 'Taktu hakið af til að loka fyrir pantanir'],
  ['Markmið (kr.)', 300000, 'Söfnunarmarkmið sem súlan á vefnum miðar við'],
  ['Verð pakka (kr.)', 1500, 'Söluverð með vsk.'],
  ['Kostnaður pakka (kr.)', 300, 'Framleiðslukostnaður með vsk.'],
  ['Reikningur', '0000-26-000000', 'Banki-hb-reikningsnúmer'],
  ['Kennitala', '000000-0000', 'Kennitala reikningseiganda'],
  ['Eigandi reiknings', '', 'Valfrjálst, t.d. „Þróttur – 5. fl. kvenna“'],
  ['Afhending', 'Nánari upplýsingar um afhendingu koma í tölvupósti.', 'Birtist á vefnum og í staðfestingarpósti'],
  ['Netfang tengiliðs', '', 'Birtist á vefnum og sem svarnetfang í pósti'],
  ['Senda staðfestingarpóst', true, 'Sendir kaupanda greiðsluupplýsingar'],
  ['Slóð vefsins', '', 'Notað fyrir merkið í staðfestingarpósti']
];

/* ========================= Uppsetning ========================= */

function uppsetning() {
  const ss = tafla_();
  ss.setSpreadsheetTimeZone(TIMABELTI);

  let p = ss.getSheetByName(BLAD_PANTANIR);
  if (!p) {
    p = ss.getSheets().length === 1 && ss.getSheets()[0].getLastRow() === 0 ? ss.getSheets()[0] : ss.insertSheet();
    p.setName(BLAD_PANTANIR);
  }
  p.getRange(1, 1, 1, DALKAR.length).setValues([DALKAR])
    .setFontWeight('bold').setBackground('#D4111A').setFontColor('#FFFFFF');
  p.setFrozenRows(1);
  p.getRange('A:A').setNumberFormat('@');
  p.getRange('B:B').setNumberFormat('d.m.yyyy HH:mm');
  p.getRange('F:G').setNumberFormat('#,##0 "kr."');
  p.setColumnWidths(1, 1, 100); p.setColumnWidth(2, 140); p.setColumnWidth(3, 200); p.setColumnWidth(4, 230);
  p.setColumnWidths(5, 6, 110); p.setColumnWidth(11, 260);

  let s = ss.getSheetByName(BLAD_STILLINGAR);
  if (!s) s = ss.insertSheet(BLAD_STILLINGAR);
  if (s.getLastRow() < 2) {
    s.getRange(1, 1, 1, 3).setValues([['Stilling', 'Gildi', 'Skýring']])
      .setFontWeight('bold').setBackground('#0F3A2D').setFontColor('#FFFFFF');
    s.getRange('B7:B8').setNumberFormat('@');
    s.getRange(2, 1, SJALFGEFNAR_STILLINGAR.length, 3).setValues(SJALFGEFNAR_STILLINGAR);
    s.getRange(2, 2).setNumberFormat('d.m.yyyy HH:mm');
    s.getRange(3, 2).insertCheckboxes(); s.getRange(3, 2).setValue(true);
    s.getRange(12, 2).insertCheckboxes(); s.getRange(12, 2).setValue(true);
    s.getRange('B4:B6').setNumberFormat('#,##0');
    s.setColumnWidth(1, 200); s.setColumnWidth(2, 260); s.setColumnWidth(3, 380);
    s.setFrozenRows(1);
  }
  ss.setActiveSheet(p);
}

/* =========================== Vefur ============================ */

function doGet(e) {
  return json_(stada_());
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  let laest = false;
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    // Hunangsgildra fyrir róbóta: látum eins og allt sé í lagi en vistum ekkert
    if (d.vefsida) return json_({ ok: true, nr: '0000', pakkar: 1, upphaed: 0 });

    const nafn = String(d.nafn || '').trim().slice(0, 80);
    const netfang = String(d.netfang || '').trim().slice(0, 120);
    const pakkar = Math.floor(Number(d.pakkar));
    if (nafn.length < 2) return json_({ ok: false, villa: 'Vantar nafn.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(netfang)) return json_({ ok: false, villa: 'Netfangið virðist ekki rétt.' });
    if (!(pakkar >= 1 && pakkar <= 50)) return json_({ ok: false, villa: 'Fjöldi pakka þarf að vera á bilinu 1–50.' });

    const st = stillingar_();
    if (!erOpid_(st)) return json_({ ok: false, villa: 'Pöntunum er lokað. Takk fyrir áhugann!' });

    const verd = Number(st['Verð pakka (kr.)']) || 1500;
    const kostn = Number(st['Kostnaður pakka (kr.)']) || 300;
    const upphaed = pakkar * verd;

    lock.waitLock(20000); laest = true;
    const nr = naestaNumer_();
    const sh = tafla_().getSheetByName(BLAD_PANTANIR);
    const rod = sh.getLastRow() + 1;
    sh.getRange(rod, 1, 1, DALKAR.length).setValues([[
      nr, new Date(), hreinsa_(nafn), hreinsa_(netfang), pakkar, upphaed, pakkar * (verd - kostn), false, false, false, ''
    ]]);
    sh.getRange(rod, D.GREITT, 1, 3).insertCheckboxes();
    SpreadsheetApp.flush();
    lock.releaseLock(); laest = false;

    const frestur = st['Pöntunarfrestur'] instanceof Date ? st['Pöntunarfrestur'] : null;
    const svar = {
      ok: true, nr: nr, pakkar: pakkar, upphaed: upphaed,
      reikningur: String(st['Reikningur'] || ''), kennitala: String(st['Kennitala'] || ''),
      eigandi: String(st['Eigandi reiknings'] || ''),
      frestur: frestur ? frestur.toISOString() : null,
      postur: false
    };

    if (st['Senda staðfestingarpóst'] !== false) {
      try { sendaStadfestingu_(netfang, nafn, svar, st); svar.postur = true; } catch (err) { console.error(err); }
    }
    return json_(svar);
  } catch (err) {
    console.error(err);
    return json_({ ok: false, villa: 'Eitthvað fór úrskeiðis. Reyndu aftur eftir smá stund.' });
  } finally {
    if (laest) try { lock.releaseLock(); } catch (_) {}
  }
}

/* ========================== Hjálparföll ========================== */

function tafla_() {
  return TAFLA_ID ? SpreadsheetApp.openById(TAFLA_ID) : SpreadsheetApp.getActiveSpreadsheet();
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function stillingar_() {
  const s = tafla_().getSheetByName(BLAD_STILLINGAR);
  const out = {};
  if (!s || s.getLastRow() < 2) { SJALFGEFNAR_STILLINGAR.forEach((r) => out[r[0]] = r[1]); return out; }
  s.getRange(2, 1, s.getLastRow() - 1, 2).getValues().forEach((r) => { if (r[0]) out[String(r[0]).trim()] = r[1]; });
  return out;
}

function erOpid_(st) {
  if (st['Pantanir opnar'] === false) return false;
  const f = st['Pöntunarfrestur'];
  return !(f instanceof Date) || f.getTime() > Date.now();
}

function stada_() {
  const st = stillingar_();
  const sh = tafla_().getSheetByName(BLAD_PANTANIR);
  let pakkar = 0, greiddir = 0, pantanir = 0;
  const n = sh ? sh.getLastRow() - 1 : 0;
  if (n > 0) {
    sh.getRange(2, D.PAKKAR, n, D.HAETT - D.PAKKAR + 1).getValues().forEach((r) => {
      const p = Number(r[0]) || 0;
      const haett = r[D.HAETT - D.PAKKAR] === true;
      if (!p || haett) return;
      pakkar += p; pantanir++;
      if (r[D.GREITT - D.PAKKAR] === true) greiddir += p;
    });
  }
  const verd = Number(st['Verð pakka (kr.)']) || 1500;
  const kostn = Number(st['Kostnaður pakka (kr.)']) || 300;
  const f = st['Pöntunarfrestur'];
  return {
    ok: true,
    pakkar: pakkar, greiddirPakkar: greiddir, pantanir: pantanir,
    safnad: pakkar * (verd - kostn), safnadGreitt: greiddir * (verd - kostn),
    markmid: Number(st['Markmið (kr.)']) || 0,
    verd: verd, kostnadur: kostn,
    frestur: f instanceof Date ? f.toISOString() : null,
    opid: erOpid_(st),
    reikningur: String(st['Reikningur'] || ''), kennitala: String(st['Kennitala'] || ''),
    eigandi: String(st['Eigandi reiknings'] || ''),
    afhending: String(st['Afhending'] || ''), tengilidur: String(st['Netfang tengiliðs'] || '')
  };
}

function naestaNumer_() {
  const props = PropertiesService.getScriptProperties();
  let n = Number(props.getProperty('naestaNr'));
  if (!n) {
    const sh = tafla_().getSheetByName(BLAD_PANTANIR);
    const rows = sh.getLastRow() - 1;
    n = 1;
    if (rows > 0) sh.getRange(2, 1, rows, 1).getValues().forEach((r) => { n = Math.max(n, (parseInt(r[0], 10) || 0) + 1); });
  }
  props.setProperty('naestaNr', String(n + 1));
  return String(n).padStart(4, '0');
}

// Kemur í veg fyrir að texti sem byrjar á = + - @ verði túlkaður sem formúla
function hreinsa_(t) { return /^[=+\-@]/.test(t) ? "'" + t : t; }

function kr_(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' kr.'; }
function dags_(d) { return d.getDate() + '. ' + MANUDIR[d.getMonth()]; }
function esc_(t) { return String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

function sendaStadfestingu_(netfang, nafn, s, st) {
  const fornafn = nafn.split(/\s+/)[0];
  const frestur = s.frestur ? dags_(new Date(s.frestur)) : null;
  const slod = String(st['Slóð vefsins'] || '').replace(/\/$/, '');
  const tengilidur = String(st['Netfang tengiliðs'] || '');
  const pakkaOrd = s.pakkar + ' ' + ((s.pakkar % 10 === 1 && s.pakkar % 100 !== 11) ? 'pakki' : 'pakkar');
  const rod = (k, v) => '<tr><td style="padding:10px 0;border-bottom:1px solid #E6DAC8;font-size:15px">' + k + '</td><td style="padding:10px 0;border-bottom:1px solid #E6DAC8;font-size:17px;font-weight:700;text-align:right">' + esc_(v) + '</td></tr>';

  const html =
    '<div style="background:#F4EEE3;padding:24px 12px;font-family:Helvetica,Arial,sans-serif;color:#1C1714">' +
    '<div style="max-width:520px;margin:0 auto;background:#FFFFFF;border-radius:18px;overflow:hidden;border:2px solid #1C1714">' +
    '<div style="height:10px;background:repeating-linear-gradient(-45deg,#FFFFFF 0 9px,#D4111A 9px 18px);background-color:#D4111A"></div>' +
    '<div style="background:#D4111A;color:#FFFFFF;padding:22px 24px">' +
    (slod ? '<img src="' + slod + '/assets/merki.png" alt="Þróttur" height="64" style="float:right;height:64px">' : '') +
    '<div style="font-size:30px;font-weight:800;line-height:1">Jólamiðar</div>' +
    '<div style="font-size:15px;margin-top:6px">5. flokkur kvenna · Þróttur</div><div style="clear:both"></div></div>' +
    '<div style="padding:24px">' +
    '<p style="font-size:18px;margin:0 0 6px"><b>Takk fyrir pöntunina, ' + esc_(fornafn) + '!</b></p>' +
    '<p style="font-size:15px;margin:0 0 18px">Pöntun nr. <b>' + s.nr + '</b>: ' + pakkaOrd + ' (' + (s.pakkar * 10) + ' miðar).</p>' +
    '<div style="background:#1C1714;color:#FFFFFF;padding:10px 14px;border-radius:10px 10px 0 0;font-weight:700;font-size:15px">Millifærðu á reikning flokksins</div>' +
    '<table style="width:100%;border-collapse:collapse;border:2px solid #1C1714;border-top:0;border-radius:0 0 10px 10px"><tbody><tr><td style="padding:0 14px"><table style="width:100%;border-collapse:collapse">' +
    rod('Upphæð', kr_(s.upphaed)) + rod('Reikningur', s.reikningur) + rod('Kennitala', s.kennitala) +
    (s.eigandi ? rod('Eigandi', s.eigandi) : '') + rod('Skýring', s.nr) +
    '</table></td></tr></tbody></table>' +
    '<div style="margin-top:18px;background:#FDECEA;border:2px solid #D4111A;border-radius:12px;padding:12px 14px;color:#7E0910;font-size:15px;line-height:1.45">' +
    '<b>Miðarnir verða ekki framleiddir fyrr en greiðsla hefur borist.</b>' + (frestur ? ' Greiddu fyrir ' + frestur + ' svo pakkinn náist fyrir jól.' : '') + '</div>' +
    (st['Afhending'] ? '<p style="font-size:15px;margin:18px 0 0"><b>Afhending:</b> ' + esc_(st['Afhending']) + '</p>' : '') +
    '<p style="font-size:15px;margin:18px 0 0">Takk fyrir að styrkja stelpurnar!</p>' +
    (tengilidur ? '<p style="font-size:14px;margin:12px 0 0">Spurningar? Svaraðu þessum pósti eða skrifaðu á ' + esc_(tengilidur) + '.</p>' : '') +
    '</div></div></div>';

  const texti = 'Takk fyrir pöntunina, ' + fornafn + '!\n\nPöntun nr. ' + s.nr + ': ' + pakkaOrd + '.\n\n' +
    'Millifærðu ' + kr_(s.upphaed) + ' á reikning ' + s.reikningur + ', kt. ' + s.kennitala + ', skýring: ' + s.nr + '.\n\n' +
    'Miðarnir verða ekki framleiddir fyrr en greiðsla hefur borist.' + (frestur ? ' Greiddu fyrir ' + frestur + '.' : '') + '\n\nTakk fyrir að styrkja stelpurnar!';

  const opt = { htmlBody: html, name: 'Jólamiðar 5. flokks Þróttar' };
  if (tengilidur) opt.replyTo = tengilidur;
  MailApp.sendEmail(netfang, 'Jólamiðar – pöntun nr. ' + s.nr, texti, opt);
}

/* ======================= Viðhald (keyrt handvirkt) ======================= */

// Eyðir prufupöntunum (nafn byrjar á „PRUFA“) og stillir númeraröðina upp á nýtt
function hreinsaPrufur() {
  const sh = tafla_().getSheetByName(BLAD_PANTANIR);
  for (let r = sh.getLastRow(); r >= 2; r--) {
    if (String(sh.getRange(r, D.NAFN).getValue()).toUpperCase().indexOf('PRUFA') === 0) sh.deleteRow(r);
  }
  PropertiesService.getScriptProperties().deleteProperty('naestaNr');
}
