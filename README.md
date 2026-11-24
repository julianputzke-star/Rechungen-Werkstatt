# Werkstatt-Rechnungen – Putzke KFZ-Technik

Ein Rechnungsprogramm für KFZ-Werkstätten. Es läuft komplett im Browser, auch ohne Internet, und erstellt jede Rechnung als A4-PDF.

## Starten

1. Den Ordner herunterladen (bei GitHub: „Code“ → „Download ZIP“) und entpacken.
2. **`index.html` doppelt anklicken.** Das Programm öffnet sich im Browser (Chrome, Edge oder Firefox).
3. Beim ersten Start unter **Einstellungen** einmal Steuernummer, Bankverbindung, E-Mail und Stundensatz eintragen (und optional ein Logo hochladen).

Man muss nichts installieren und braucht keinen Server. Tipp: Ein Lesezeichen auf die `index.html` anlegen.

## Funktionen

- **Briefkopf** mit Firmendaten (voreingestellt: Putzke KFZ-Technik Meisterbetrieb, Waldheimstr. 18, 82166 Gräfelfing, +49 151 28940312), optional mit Logo
- **Halterdaten**: Anrede, Firma, Name, Anschrift, Telefon, E-Mail
- **Fahrzeugdaten**: Kennzeichen, Hersteller, Modell, FIN, Erstzulassung, km-Stand, HSN/TSN, Motorcode, Annahmedatum
- **Positionen in drei Blöcken**, jeweils mit Zwischensumme:
  - *Arbeitslohn*: Arbeitszeit in Stunden × Stundensatz (Standardsatz aus den Einstellungen, pro Position änderbar)
  - *Ersatzteile*: Teile-Nr., Bezeichnung, Menge, Einheit, Einzelpreis
  - *Sonstiges*: Öl, Kleinmaterial, Entsorgung, Fremdleistungen usw.
  - Rabatt in % pro Position möglich. Die Spalte erscheint nur, wenn ein Rabatt vergeben wurde.
- **Summen**: Netto, MwSt. (Satz einstellbar), Rechnungsbetrag. Für Kleinunternehmer nach § 19 UStG gibt es einen Schalter.
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
| Summen | Nettobetrag, MwSt., Rechnungsbetrag (hervorgehoben) |
| Texte | Zahlungshinweis, Bemerkung, Dankes-/Gewährleistungstext |
| Unterschrift | Ort/Datum und Linie für Unterschrift und Stempel |
| Fußzeile | Inhaber, Kontakt, Bankverbindung, Steuernummer/USt-IdNr., Seitenzahl |

Pflichtangaben nach § 14 Abs. 4 UStG, die das Programm abdeckt: vollständiger Name und Anschrift von Werkstatt und Kunde, Steuernummer oder USt-IdNr., Rechnungsdatum, fortlaufende Rechnungsnummer, Menge und Art der Leistung, Leistungsdatum, Entgelt nach Steuersätzen, Steuersatz und Steuerbetrag (bzw. der Hinweis auf § 19 UStG). Fehlt eine Angabe, erscheint rechts im Programm ein Warnhinweis.

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
- `vendor/`: [jsPDF](https://github.com/parallax/jsPDF) 2.5.2 und [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable) 3.8.4 (MIT-Lizenz), lokal eingebunden, damit alles offline läuft
