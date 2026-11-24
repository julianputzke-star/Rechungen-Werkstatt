# Werkstatt-Rechnungen – Putzke KFZ-Technik

Ein Rechnungsprogramm für KFZ-Werkstätten. Es läuft komplett im Browser, auch ohne Internet, und erstellt jede Rechnung als A4-PDF.

## Starten

### Variante A: Am Computer direkt aus dem Ordner
1. Den Ordner herunterladen (bei GitHub: „Code“ → „Download ZIP“) und entpacken.
2. **`index.html` doppelt anklicken.** Das Programm öffnet sich im Browser (Chrome, Edge oder Firefox).
3. Tipp: Eine Verknüpfung zur `index.html` auf den Desktop legen.

### Variante B: Als App installieren (Computer, Handy, Tablet)
Dafür muss das Programm unter einer Internetadresse liegen, z. B. über GitHub Pages. Danach:
- **Windows/Mac (Chrome oder Edge):** Adresse öffnen und oben auf **„⬇ Als App installieren“** oder auf das Installieren-Symbol in der Adressleiste klicken. Das Programm erscheint im Startmenü bzw. Dock.
- **iPhone/iPad (Safari):** Adresse öffnen, **Teilen** → **„Zum Home-Bildschirm“**.
- **Android (Chrome):** Adresse öffnen, Menü **⋮** → **„App installieren“** bzw. „Zum Startbildschirm hinzufügen“.

Die installierte App funktioniert danach auch **ohne Internet**. Ist Internet da, lädt sie Updates automatisch.

### Beim ersten Start
Unter **Einstellungen** Bankverbindung, E-Mail, Stundensatz und optional Steuernummer und Logo eintragen.

**Wichtig:** Die Daten liegen auf jedem Gerät getrennt. Handy und PC sehen nicht automatisch dieselben Rechnungen. Zum Übertragen unter **Archiv → Sicherung herunterladen** auf dem einen Gerät und **Sicherung einspielen** auf dem anderen.

## Funktionen

- **Briefkopf** mit Firmendaten (voreingestellt: Putzke KFZ-Technik Meisterbetrieb, Waldheimstr. 18, 82166 Gräfelfing, +49 151 28940312), optional mit Logo
- **Halterdaten**: Anrede, Firma, Name, Anschrift, Telefon, E-Mail
- **Fahrzeugdaten**: Kennzeichen, Hersteller, Modell, FIN, Erstzulassung, km-Stand, HSN/TSN, Motorcode, Annahmedatum
- **Positionen in drei Blöcken**, jeweils mit Zwischensumme:
  - *Arbeitslohn*: Arbeitszeit in Stunden × Stundensatz (Standardsatz aus den Einstellungen, pro Position änderbar)
  - *Ersatzteile*: Teile-Nr., Bezeichnung, Menge, Einheit, Einzelpreis
  - *Sonstiges*: Öl, Kleinmaterial, Entsorgung, Fremdleistungen usw.
  - Rabatt in % pro Position möglich. Die Spalte erscheint nur, wenn ein Rabatt vergeben wurde.
- **Kleinunternehmer nach § 19 UStG** (voreingestellt): Die Rechnung zeigt nur den Gesamtbetrag, keine Umsatzsteuer, und trägt automatisch den vorgeschriebenen Hinweis. Wer später umsatzsteuerpflichtig wird, schaltet das in den Einstellungen um. Dann erscheinen Netto, MwSt. und Rechnungsbetrag. Jede Rechnung speichert ihren Steuerstatus, alte Rechnungen bleiben also unverändert.
- **Zahlungsart**: Überweisung (mit Fälligkeitsdatum), bar oder Karte. Der passende Text kommt automatisch auf die Rechnung.
- **Unterschrift und Stempel**: Feld unten auf der Rechnung, abschaltbar. Optional zusätzlich „Fahrzeug übernommen – Unterschrift Kunde“.
- **Live-Vorschau** des PDF neben dem Formular
- **Fortlaufende Rechnungsnummern** (z. B. `2026-0001`), mit Warnung bei doppelter Nummer
- **Archiv**: Rechnungen speichern, wieder öffnen, erneut als PDF ausgeben, als Vorlage kopieren, als bezahlt markieren
- **Stammkunden**: Halter- und Fahrzeugdaten aus früheren Rechnungen per Kennzeichen oder Name übernehmen
- **Vorschläge**: Bereits verwendete Arbeiten und Teile werden beim Tippen vorgeschlagen, samt Preis und Teile-Nr.
- **Datensicherung** als JSON-Datei (Export und Import)

## Aufbau der Rechnung

Das Layout folgt dem, was bei Werkstatt-Rechnungen in Deutschland üblich ist (Freie Werkstatt / Meisterbetrieb, Briefbogen nach DIN 5008):

| Bereich | Inhalt |
|---|---|
| Kopf | Firmenname, „Meisterbetrieb“, Anschrift, Telefon, E-Mail (optional Logo) |
| Anschriftfeld | Kleine Absenderzeile und Empfängeranschrift an der Position des Fensterkuverts (DIN 5008) |
| Infoblock rechts | Rechnungs-Nr., Rechnungsdatum, Leistungsdatum, Kunden-Nr., Auftrags-Nr. |
| Fahrzeugblock | Kennzeichen, Fahrzeug, FIN, EZ, km-Stand, HSN/TSN, Motorcode, Annahme |
| Positionen | Arbeitslohn, Ersatzteile, Sonstiges, jeweils mit Zwischensumme |
| Summen | Gesamtbetrag mit Hinweis „Gemäß § 19 UStG wird keine Umsatzsteuer berechnet“ (bei Regelbesteuerung: Netto, MwSt., Rechnungsbetrag) |
| Texte | Zahlungshinweis, Bemerkung, Dankes-/Gewährleistungstext |
| Unterschrift | Ort/Datum und Linie für Unterschrift und Stempel |
| Fußzeile | Inhaber, Kontakt, Bankverbindung, Steuernummer/USt-IdNr., Seitenzahl |

## Steuerliches (Kleinunternehmer)

Eine Rechnung eines Kleinunternehmers muss nach § 34a UStDV mindestens enthalten:

1. vollständigen Namen und Anschrift von Werkstatt **und** Kunde. Bei einem Einzelunternehmen gehört der Vor- und Nachname des Inhabers dazu, der Firmenname allein reicht nicht. Darum unbedingt das Feld **Inhaber** ausfüllen.
2. Ausstellungsdatum
3. Menge und Art der Teile bzw. Umfang und Art der Arbeiten
4. den Betrag und den **Hinweis auf die Steuerbefreiung nach § 19 UStG**

Das Programm setzt zusätzlich eine fortlaufende Rechnungsnummer, das Leistungsdatum und (falls eingetragen) die Steuernummer auf die Rechnung. Das ist nicht vorgeschrieben, aber üblich und sinnvoll. Fehlt eine Pflichtangabe, erscheint rechts im Programm ein Warnhinweis.

Wichtig:

- **Niemals Umsatzsteuer ausweisen.** Wer als Kleinunternehmer „MwSt.“ auf die Rechnung schreibt, schuldet sie dem Finanzamt trotzdem (§ 14c UStG).
- Die Beträge sind **Endbeträge**, keine Nettobeträge. Deshalb steht auf der Rechnung „Gesamtbetrag“ und nirgends „netto“ oder „brutto“.
- Teile werden inklusive MwSt. eingekauft, und Kleinunternehmer können sich diese Vorsteuer nicht erstatten lassen. Die Verkaufspreise der Teile also auf Basis des **Brutto-Einkaufspreises** kalkulieren.
- Umsatzgrenzen seit 2025: Vorjahr höchstens 25.000 €, laufendes Jahr höchstens 100.000 €. Bei mehr als 100.000 € im laufenden Jahr endet die Regelung sofort.
- E-Rechnung: Kleinunternehmer dürfen weiter PDF-Rechnungen schreiben, müssen aber E-Rechnungen von Lieferanten empfangen können.

Das ist keine Steuerberatung. Im Zweifel bitte kurz mit dem Steuerberater abstimmen.

## Wichtig zur Datenspeicherung

Alle Daten (Einstellungen, Archiv, aktueller Entwurf) liegen **nur im Browser auf diesem Computer**. Sie gehen nicht ins Internet. Deshalb:

- Regelmäßig unter **Archiv → Sicherung herunterladen** eine Sicherungsdatei anlegen.
- Wird der Browserverlauf mit „Website-Daten“ gelöscht, ist auch das Archiv weg. Die Sicherung lässt sich dann wieder einspielen.
- Die erstellten PDFs zusätzlich ablegen. Rechnungen müssen 8 Jahre aufbewahrt werden (§ 147 AO).

## Technik

- `index.html`: Oberfläche
- `app.js`: Formular, Archiv, Speicherung (localStorage)
- `pdf.js`: PDF-Layout
- `style.css`: Gestaltung
- `manifest.webmanifest`, `sw.js`, `icons/`: App-Installation und Offline-Betrieb
- `vendor/`: [jsPDF](https://github.com/parallax/jsPDF) 2.5.2 und [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable) 3.8.4 (MIT-Lizenz), lokal eingebunden, damit alles offline läuft
