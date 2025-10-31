# Tickedify Email Import Syntax Help

## Quick Start

Stuur een email door naar je persoonlijke import adres met een `@t` instructie op de eerste regel:

```
@t p: Mijn Project; c: Werk; d: 2025-11-15; p1; t: 30;

Dit is de taak beschrijving.
Meerdere regels zijn mogelijk.
```

Dit maakt een taak aan met:
- **Project**: Mijn Project
- **Context**: Werk
- **Due date**: 15 november 2025
- **Prioriteit**: High
- **Duur**: 30 minuten

## Syntax Overzicht

### Basis Formaat

```
@t code1; code2; code3;
```

- Plaats `@t` op de **eerste niet-lege regel** van de email body
- Scheid codes met puntkomma `;`
- Volgorde is vrij
- Spaties worden automatisch verwijderd

### Ondersteunde Codes

| Code | Beschrijving | Voorbeeld |
|------|--------------|-----------|
| `p:` | Project naam | `p: Klant X` |
| `c:` | Context naam | `c: Werk` |
| `d:` | Due date (ISO formaat) | `d: 2025-12-01` |
| `t:` | Duur in minuten | `t: 45` |
| `p0-p9` | Prioriteit code | `p1` of `p2` of `p3` |
| `a:` | **Bijlage (attachment)** | `a:contract` of `a:pdf` |
| `df` | Defer to Follow-up | `df;` |
| `dw` | Defer to Weekly | `dw;` |
| `dm` | Defer to Monthly | `dm;` |
| `d3m` | Defer to Quarterly | `d3m;` |
| `d6m` | Defer to Bi-annual | `d6m;` |
| `dy` | Defer to Yearly | `dy;` |

## Voorbeelden

### Voorbeeld 1: Complete Taak

```
@t p: Website Redesign; c: Werk; d: 2025-11-20; p1; t: 120;

Bespreek nieuwe wireframes met designteam.
Review feedback van stakeholders.
```

→ Project, context, deadline, prioriteit High, 120 minuten

### Voorbeeld 2: Defer to Monthly

```
@t dm;

Follow up met klant over contract verlenging.
```

→ Taak naar Monthly lijst (alle andere codes worden genegeerd bij defer!)

### Voorbeeld 3: Minimaal

```
@t c: Thuis; p2;

Boodschappen doen
```

→ Alleen context en prioriteit Medium

### Voorbeeld 4: Met Bijlage (Feature 049)

```
@t p: Contract Review; a:contract;

Bijgevoegde contract nakijken en feedback geven.
```

**Bijlage**: contract.pdf (of contract-final.pdf, klant_contract.docx, etc.)
→ Slimme matching: `a:contract` vindt bestanden met "contract" in de naam
→ Prioriteit: Exact match > Begint met > Bevat

### Voorbeeld 5: Type-Based Attachment Filtering

```
@t c: Admin; a:pdf;

Verwerk de bijgevoegde factuur.
```

→ `a:pdf` matcht het **eerste PDF bestand** in de email
→ Handig als je weet dat het om een PDF gaat maar de exacte naam niet weet

### Voorbeeld 6: Email met Files maar ZONDER `a:` Code

```
@t p: Project X; c: Werk;

Quick question over project.

(Email bevat signature.png als bijlage)
```

→ **Geen bijlage verwerkt** - signature.png wordt NIET opgeslagen
→ Opt-in bescherming: alleen `a:` code activeert bijlage verwerking
→ Beschermt je storage quota tegen ongewenste signature images

### Voorbeeld 7: Zonder @t (Backwards Compatible)

```
[Project X] Nieuwe taak @werk

Dit werkt nog steeds zoals voorheen.
Project: Ander Project
Duur: 30
```

→ Oude syntax blijft gewoon werken!

## Prioriteit Codes

| Code | Prioriteit | Kleur |
|------|-----------|-------|
| `p0` | High | 🔴 |
| `p1` | High | 🔴 |
| `p2` | Medium | 🟡 |
| `p3` | Low | 🟢 |
| `p4+` | Low | 🟢 |

**Voorbeeld**: `@t p1; d: 2025-11-10;` → High priority taak met deadline

## Defer Codes (Absolute Voorrang!)

**BELANGRIJK**: Wanneer je een defer code gebruikt, worden ALLE andere codes genegeerd.

```
@t dm; p: Project X; c: Werk; d: 2025-12-01;
```

→ Taak gaat naar **Monthly lijst**
→ Project, context en due date worden **GENEGEERD**

**Waarom?** Deferred taken hebben nog geen specifieke details nodig - je wilt ze gewoon uit je hoofd hebben tot een later moment.

### Alle Defer Shortcuts

| Code | Defer Lijst | Wanneer Reviewen |
|------|-------------|------------------|
| `df` | Follow-up | Volgende review moment |
| `dw` | Weekly | Elke week |
| `dm` | Monthly | Elke maand |
| `d3m` | Quarterly | Elk kwartaal |
| `d6m` | Bi-annual | Elk half jaar |
| `dy` | Yearly | Elk jaar |

## Body Truncatie met --end--

Gebruik `--end--` om alles daarna weg te knippen (handig voor handtekeningen):

```
@t c: Werk; p2;

Meeting notes hier.

--END--

Met vriendelijke groet,
Jan Buskens
jan@tickedify.com
```

→ Taak notes bevatten ALLEEN "Meeting notes hier."
→ Handtekening wordt NIET opgenomen

**Let op**:
- `--end--` werkt **case-insensitive**: `--END--`, `--End--`, `--end--` allemaal OK
- Werkt **zonder @t**: Ook oude emails kunnen --end-- gebruiken
- Alles **na** `--end--` wordt verwijderd

## Validatie Regels

### Due Date

✅ **Geldig**: `d: 2025-12-01` (ISO formaat YYYY-MM-DD)
❌ **Ongeldig**: `d: 01/12/2025`, `d: December 1`, `d: 2025-12`

→ Ongeldige dates worden **genegeerd** (taak wordt wel aangemaakt)

### Duur

✅ **Geldig**: `t: 30`, `t: 120`, `t: 5`
❌ **Ongeldig**: `t: 30.5`, `t: half uur`, `t: -15`

→ Ongeldige waardes worden **genegeerd**

### Project & Context

✅ **Altijd geldig**: Elke tekst is OK
✅ **Spaties behouden**: `p: Klant X Project Y` → "Klant X Project Y"
✅ **Auto-creatie**: Nieuwe projecten/contexten worden automatisch aangemaakt

## Duplicaten

Bij dubbele codes telt de **eerste**, rest wordt genegeerd:

```
@t p: Project A; p: Project B; c: Context 1; c: Context 2;
```

→ Project: **Project A** (eerste)
→ Context: **Context 1** (eerste)
→ Project B en Context 2 worden **genegeerd**

## Edge Cases

### @t Zonder Parameters

```
@t

Taak beschrijving
```

→ Wordt behandeld alsof er **geen** @t is
→ Valt terug op standaard parsing

### Lege Waardes

```
@t p: ; c: Werk;
```

→ Project wordt genegeerd (lege waarde)
→ Context werkt wel

### Onbekende Codes

```
@t xyz: waarde; c: Werk;
```

→ `xyz:` wordt **genegeerd**
→ Context werkt wel
→ **Geen foutmelding** - taak wordt aangemaakt

## Veelgestelde Vragen

**Q: Kan ik @t ergens anders plaatsen dan de eerste regel?**
A: Nee, @t moet op de eerste niet-lege regel staan.

**Q: Werken oude emails nog?**
A: Ja! Emails zonder @t werken exact zoals voorheen. `[Project]` en `@context` in subject, `Project:` en `Context:` in body blijven werken.

**Q: Wat als ik een fout maak in de syntax?**
A: De taak wordt gewoon aangemaakt met de codes die wél correct zijn. Ongeldige codes worden genegeerd.

**Q: Krijg ik een bevestiging dat het gelukt is?**
A: Nee, Tickedify stuurt geen bevestigingsmails om je inbox niet te vervuilen. Check gewoon je Inbox in Tickedify.

**Q: Kan ik meerdere prioriteiten opgeven?**
A: Je kunt meerdere codes gebruiken, maar alleen de eerste telt. `p1; p2; p3;` → High (p1)

**Q: Moet ik puntkomma na de laatste code?**
A: Nee, maar het mag wel. `@t c: Werk;` en `@t c: Werk` werken beide.

**Q: Hoeveel bijlagen kan ik per email versturen?**
A: Maximum **1 bijlage** per email wordt verwerkt. Dit beschermt je storage quota.

**Q: Welke bestandstypes worden ondersteund?**
A: PDF, Word, Excel, afbeeldingen (JPG/PNG/GIF), ZIP, en plain text. Max **4.5MB** per bestand.

**Q: Wat gebeurt er als ik geen `a:` code gebruik maar wel bijlagen verstuur?**
A: Niets! De bijlagen worden genegeerd (opt-in protection). Alleen met `a:` code worden bijlagen verwerkt.

## Bijlagen Verwerking (Feature 049)

### Hoe Werkt Het?

Voeg `a:zoekterm;` toe aan je @t syntax om een bijlage te koppelen aan de taak:

```
@t p: Contract Review; a:contract;

Review de bijgevoegde contract en geef feedback.

(Bijgevoegd: client_contract_final.pdf)
```

→ De bijlage wordt automatisch gekoppeld aan de taak
→ Je kunt de bijlage later downloaden vanuit Tickedify

### Smart Matching met Prioriteiten

Tickedify gebruikt **slimme filename matching** met 3 prioriteitsniveaus:

1. **Exact Match** (hoogste prioriteit):
   - `a:contract;` matcht `contract.pdf` (exact)
   - `a:invoice;` matcht `invoice.docx` (exact zonder extensie)

2. **Starts-With Match**:
   - `a:contract;` matcht `contract-final.pdf` (begint met "contract")
   - `a:rapport;` matcht `rapport_2025_Q1.xlsx` (begint met "rapport")

3. **Contains Match** (laagste prioriteit):
   - `a:contract;` matcht `client_contract_v2.pdf` (bevat "contract")
   - `a:factuur;` matcht `klant_factuur_dec.pdf` (bevat "factuur")

**Als meerdere bestanden matchen**: Exact match wint altijd, daarna starts-with, en dan contains.

### Type-Based Filtering

Zoek op bestandstype in plaats van naam:

```
@t a:pdf;        → Eerste PDF bestand
@t a:docx;       → Eerste Word document
@t a:xlsx;       → Eerste Excel bestand
@t a:png;        → Eerste PNG afbeelding
```

→ Handig als je de exacte bestandsnaam niet weet
→ Matcht het **eerste** bestand van dat type

### Opt-In Bescherming

**Belangrijk**: Bijlagen worden ALLEEN verwerkt met `a:` code!

```
# MET a: code - bijlage wordt verwerkt
@t p: Project; a:document;
(Bijgevoegd: document.pdf)  ✅ Wordt opgeslagen

# ZONDER a: code - bijlage wordt NIET verwerkt
@t p: Project;
(Bijgevoegd: signature.png)  ❌ Wordt NIET opgeslagen
```

→ Beschermt tegen ongewenste signature images
→ Voorkomt onnodig storage quota verbruik
→ Je hebt altijd controle

### Bestandsgrootte Limieten

- **Max bestand**: 4.5MB per bijlage
- **Storage quota**: 100MB totaal (gratis tier)
- **Aantal bijlagen**: Max 1 per email

Als bestand te groot is:
→ Taak wordt toch aangemaakt
→ Bijlage wordt NIET opgeslagen
→ Melding in server logs

### Bijlage Troubleshooting

**Bijlage wordt niet gekoppeld:**
- ✅ Heb je `a:` code gebruikt in @t syntax?
- ✅ Klopt de zoekterm met de bestandsnaam?
- ✅ Is het bestand kleiner dan 4.5MB?
- ✅ Check of het bestandstype ondersteund wordt

**Verkeerde bijlage gekoppeld:**
- ✅ Meerdere bestanden matchen? Gebruik specifiekere zoekterm
- ✅ Exact match heeft voorrang - check bestandsnamen
- ✅ Gebruik volledige bestandsnaam voor exact match

**Voorbeelden van goede zoektermen:**
```
a:contract;        # Generiek, vindt veel bestanden
a:contract_v3;     # Specifiek, vindt exacte versie
a:2025-01-invoice; # Zeer specifiek met datum
```

## Troubleshooting

### Taak wordt niet aangemaakt

- ✅ Check je import email adres (moet je persoonlijke code bevatten)
- ✅ Controleer of je vanaf het juiste email adres stuurt
- ✅ Kijk in je Tickedify Inbox of de taak er staat

### @t wordt niet herkend

- ✅ Staat @t op de **eerste niet-lege regel**?
- ✅ Is er een **spatie** na @t? (`@t ` niet `@t`)
- ✅ Gebruik je puntkomma tussen codes?

### Codes worden genegeerd

- ✅ Heb je een **defer code** gebruikt? (die negeert alle andere codes)
- ✅ Check je syntax: `p: waarde` (met spatie na `:`)
- ✅ Bij due date: gebruik ISO formaat `YYYY-MM-DD`
- ✅ Bij duur: gebruik alleen cijfers (minuten)

### Project/Context worden niet gekoppeld

- ✅ Controleer spelling (hoofdlettergevoelig)
- ✅ Nieuwe projecten/contexten worden automatisch aangemaakt
- ✅ Check in Tickedify of ze er zijn

## Tips & Tricks

### Standaard Template

Maak een email template in je email client:

```
@t p: [PROJECT]; c: [CONTEXT]; p2;

[TAAK BESCHRIJVING]

--END--
```

### Mobile Gebruik

Op mobiel: gebruik simpele codes om snel te zijn:

```
@t c: Werk; p1;

Korte taak beschrijving
```

### Batch Import

Doorsturen van meerdere emails werkt prima - elke email wordt een aparte taak.

### Signature Protection

Voeg `--END--` toe aan je email signature om automatisch alles daarna weg te knippen:

```
Meeting notes

--END--
Met vriendelijke groet,
[Signature]
```

---

**Vragen?** Email naar jan@tickedify.com of check de [Tickedify documentatie](https://tickedify.com).
