/* PDF-Erzeugung für Werkstattrechnungen (A4, angelehnt an DIN 5008 Form B) */
(function (global) {
  'use strict';

  const ACCENT = [31, 58, 95];
  const GREY = [105, 115, 128];
  const LIGHT = [238, 242, 247];
  const L = 20, R = 190, W = R - L; // Ränder in mm
  const FOOTER_TOP = 272;           // Ab hier beginnt die Fußzeile

  const zahl = (v) => {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    const s = String(v ?? '').trim().replace(/\s/g, '');
    if (!s) return 0;
    // "1.234,56" -> 1234.56 ; "12.5" -> 12.5
    const norm = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
    const n = parseFloat(norm);
    return isFinite(n) ? n : 0;
  };
  const runde = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
  const euro = (n) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);
  const dez = (n, min = 2, max = 2) => new Intl.NumberFormat('de-DE', { minimumFractionDigits: min, maximumFractionDigits: max }).format(n);
  const datumDE = (iso) => {
    if (!iso) return '';
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
  };
  const plusTage = (iso, tage) => {
    const d = iso ? new Date(iso + 'T12:00:00') : new Date();
    d.setDate(d.getDate() + (parseInt(tage, 10) || 0));
    return d.toISOString().slice(0, 10);
  };

  /** Berechnet alle Positions- und Gesamtsummen. */
  function berechne(inv, s) {
    const posBetrag = (menge, preis, rabatt) => runde(zahl(menge) * zahl(preis) * (1 - zahl(rabatt) / 100));
    const arbeiten = (inv.arbeiten || []).map((a) => ({ ...a, gesamt: posBetrag(a.std, a.satz, a.rabatt) }));
    const teile = (inv.teile || []).map((t) => ({ ...t, gesamt: posBetrag(t.menge, t.preis, t.rabatt) }));
    const sonstiges = (inv.sonstiges || []).map((t) => ({ ...t, gesamt: posBetrag(t.menge, t.preis, t.rabatt) }));
    const sum = (arr) => runde(arr.reduce((a, p) => a + p.gesamt, 0));
    const lohn = sum(arbeiten), teileSumme = sum(teile), sonst = sum(sonstiges);
    const netto = runde(lohn + teileSumme + sonst);
    const klein = !!s.kleinunternehmer;
    const satz = klein ? 0 : zahl(s.mwst);
    const mwst = runde(netto * satz / 100);
    const stunden = arbeiten.reduce((a, p) => a + zahl(p.std), 0);
    return { arbeiten, teile, sonstiges, lohn, teileSumme, sonst, netto, satz, mwst, brutto: runde(netto + mwst), klein, stunden };
  }

  const leer = (p) => !String(p.bez || '').trim() && !zahl(p.preis) && !zahl(p.satz);

  function erstellePdf(inv, s) {
    const { jsPDF } = global.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const t = berechne(inv, s);
    const k = inv.kunde || {}, f = inv.fahrzeug || {};
    const firmaZeile = [s.firma, s.zusatz].filter(Boolean).join(' ');

    doc.setProperties({ title: `Rechnung ${inv.nr || ''}`, author: s.firma || '', creator: 'Werkstatt-Rechnungen' });

    // ---------- Kopf ----------
    let kopfX = L;
    if (s.logo) {
      try {
        const props = doc.getImageProperties(s.logo);
        const maxH = 20, maxW = 55;
        let w = maxW, h = (props.height / props.width) * w;
        if (h > maxH) { h = maxH; w = (props.width / props.height) * h; }
        doc.addImage(s.logo, L, 12, w, h);
        kopfX = L + w + 5;
      } catch (e) { /* ungültiges Logo ignorieren */ }
    }
    doc.setTextColor(...ACCENT);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(19);
    doc.text(s.firma || '', kopfX, 21);
    if (s.zusatz) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(s.zusatz, kopfX, 27.5);
    }
    doc.setTextColor(40);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const kontakt = [
      s.strasse,
      [s.plz, s.ort].filter(Boolean).join(' '),
      s.tel ? `Tel.: ${s.tel}` : '',
      s.email ? `E-Mail: ${s.email}` : '',
      s.web || '',
    ].filter(Boolean);
    kontakt.forEach((z, i) => doc.text(z, R, 15 + i * 4.3, { align: 'right' }));
    doc.setDrawColor(...ACCENT);
    doc.setLineWidth(0.6);
    doc.line(L, 37, R, 37);

    // ---------- Anschriftfeld ----------
    doc.setFontSize(7);
    doc.setTextColor(...GREY);
    const absender = [firmaZeile || s.firma, s.strasse, [s.plz, s.ort].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
    doc.text(absender, L, 50);
    doc.setLineWidth(0.15);
    doc.setDrawColor(...GREY);
    doc.line(L, 51, L + Math.min(doc.getTextWidth(absender), 85), 51);

    doc.setTextColor(20);
    doc.setFontSize(10.5);
    const name = [k.vorname, k.nachname].filter(Boolean).join(' ');
    const anrede = k.anrede && k.anrede !== 'Firma' ? k.anrede : '';
    const adresse = [
      k.firma,
      k.firma ? (name ? `${anrede ? anrede + ' ' : ''}${name}` : '') : (anrede || ''),
      k.firma ? '' : name,
      k.strasse,
      [k.plz, k.ort].filter(Boolean).join(' '),
    ].filter(Boolean);
    adresse.forEach((z, i) => doc.text(z, L, 57 + i * 5));

    // ---------- Infoblock rechts ----------
    const info = [
      ['Rechnungs-Nr.', inv.nr],
      ['Rechnungsdatum', datumDE(inv.datum)],
      ['Leistungsdatum', datumDE(inv.leistungsdatum || inv.datum)],
      ['Kunden-Nr.', inv.kundennr],
      ['Auftrags-Nr.', inv.auftragsnr],
    ].filter(([, v]) => v);
    doc.setFontSize(9);
    info.forEach(([lab, val], i) => {
      const y = 52 + i * 5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GREY);
      doc.text(lab, 128, y);
      doc.setTextColor(20);
      doc.setFont('helvetica', i === 0 ? 'bold' : 'normal');
      doc.text(String(val), R, y, { align: 'right' });
    });

    // ---------- Titel ----------
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...ACCENT);
    doc.text('Rechnung', L, 97);
    doc.setFontSize(11);
    doc.setTextColor(20);
    if (inv.nr) doc.text(`Nr. ${inv.nr}`, L + doc.getStringUnitWidth('Rechnung') * 16 / doc.internal.scaleFactor + 3, 97);

    // ---------- Fahrzeugdaten ----------
    let y = 101;
    const zeilen = [
      [['Amtl. Kennzeichen', f.kennzeichen, 1], ['Fahrzeug', [f.hersteller, f.modell].filter(Boolean).join(' '), 2], ['Fahrgestell-Nr. (FIN)', f.fin, 2]],
      [['Erstzulassung', f.ez, 1], ['km-Stand', f.km ? `${dez(zahl(f.km), 0, 0)} km` : '', 1], ['HSN / TSN', [f.hsn, f.tsn].filter(Boolean).join(' / '), 1], ['Motorcode', f.motor, 1], ['Fahrzeugannahme', datumDE(f.annahme), 1]],
    ];
    const zelle = W / 5, zeileH = 10.5;
    doc.setFillColor(...LIGHT);
    doc.setDrawColor(200, 207, 216);
    doc.setLineWidth(0.2);
    doc.rect(L, y, W, zeileH * 2, 'FD');
    doc.line(L, y + zeileH, R, y + zeileH);
    zeilen.forEach((reihe, ri) => {
      let x = L;
      reihe.forEach(([lab, val, span]) => {
        const yy = y + ri * zeileH;
        if (x > L) doc.line(x, yy, x, yy + zeileH);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...GREY);
        doc.text(lab, x + 2, yy + 3.8);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(20);
        const breite = zelle * span - 4;
        let txt = String(val || '–');
        while (doc.getTextWidth(txt) > breite && txt.length > 3) txt = txt.slice(0, -2) + '…';
        doc.text(txt, x + 2, yy + 8.4);
        x += zelle * span;
      });
    });
    y += zeileH * 2 + 6;

    // ---------- Einleitung ----------
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(20);
    const einl = doc.splitTextToSize(s.einleitung || '', W);
    if (einl.length && einl[0]) { doc.text(einl, L, y); y += einl.length * 4.6 + 2; }

    // ---------- Positionen ----------
    const allePos = [...t.arbeiten, ...t.teile, ...t.sonstiges].filter((p) => !leer(p));
    const zeigeRabatt = allePos.some((p) => zahl(p.rabatt) > 0);
    const zeigeNr = allePos.some((p) => String(p.nr || '').trim());
    const head = ['Pos', 'Art.-Nr.', 'Bezeichnung', 'Menge', 'Einh.', 'Einzelpreis'];
    if (zeigeRabatt) head.push('Rabatt');
    head.push('Gesamt');
    const nCols = head.length;
    const body = [];
    let pos = 0;
    const abschnitt = (titel, liste, map, summeLabel, summe) => {
      const daten = liste.filter((p) => !leer(p));
      if (!daten.length) return;
      body.push([{ content: titel, colSpan: nCols, styles: { halign: 'left', fontStyle: 'bold', textColor: ACCENT, fillColor: [255, 255, 255], cellPadding: { top: 2.6, bottom: 0.8, left: 1.5, right: 1.5 } } }]);
      daten.forEach((p) => {
        pos += 1;
        const r = map(p);
        const row = [String(pos), r.nr || '', r.bez || '', r.menge, r.einheit || '', euro(zahl(r.preis))];
        if (zeigeRabatt) row.push(zahl(p.rabatt) ? `${dez(zahl(p.rabatt), 0, 2)} %` : '');
        row.push(euro(p.gesamt));
        body.push(row);
      });
      body.push([
        { content: summeLabel, colSpan: nCols - 1, styles: { halign: 'right', fontStyle: 'bold', fillColor: [255, 255, 255] } },
        { content: euro(summe), styles: { halign: 'right', fontStyle: 'bold', fillColor: [255, 255, 255], lineWidth: { top: 0.3 }, lineColor: [120, 120, 120] } },
      ]);
    };
    abschnitt('Arbeitslohn', t.arbeiten,
      (a) => ({ nr: a.nr, bez: a.bez, menge: dez(zahl(a.std)), einheit: 'Std.', preis: a.satz }),
      'Summe Arbeitslohn', t.lohn);
    abschnitt('Ersatzteile', t.teile,
      (p) => ({ nr: p.nr, bez: p.bez, menge: dez(zahl(p.menge), 0, 2), einheit: p.einheit, preis: p.preis }),
      'Summe Ersatzteile', t.teileSumme);
    abschnitt('Sonstiges / Material', t.sonstiges,
      (p) => ({ nr: p.nr, bez: p.bez, menge: dez(zahl(p.menge), 0, 2), einheit: p.einheit, preis: p.preis }),
      'Summe Sonstiges', t.sonst);

    const colStyles = {
      0: { cellWidth: 9, halign: 'center' },
      1: { cellWidth: zeigeNr ? 22 : 0.01, fontSize: 7.5 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 12, halign: 'right' },
      4: { cellWidth: 12, fontSize: 8 },
      5: { cellWidth: 21, halign: 'right' },
    };
    if (zeigeRabatt) { colStyles[6] = { cellWidth: 13, halign: 'right' }; colStyles[7] = { cellWidth: 22, halign: 'right' }; }
    else colStyles[6] = { cellWidth: 22, halign: 'right' };

    doc.autoTable({
      startY: y,
      head: [head],
      body,
      theme: 'plain',
      margin: { left: L, right: 210 - R, top: 26, bottom: 297 - FOOTER_TOP + 4 },
      styles: { font: 'helvetica', fontSize: 9, cellPadding: { top: 1.1, bottom: 1.1, left: 1.5, right: 1.5 }, textColor: 20, overflow: 'linebreak', valign: 'top' },
      headStyles: { fillColor: ACCENT, textColor: 255, fontStyle: 'bold', fontSize: 8 },
      columnStyles: colStyles,
      didParseCell: (data) => {
        if (!zeigeNr && data.column.index === 1) { data.cell.text = []; data.cell.styles.cellPadding = 0; }
        if (data.section !== 'head') return;
        const i = data.column.index;
        if (i === 0) data.cell.styles.halign = 'center';
        else if (i === 3 || i >= 5) data.cell.styles.halign = 'right';
      },
      willDrawCell: (data) => {
        if (data.section === 'body' && data.row.raw.length === nCols) {
          doc.setDrawColor(225, 229, 235);
          doc.setLineWidth(0.15);
          doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
        }
      },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) folgeKopf(doc, s, inv);
      },
    });
    y = doc.lastAutoTable.finalY + 6;

    // ---------- Summenblock (Zwischensummen stehen bereits in der Tabelle) ----------
    y = platz(doc, y, t.klein ? 12 : 22, s, inv);
    const sx = 112;
    doc.setFontSize(9.5);
    doc.setTextColor(20);
    if (!t.klein) {
      doc.setFont('helvetica', 'bold');
      doc.text('Nettobetrag', sx, y); doc.text(euro(t.netto), R - 1.5, y, { align: 'right' }); y += 5;
      doc.setFont('helvetica', 'normal');
      doc.text(`zzgl. ${dez(t.satz, 0, 2)} % MwSt.`, sx, y); doc.text(euro(t.mwst), R - 1.5, y, { align: 'right' }); y += 3;
    }
    doc.setFillColor(...ACCENT);
    doc.rect(sx - 2, y, R - sx + 2, 8, 'F');
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Rechnungsbetrag', sx, y + 5.6);
    doc.text(euro(t.brutto), R - 1.5, y + 5.6, { align: 'right' });
    y += 15;

    // ---------- Texte ----------
    doc.setTextColor(20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    const texte = [];
    if (t.klein) texte.push('Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.');
    if (!inv.leistungsdatum) texte.push('Das Leistungsdatum entspricht dem Rechnungsdatum.');
    if (inv.zahlungsart === 'bar') texte.push('Der Rechnungsbetrag wurde in bar dankend erhalten.');
    else if (inv.zahlungsart === 'karte') texte.push('Der Rechnungsbetrag wurde per EC-/Kartenzahlung beglichen.');
    else {
      const ziel = parseInt(inv.zahlungsziel, 10);
      texte.push(ziel > 0
        ? `Bitte überweisen Sie den Rechnungsbetrag ohne Abzug bis zum ${datumDE(plusTage(inv.datum, ziel))} unter Angabe der Rechnungsnummer auf das unten genannte Konto.`
        : 'Der Rechnungsbetrag ist sofort ohne Abzug fällig. Bitte geben Sie bei der Überweisung die Rechnungsnummer an.');
    }
    const bloecke = [texte.join('\n')];
    if (inv.bemerkung) bloecke.push(inv.bemerkung);
    if (s.schlusstext) bloecke.push(s.schlusstext);
    bloecke.forEach((b, i) => {
      if (!b.trim()) return;
      const lines = doc.splitTextToSize(b.trim(), W);
      y = platz(doc, y, lines.length * 4.4 + 2, s, inv);
      doc.text(lines, L, y);
      y += lines.length * 4.4 + 2.5;
    });

    // ---------- Unterschrift / Stempel ----------
    if (inv.unterschrift || inv.kundenunterschrift) {
      y = platz(doc, y + 3, 30, s, inv);
      const linieY = y + 20; // Platz für Stempel über der Linie
      const ortDatum = [s.ort, datumDE(inv.datum)].filter(Boolean).join(', ');
      doc.setDrawColor(60);
      doc.setLineWidth(0.25);
      const label = (txt, x) => { doc.setFontSize(7.5); doc.setTextColor(...GREY); doc.text(txt, x, linieY + 4); doc.setTextColor(20); };
      if (inv.kundenunterschrift) {
        doc.line(L, linieY, L + 72, linieY);
        label('Fahrzeug ordnungsgemäß übernommen – Datum, Unterschrift Kunde', L);
      } else {
        doc.setFontSize(9.5);
        doc.text(ortDatum, L, linieY - 1.5);
        doc.line(L, linieY, L + 65, linieY);
        label('Ort, Datum', L);
      }
      if (inv.unterschrift) {
        const x0 = R - 72;
        doc.line(x0, linieY, R, linieY);
        label(inv.kundenunterschrift ? `${ortDatum} – Unterschrift / Stempel` : 'Unterschrift / Stempel', x0);
      }
      y = linieY + 8;
    }

    // ---------- Fußzeile auf allen Seiten ----------
    const seiten = doc.getNumberOfPages();
    for (let i = 1; i <= seiten; i++) {
      doc.setPage(i);
      fusszeile(doc, s, i, seiten);
    }
    return doc;
  }

  /** Prüft, ob genug Platz bis zur Fußzeile ist, sonst neue Seite. */
  function platz(doc, y, hoehe, s, inv) {
    if (y + hoehe > FOOTER_TOP - 4) {
      doc.addPage();
      folgeKopf(doc, s, inv);
      return 32;
    }
    return y;
  }

  function folgeKopf(doc, s, inv) {
    const fs = doc.getFontSize();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...ACCENT);
    doc.text([s.firma, s.zusatz].filter(Boolean).join(' '), L, 15);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GREY);
    doc.setFontSize(9);
    doc.text(`Rechnung Nr. ${inv.nr || ''} – Fortsetzung`, R, 15, { align: 'right' });
    doc.setDrawColor(...ACCENT);
    doc.setLineWidth(0.4);
    doc.line(L, 18, R, 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fs);
    doc.setTextColor(20);
  }

  function fusszeile(doc, s, seite, seiten) {
    doc.setDrawColor(...ACCENT);
    doc.setLineWidth(0.3);
    doc.line(L, FOOTER_TOP, R, FOOTER_TOP);
    const spalten = [
      [[s.firma, s.zusatz].filter(Boolean).join(' '), s.inhaber ? `Inhaber: ${s.inhaber}` : '', s.strasse, [s.plz, s.ort].filter(Boolean).join(' ')],
      [s.tel ? `Tel.: ${s.tel}` : '', s.email ? `E-Mail: ${s.email}` : '', s.web],
      [s.bank, s.iban ? `IBAN: ${s.iban}` : '', s.bic ? `BIC: ${s.bic}` : ''],
      [s.steuernr ? `Steuernummer: ${s.steuernr}` : '', s.ustid ? `USt-IdNr.: ${s.ustid}` : ''],
    ];
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...GREY);
    const breiten = [44, 40, 46, 40]; // Summe = 170 mm
    let x = L;
    spalten.forEach((sp, i) => {
      let yy = FOOTER_TOP + 4;
      sp.filter(Boolean).forEach((z) => {
        doc.splitTextToSize(z, breiten[i] - 1.5).forEach((line) => { doc.text(line, x, yy); yy += 3.3; });
      });
      x += breiten[i];
    });
    doc.text(`Seite ${seite} von ${seiten}`, R, 291, { align: 'right' });
  }

  global.RechnungPDF = { erstellePdf, berechne, zahl, euro, dez, datumDE, plusTage, runde };
})(window);
