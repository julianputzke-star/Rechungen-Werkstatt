/* Werkstatt-Rechnungen – Oberfläche, Speicherung, Archiv */
(function () {
  'use strict';
  const { erstellePdf, berechne, zahl, euro, dez, datumDE } = window.RechnungPDF;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const KEY_SETTINGS = 'wr_einstellungen';
  const KEY_ARCHIV = 'wr_archiv';
  const KEY_ENTWURF = 'wr_entwurf';

  const STANDARD = {
    firma: 'Putzke KFZ-Technik',
    zusatz: 'Meisterbetrieb',
    inhaber: 'Julian Putzke',
    strasse: 'Waldheimstr. 18',
    plz: '82166',
    ort: 'Gräfelfing',
    tel: '+49 151 28940312',
    email: '', web: '',
    steuernr: '', ustid: '', bank: '', iban: '', bic: '',
    kleinunternehmer: true,
    absenderzeile: false,
    stundensatz: '95,00',
    mwst: '19',
    zahlungsziel: '14',
    nrPrefix: '',
    nrFormat: 'jahr',
    letzteNr: '0',
    einleitung: 'Für die an Ihrem Fahrzeug durchgeführten Arbeiten erlauben wir uns, wie folgt zu berechnen:',
    schlusstext: 'Vielen Dank für Ihren Auftrag und Ihr Vertrauen. Auf die ausgeführten Arbeiten und eingebauten Teile gilt die gesetzliche Gewährleistung.',
    logo: '',
  };

  // ---------- Speicher ----------
  const lade = (key, def) => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch (e) { return def; }
  };
  const speichere = (key, val) => {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) { toast('Speichern fehlgeschlagen (Speicher voll oder blockiert)!'); return false; }
  };

  let settings = { ...STANDARD, ...lade(KEY_SETTINGS, {}) };
  if ((settings.version || 1) < 2) {
    // Umstellung: Betrieb ist Kleinunternehmer nach § 19 UStG
    settings.kleinunternehmer = true;
    settings.version = 2;
    speichere(KEY_SETTINGS, settings);
  }
  if (!settings.inhaber) { settings.inhaber = STANDARD.inhaber; speichere(KEY_SETTINGS, settings); }
  let archiv = lade(KEY_ARCHIV, []);
  let inv = null;

  const heute = () => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function naechsteNr() {
    const n = (parseInt(settings.letzteNr, 10) || 0) + 1;
    if (settings.nrFormat === 'fortlaufend') return `${settings.nrPrefix || ''}${n}`;
    return `${settings.nrPrefix || ''}${new Date().getFullYear()}-${String(n).padStart(4, '0')}`;
  }
  function nrZaehler(nr) {
    const m = /(\d+)\s*$/.exec(String(nr || ''));
    return m ? parseInt(m[1], 10) : 0;
  }

  const neueArbeit = () => ({ nr: '', bez: '', std: '', satz: settings.stundensatz, rabatt: '' });
  const neuesTeil = () => ({ nr: '', bez: '', menge: '1', einheit: 'Stk.', preis: '', rabatt: '' });
  const neuesSonst = () => ({ nr: '', bez: '', menge: '1', einheit: 'Stk.', preis: '', rabatt: '' });

  function neueRechnung() {
    return {
      id: uid(), nr: naechsteNr(), datum: heute(), leistungsdatum: heute(),
      kundennr: '', auftragsnr: '', zahlungsart: 'ueberweisung', zahlungsziel: settings.zahlungsziel,
      kunde: { anrede: '', firma: '', vorname: '', nachname: '', strasse: '', plz: '', ort: '', tel: '', email: '' },
      fahrzeug: { kennzeichen: '', hersteller: '', modell: '', fin: '', ez: '', km: '', hsn: '', tsn: '', motor: '', annahme: '' },
      arbeiten: [neueArbeit()], teile: [neuesTeil()], sonstiges: [],
      bemerkung: '', unterschrift: true, kundenunterschrift: false, bezahlt: false,
      kleinunternehmer: !!settings.kleinunternehmer, mwst: settings.mwst,
    };
  }

  // ---------- Tabs ----------
  $$('.tab').forEach((b) => b.addEventListener('click', () => {
    $$('.tab').forEach((x) => x.classList.toggle('active', x === b));
    $$('.tabpane').forEach((p) => p.classList.toggle('active', p.id === 'tab-' + b.dataset.tab));
    document.body.className = 'tab-' + b.dataset.tab;
    if (b.dataset.tab === 'archiv') zeigeArchiv();
    if (b.dataset.tab === 'rechnung') vorschauBald();
  }));

  // ---------- Formular <-> Daten ----------
  const FELDER = {
    r_nr: ['nr'], r_datum: ['datum'], r_leistungsdatum: ['leistungsdatum'], r_kundennr: ['kundennr'],
    r_auftragsnr: ['auftragsnr'], r_zahlungsart: ['zahlungsart'], r_zahlungsziel: ['zahlungsziel'],
    r_bemerkung: ['bemerkung'], r_unterschrift: ['unterschrift'], r_kundenunterschrift: ['kundenunterschrift'],
  };
  ['anrede', 'firma', 'vorname', 'nachname', 'strasse', 'plz', 'ort', 'tel', 'email'].forEach((k) => { FELDER['k_' + k] = ['kunde', k]; });
  ['kennzeichen', 'hersteller', 'modell', 'fin', 'ez', 'km', 'hsn', 'tsn', 'motor', 'annahme'].forEach((k) => { FELDER['f_' + k] = ['fahrzeug', k]; });

  const getPfad = (o, p) => p.reduce((a, k) => (a ? a[k] : undefined), o);
  const setPfad = (o, p, v) => { let a = o; p.slice(0, -1).forEach((k) => { a = a[k]; }); a[p[p.length - 1]] = v; };

  function formularFuellen() {
    Object.entries(FELDER).forEach(([id, pfad]) => {
      const el = document.getElementById(id);
      const v = getPfad(inv, pfad);
      if (el.type === 'checkbox') el.checked = !!v; else el.value = v ?? '';
    });
    positionenZeichnen();
    aktualisiereSummen();
  }

  Object.entries(FELDER).forEach(([id, pfad]) => {
    const el = document.getElementById(id);
    el.addEventListener('input', () => {
      let v = el.type === 'checkbox' ? el.checked : el.value;
      if (id === 'f_kennzeichen' || id === 'f_fin') { v = v.toUpperCase(); el.value = v; }
      setPfad(inv, pfad, v);
      geaendert();
    });
    if (el.tagName === 'SELECT' || el.type === 'checkbox') el.addEventListener('change', () => el.dispatchEvent(new Event('input')));
  });

  // ---------- Positionen ----------
  const SPALTEN = {
    arbeiten: [['nr', 'text'], ['bez', 'text', 'vorschlagArbeit'], ['std', 'num'], ['satz', 'num'], ['rabatt', 'num']],
    teile: [['nr', 'text'], ['bez', 'text', 'vorschlagTeil'], ['menge', 'num'], ['einheit', 'einheit'], ['preis', 'num'], ['rabatt', 'num']],
    sonstiges: [['nr', 'text'], ['bez', 'text', 'vorschlagSonst'], ['menge', 'num'], ['einheit', 'einheit'], ['preis', 'num'], ['rabatt', 'num']],
  };
  const EINHEITEN = ['Stk.', 'Satz', 'Liter', 'ml', 'kg', 'm', 'Paar', 'psch.', 'Std.'];

  function vorschlaege() {
    // Datalists mit bisher verwendeten Bezeichnungen (inkl. Preis) füllen
    const sammeln = (feld) => {
      const map = new Map();
      archiv.forEach((r) => (r[feld] || []).forEach((p) => { if (p.bez) map.set(p.bez, p); }));
      return map;
    };
    window.__vorschlag = { arbeiten: sammeln('arbeiten'), teile: sammeln('teile'), sonstiges: sammeln('sonstiges') };
    [['vorschlagArbeit', 'arbeiten'], ['vorschlagTeil', 'teile'], ['vorschlagSonst', 'sonstiges']].forEach(([id, feld]) => {
      let dl = document.getElementById(id);
      if (!dl) { dl = document.createElement('datalist'); dl.id = id; document.body.appendChild(dl); }
      dl.innerHTML = '';
      window.__vorschlag[feld].forEach((_, bez) => { const o = document.createElement('option'); o.value = bez; dl.appendChild(o); });
    });
    const el = $('#einheitenListe') || Object.assign(document.createElement('datalist'), { id: 'einheitenListe' });
    el.innerHTML = EINHEITEN.map((e) => `<option value="${e}">`).join('');
    document.body.appendChild(el);
  }

  function positionenZeichnen() {
    ['arbeiten', 'teile', 'sonstiges'].forEach((art) => {
      const tbody = document.getElementById(art + 'Body');
      tbody.innerHTML = '';
      inv[art].forEach((p, i) => {
        const tr = document.createElement('tr');
        SPALTEN[art].forEach(([feld, typ, liste]) => {
          const td = document.createElement('td');
          const inp = document.createElement('input');
          inp.value = p[feld] ?? '';
          inp.dataset.feld = feld;
          if (typ === 'num') { inp.inputMode = 'decimal'; inp.className = 'num'; }
          if (typ === 'einheit') inp.setAttribute('list', 'einheitenListe');
          if (liste) inp.setAttribute('list', liste);
          inp.placeholder = { bez: art === 'arbeiten' ? 'z. B. Inspektion nach Herstellervorgabe' : 'Bezeichnung', std: '0,00', satz: '0,00', preis: '0,00', menge: '1', rabatt: '' }[feld] || '';
          inp.addEventListener('input', () => {
            p[feld] = inp.value;
            if (feld === 'bez') {
              const v = window.__vorschlag && window.__vorschlag[art].get(inp.value);
              if (v) { // bekannte Position: Werte übernehmen
                ['nr', 'satz', 'preis', 'einheit', 'std'].forEach((k) => { if (v[k] !== undefined && v[k] !== '' && (k !== 'std' || !p.std)) p[k] = v[k]; });
                positionenZeichnen();
                const neu = document.getElementById(art + 'Body').children[i].querySelector('[data-feld="bez"]');
                neu.focus(); neu.setSelectionRange(neu.value.length, neu.value.length);
              }
            }
            zeileSumme(art, i, tr);
            geaendert();
          });
          td.appendChild(inp);
          tr.appendChild(td);
        });
        const sum = document.createElement('td');
        sum.className = 'sum';
        tr.appendChild(sum);
        const del = document.createElement('td');
        const btn = document.createElement('button');
        btn.className = 'del'; btn.title = 'Position entfernen'; btn.textContent = '×';
        btn.addEventListener('click', () => { inv[art].splice(i, 1); positionenZeichnen(); geaendert(); });
        del.appendChild(btn);
        tr.appendChild(del);
        tbody.appendChild(tr);
        zeileSumme(art, i, tr);
      });
    });
  }

  function zeileSumme(art, i, tr) {
    const p = inv[art][i];
    const menge = art === 'arbeiten' ? p.std : p.menge;
    const preis = art === 'arbeiten' ? p.satz : p.preis;
    const g = zahl(menge) * zahl(preis) * (1 - zahl(p.rabatt) / 100);
    tr.querySelector('.sum').textContent = euro(Math.round(g * 100) / 100);
  }

  $$('button.add').forEach((b) => b.addEventListener('click', () => {
    const art = b.dataset.add;
    inv[art].push(art === 'arbeiten' ? neueArbeit() : art === 'teile' ? neuesTeil() : neuesSonst());
    positionenZeichnen();
    const rows = document.getElementById(art + 'Body').children;
    rows[rows.length - 1].querySelector('[data-feld="bez"]').focus();
    geaendert();
  }));

  // ---------- Summen & Hinweise ----------
  function aktualisiereSummen() {
    const t = berechne(inv, settings);
    const rows = [];
    rows.push(['Arbeitslohn' + (t.stunden ? ` (${dez(t.stunden)} Std.)` : ''), t.lohn]);
    rows.push(['Ersatzteile', t.teileSumme]);
    // (Beträge sind bei Kleinunternehmern Endbeträge – keine Netto/MwSt.-Zeilen)
    if (t.sonst || inv.sonstiges.length) rows.push(['Sonstiges', t.sonst]);
    let html = rows.map(([l, v]) => `<tr><td>${l}</td><td>${euro(v)}</td></tr>`).join('');
    if (!t.klein) {
      html += `<tr class="sub"><td>Netto</td><td>${euro(t.netto)}</td></tr>`;
      html += `<tr><td>MwSt. ${dez(t.satz, 0, 2)} %</td><td>${euro(t.mwst)}</td></tr>`;
    }
    html += `<tr class="total"><td>${t.klein ? 'Gesamtbetrag' : 'Rechnungsbetrag'}</td><td>${euro(t.brutto)}</td></tr>`;
    if (t.klein) html += '<tr><td colspan="2" class="muted">Kleinunternehmer § 19 UStG – keine Umsatzsteuer</td></tr>';
    $('#sumTable').innerHTML = html;
    $('#mobileSumme').textContent = euro(t.brutto);

    const fehlt = [];
    if (!settings.inhaber) fehlt.push('Vor- und Nachname des Inhabers fehlt (Pflicht: vollständiger Name des Unternehmers) – bitte unter „Einstellungen“ eintragen.');
    if (!t.klein && !settings.steuernr && !settings.ustid) fehlt.push('Steuernummer oder USt-IdNr. fehlt (Pflichtangabe) – bitte unter „Einstellungen“ eintragen.');
    if (!inv.kunde.strasse || !inv.kunde.plz || !inv.kunde.ort) fehlt.push('Vollständige Anschrift des Kunden fehlt (Pflichtangabe).');
    if (!settings.iban && inv.zahlungsart === 'ueberweisung') fehlt.push('Keine Bankverbindung hinterlegt.');
    if (!inv.kunde.nachname && !inv.kunde.firma) fehlt.push('Name des Rechnungsempfängers fehlt.');
    if (!inv.nr) fehlt.push('Rechnungsnummer fehlt.');
    else if (archiv.some((r) => r.nr === inv.nr && r.id !== inv.id)) fehlt.push(`Rechnungsnummer ${inv.nr} ist bereits vergeben!`);
    const box = $('#hinweisBox');
    box.innerHTML = fehlt.map((f) => '⚠ ' + f).join('<br>');
    box.classList.toggle('hidden', !fehlt.length);
  }

  let entwurfTimer, vorschauTimer;
  function geaendert() {
    aktualisiereSummen();
    clearTimeout(entwurfTimer);
    entwurfTimer = setTimeout(() => speichere(KEY_ENTWURF, inv), 400);
    vorschauBald();
  }

  // ---------- PDF ----------
  let vorschauUrl = null;
  function vorschauBald() {
    clearTimeout(vorschauTimer);
    vorschauTimer = setTimeout(vorschau, 900);
  }
  function vorschau() {
    if (!$('#tab-rechnung').classList.contains('active')) return;
    if (getComputedStyle($('.preview')).display === 'none') return;
    try {
      const doc = erstellePdf(inv, settings);
      if (vorschauUrl) URL.revokeObjectURL(vorschauUrl);
      vorschauUrl = URL.createObjectURL(doc.output('blob'));
      $('#vorschau').src = vorschauUrl + '#toolbar=0&view=FitH';
    } catch (e) { console.error(e); }
  }

  // Auf iPad/iPhone gibt es keinen Download-Ordner wie am PC. Dort öffnen wir das
  // Teilen-Menü („In Dateien sichern“, Drucken, Mail, AirDrop …).
  const istTouchGeraet = () => matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 1;

  function herunterladen(blob, name) {
    const typ = name.endsWith('.pdf') ? 'application/pdf' : 'application/json';
    if (istTouchGeraet() && navigator.canShare && window.File) {
      const datei = new File([blob], name, { type: typ });
      if (navigator.canShare({ files: [datei] })) {
        navigator.share({ files: [datei], title: name }).catch((e) => {
          if (e.name !== 'AbortError') dateiLink(blob, name);
        });
        return;
      }
    }
    dateiLink(blob, name);
  }

  function dateiLink(blob, name) {
    // als neutraler Datenstrom, damit der Browser den Dateinamen sicher übernimmt
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([blob], { type: 'application/octet-stream' }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  }

  function dateiname(r) {
    const teile = ['Rechnung', r.nr, r.kunde.nachname || r.kunde.firma, r.fahrzeug.kennzeichen]
      .filter(Boolean).join('_');
    const ersatz = { ä: 'ae', ö: 'oe', ü: 'ue', Ä: 'Ae', Ö: 'Oe', Ü: 'Ue', ß: 'ss' };
    return teile.replace(/[äöüÄÖÜß]/g, (c) => ersatz[c]).replace(/[^\w.-]+/g, '-').replace(/-+/g, '-') + '.pdf';
  }

  $('#btnPdf').addEventListener('click', () => {
    try {
      const doc = erstellePdf(inv, settings);
      archivieren(true);
      herunterladen(doc.output('blob'), dateiname(inv));
    } catch (e) { console.error(e); toast('Fehler beim Erstellen des PDF: ' + e.message); }
  });
  $('#btnVorschau').addEventListener('click', () => {
    if (getComputedStyle($('.preview')).display === 'none') {
      const doc = erstellePdf(inv, settings);
      window.open(URL.createObjectURL(doc.output('blob')), '_blank');
    } else vorschau();
  });
  $('#btnSpeichern').addEventListener('click', () => archivieren(false));
  $('#mBtnSpeichern').addEventListener('click', () => archivieren(false));
  $('#mBtnPdf').addEventListener('click', () => $('#btnPdf').click());

  function archivieren(still) {
    if (inv.kleinunternehmer === undefined) { inv.kleinunternehmer = !!settings.kleinunternehmer; inv.mwst = settings.mwst; }
    const kopie = JSON.parse(JSON.stringify(inv));
    kopie.gespeichert = new Date().toISOString();
    kopie.summe = berechne(inv, settings).brutto;
    const i = archiv.findIndex((r) => r.id === inv.id);
    if (i >= 0) archiv[i] = { ...archiv[i], ...kopie }; else archiv.unshift(kopie);
    const z = nrZaehler(inv.nr);
    if (z > (parseInt(settings.letzteNr, 10) || 0)) { settings.letzteNr = String(z); speichere(KEY_SETTINGS, settings); einstellungenFuellen(); }
    if (speichere(KEY_ARCHIV, archiv)) {
      $('#saveInfo').textContent = `Gespeichert: ${new Date().toLocaleString('de-DE')}`;
      toast(still ? 'PDF erstellt und im Archiv gespeichert' : 'Rechnung im Archiv gespeichert');
    }
    kundenListe();
    vorschlaege();
    aktualisiereSummen();
  }

  // ---------- Neu / Stammkunden ----------
  $('#btnNeu').addEventListener('click', () => {
    if (!confirm('Neue, leere Rechnung anlegen? Nicht gespeicherte Änderungen der aktuellen Rechnung gehen verloren.')) return;
    inv = neueRechnung();
    formularFuellen();
    geaendert();
  });

  function kundenListe() {
    const dl = $('#kundenListe');
    const seen = new Map();
    archiv.forEach((r) => {
      const name = [r.kunde.firma, [r.kunde.vorname, r.kunde.nachname].filter(Boolean).join(' ')].filter(Boolean).join(', ');
      const label = [r.fahrzeug.kennzeichen, name, [r.fahrzeug.hersteller, r.fahrzeug.modell].filter(Boolean).join(' ')].filter(Boolean).join(' – ');
      if (label && !seen.has(label)) seen.set(label, r);
    });
    window.__kunden = seen;
    dl.innerHTML = '';
    seen.forEach((_, label) => { const o = document.createElement('option'); o.value = label; dl.appendChild(o); });
  }
  $('#kundenSuche').addEventListener('input', (e) => {
    const r = window.__kunden && window.__kunden.get(e.target.value);
    if (!r) return;
    inv.kunde = { ...r.kunde };
    inv.fahrzeug = { ...r.fahrzeug, km: '', annahme: '' };
    inv.kundennr = r.kundennr || inv.kundennr;
    e.target.value = '';
    formularFuellen();
    geaendert();
    toast('Kunden- und Fahrzeugdaten übernommen – bitte km-Stand eintragen');
    $('#f_km').focus();
  });

  // ---------- Archiv ----------
  function zeigeArchiv() {
    const q = $('#archivFilter').value.trim().toLowerCase();
    const liste = archiv
      .filter((r) => !q || JSON.stringify([r.nr, r.kunde, r.fahrzeug.kennzeichen, r.fahrzeug.hersteller, r.fahrzeug.modell]).toLowerCase().includes(q))
      .sort((a, b) => (b.datum || '').localeCompare(a.datum || '') || (b.nr || '').localeCompare(a.nr || ''));
    const tb = $('#archivBody');
    tb.innerHTML = '';
    $('#archivLeer').classList.toggle('hidden', archiv.length > 0);
    liste.forEach((r) => {
      const tr = document.createElement('tr');
      const name = [r.kunde.firma, [r.kunde.vorname, r.kunde.nachname].filter(Boolean).join(' ')].filter(Boolean).join(', ');
      const fz = [r.fahrzeug.kennzeichen, [r.fahrzeug.hersteller, r.fahrzeug.modell].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
      const bezahlt = r.bezahlt || r.zahlungsart === 'bar' || r.zahlungsart === 'karte';
      tr.innerHTML = `<td><b></b></td><td></td><td></td><td></td><td class="r"></td><td><span class="badge ${bezahlt ? 'paid' : ''}">${bezahlt ? 'bezahlt' : 'offen'}</span></td><td class="btns"></td>`;
      const c = tr.children;
      c[0].firstChild.textContent = r.nr || '–';
      c[1].textContent = datumDE(r.datum);
      c[2].textContent = name;
      c[3].textContent = fz;
      c[4].textContent = euro(r.summe || 0);
      const btn = (txt, fn, title) => { const b = document.createElement('button'); b.className = 'small'; b.textContent = txt; b.title = title || ''; b.addEventListener('click', fn); c[6].appendChild(b); };
      btn('Öffnen', () => { inv = JSON.parse(JSON.stringify(r)); formularFuellen(); speichere(KEY_ENTWURF, inv); $('.tab[data-tab="rechnung"]').click(); });
      btn('PDF', () => herunterladen(erstellePdf(r, settings).output('blob'), dateiname(r)));
      btn('Kopie', () => {
        inv = JSON.parse(JSON.stringify(r));
        Object.assign(inv, { id: uid(), nr: naechsteNr(), datum: heute(), leistungsdatum: heute(), bezahlt: false,
          kleinunternehmer: !!settings.kleinunternehmer, mwst: settings.mwst });
        inv.fahrzeug.km = '';
        formularFuellen(); geaendert(); $('.tab[data-tab="rechnung"]').click();
        toast('Kopie als neue Rechnung angelegt');
      }, 'Als Vorlage für neue Rechnung verwenden');
      if (!bezahlt) btn('✓ bezahlt', () => { r.bezahlt = true; speichere(KEY_ARCHIV, archiv); zeigeArchiv(); });
      btn('Löschen', () => {
        if (!confirm(`Rechnung ${r.nr} wirklich löschen?`)) return;
        archiv = archiv.filter((x) => x.id !== r.id); speichere(KEY_ARCHIV, archiv); zeigeArchiv(); kundenListe();
      });
      tb.appendChild(tr);
    });
  }
  $('#archivFilter').addEventListener('input', zeigeArchiv);

  $('#btnExport').addEventListener('click', () => {
    const daten = { version: 1, exportiert: new Date().toISOString(), einstellungen: settings, archiv };
    const blob = new Blob([JSON.stringify(daten, null, 2)], { type: 'application/json' });
    herunterladen(blob, `Rechnungen-Sicherung_${heute()}.json`);
  });
  $('#importFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const daten = JSON.parse(await file.text());
      if (!Array.isArray(daten.archiv)) throw new Error('Keine gültige Sicherungsdatei');
      if (!confirm(`Sicherung vom ${new Date(daten.exportiert).toLocaleString('de-DE')} mit ${daten.archiv.length} Rechnungen einspielen? Rechnungen mit gleicher ID werden überschrieben, Einstellungen ersetzt.`)) return;
      const ids = new Set(daten.archiv.map((r) => r.id));
      archiv = [...daten.archiv, ...archiv.filter((r) => !ids.has(r.id))];
      settings = { ...STANDARD, ...daten.einstellungen };
      speichere(KEY_ARCHIV, archiv); speichere(KEY_SETTINGS, settings);
      einstellungenFuellen(); zeigeArchiv(); kundenListe(); vorschlaege(); aktualisiereSummen();
      toast('Sicherung eingespielt');
    } catch (err) { toast('Import fehlgeschlagen: ' + err.message); }
    e.target.value = '';
  });

  // ---------- Einstellungen ----------
  function einstellungenFuellen() {
    $$('[data-s]').forEach((el) => {
      const v = settings[el.dataset.s];
      if (el.type === 'checkbox') el.checked = !!v; else el.value = v ?? '';
    });
    $('#logoPreview').src = settings.logo || '';
    $('#brandName').textContent = settings.firma || 'Werkstatt';
    $('[data-s="mwst"]').disabled = !!settings.kleinunternehmer;
  }
  $$('[data-s]').forEach((el) => {
    const ev = el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(ev, () => {
      settings[el.dataset.s] = el.type === 'checkbox' ? el.checked : el.value;
      speichere(KEY_SETTINGS, settings);
      if (el.dataset.s === 'kleinunternehmer' || el.dataset.s === 'mwst') {
        // gilt für die Rechnung in Bearbeitung; archivierte Rechnungen behalten ihren Status
        inv.kleinunternehmer = !!settings.kleinunternehmer;
        inv.mwst = settings.mwst;
        $('[data-s="mwst"]').disabled = !!settings.kleinunternehmer;
        geaendert();
      }
      $('#brandName').textContent = settings.firma || 'Werkstatt';
      aktualisiereSummen();
    });
  });
  $('#logoFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      // Logo verkleinern, damit es den Speicher nicht sprengt
      const img = new Image();
      img.onload = () => {
        const max = 600, f = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * f); c.height = Math.round(img.height * f);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        settings.logo = c.toDataURL('image/jpeg', 0.9);
        speichere(KEY_SETTINGS, settings);
        einstellungenFuellen();
        toast('Logo gespeichert');
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  });
  $('#logoEntfernen').addEventListener('click', () => { settings.logo = ''; speichere(KEY_SETTINGS, settings); einstellungenFuellen(); });

  // ---------- Toast ----------
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
  }

  // ---------- App-Installation & Offline ----------
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('Service Worker:', e));
  }
  // Browser bitten, die Daten dauerhaft zu behalten (nicht automatisch löschen)
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  // Entwurf sofort sichern, wenn die App geschlossen oder in den Hintergrund gelegt wird
  const entwurfJetzt = () => { clearTimeout(entwurfTimer); speichere(KEY_ENTWURF, inv); };
  window.addEventListener('pagehide', entwurfJetzt);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') entwurfJetzt(); });
  let installEvent = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installEvent = e;
    $('#btnInstall').classList.remove('hidden');
  });
  $('#btnInstall').addEventListener('click', async () => {
    if (!installEvent) return;
    installEvent.prompt();
    await installEvent.userChoice;
    installEvent = null;
    $('#btnInstall').classList.add('hidden');
  });
  window.addEventListener('appinstalled', () => toast('App installiert – sie ist jetzt auf dem Startbildschirm bzw. im Startmenü.'));

  // ---------- Start ----------
  document.body.className = 'tab-rechnung';
  inv = lade(KEY_ENTWURF, null) || neueRechnung();
  ['arbeiten', 'teile', 'sonstiges'].forEach((k) => { if (!Array.isArray(inv[k])) inv[k] = []; });
  einstellungenFuellen();
  vorschlaege();
  kundenListe();
  formularFuellen();
  vorschauBald();
})();
