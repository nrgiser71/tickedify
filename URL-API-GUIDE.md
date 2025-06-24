# Tickedify URL API Guide

## Quick Add Tasks via URL

Je kunt taken toevoegen aan Tickedify via een simpele URL. Perfect voor Siri Shortcuts, automations, en andere integraties.

### Basis URL
```
https://tickedify.com/api/v1/quick-add
```

### Verplichte Parameters
- `code` - Je persoonlijke import code (dezelfde als voor email import)
- `text` - De tekst van je taak

### Optionele Parameters
- `project` - Project naam (wordt aangemaakt als het niet bestaat)
- `context` - Context naam (wordt aangemaakt als het niet bestaat)
- `date` - Verschijndatum (formaat: YYYY-MM-DD)
- `duur` - Geschatte duur in minuten

### Voorbeelden

**Simpele taak:**
```
https://tickedify.com/api/v1/quick-add?code=jouw-code&text=Melk kopen
```

**Taak met project:**
```
https://tickedify.com/api/v1/quick-add?code=jouw-code&text=Presentatie voorbereiden&project=Werk
```

**Taak met context:**
```
https://tickedify.com/api/v1/quick-add?code=jouw-code&text=Email versturen&context=computer
```

**Taak met datum:**
```
https://tickedify.com/api/v1/quick-add?code=jouw-code&text=Cadeau kopen&date=2025-06-28
```

**Alles gecombineerd:**
```
https://tickedify.com/api/v1/quick-add?code=jouw-code&text=Report schrijven&project=Werk&context=kantoor&date=2025-06-25&duur=120
```

## Siri Shortcut Setup

1. Open de Shortcuts app op je iPhone
2. Maak een nieuwe shortcut
3. Voeg deze acties toe:
   - **Text** - Voor je taak input (of vraag om input)
   - **Text** - Je import code (eenmalig instellen)
   - **URL** - Bouw de URL:
     ```
     https://tickedify.com/api/v1/quick-add?code=[Import Code]&text=[Taak Text]
     ```
   - **Get Contents of URL** - Om de taak toe te voegen
   - **Show Result** (optioneel) - Om bevestiging te zien

### Voorbeeld Siri Shortcut

```
1. Ask for Text with "Wat wil je toevoegen?"
2. Text: "jouw-import-code-hier"
3. URL: https://tickedify.com/api/v1/quick-add?code=[Text]&text=[Provided Input]
4. Get Contents of URL
5. Show Result
```

## Je Import Code Vinden

1. Log in op Tickedify
2. Je import code staat in de header naast je email adres
3. Of kijk in je account settings

## Response Format

Bij succes krijg je:
```json
{
  "success": true,
  "message": "Task added successfully",
  "task": {
    "id": "task_123",
    "text": "Melk kopen",
    "project": null,
    "context": null,
    "date": null,
    "duration": null,
    "list": "inbox"
  }
}
```

Bij een fout:
```json
{
  "error": "Invalid import code",
  "hint": "Use your personal import code from Tickedify settings"
}
```

## Toekomstige Uitbreidingen

In de toekomst komen er meer URL endpoints voor:
- `/api/v1/quick-complete` - Taak afvinken
- `/api/v1/quick-list` - Taken ophalen
- `/api/v1/quick-plan` - Taak plannen voor vandaag

Stay tuned!