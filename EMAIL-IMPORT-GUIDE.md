# 📧 Tickedify Email Import System

## 🎯 Overzicht

Het Email Import systeem maakt het mogelijk om taken van Notion (of andere bronnen) naar Tickedify te sturen via email. Het systeem parseert emails intelligent en creëert automatisch taken met de juiste projecten, contexten en metadata.

## 🏗️ Subdomein Architectuur (Augustus 2025)

**Belangrijke Update:** Email import gebruikt nu een **subdomein systeem** voor gescheiden email routing:

- **Import emails:** `import+code@mg.tickedify.com` (via Mailgun)
- **Normale emails:** `hello@tickedify.com`, `support@tickedify.com` (via Vimexx)
- **Benefit:** Geen DNS conflicts tussen email systemen

**Alle import emails moeten nu naar `@mg.tickedify.com` gestuurd worden.**

## 📨 Email Formaat

### Subject Line Format
```
[Project] Task title @context #tag
```

**Voorbeelden:**
- `[Website] Fix login bug @development #urgent`
- `[Personal] Boodschappen doen @errands`
- `Review document @office #weekly`
- `Simple task without project or context`

### Email Body Format (Optioneel)

Je kunt gestructureerde data toevoegen in de email body:

```
Task description here...

Duur: 90 minuten
Deadline: 2025-06-25
Project: Website Redesign
Context: Development

Additional notes and details...
```

## 🔗 Mailgun Webhook Endpoint

**URL:** `https://tickedify.com/api/email/import`
**Method:** `POST`
**Content-Type:** `application/x-www-form-urlencoded`

Dit endpoint wordt gebruikt door Mailgun om emails door te sturen naar Tickedify.

## 🧪 Test Endpoint (Development)

**URL:** `https://tickedify.com/api/email/test`
**Method:** `POST`
**Content-Type:** `application/json`

```json
{
  "subject": "[Test] My task @context #tag",
  "body": "Task description\n\nDuur: 60 minuten\nDeadline: 2025-06-25",
  "sender": "test@example.com"
}
```

## 🎛️ Notion Setup

### Stap 1: Database Properties Toevoegen

Voeg deze properties toe aan je Notion database:

1. **📤 Send to Tickedify** (Checkbox) - Trigger voor export
2. **✅ Exported** (Checkbox) - Status tracking  
3. **🔗 Tickedify ID** (Text) - Link naar geïmporteerde taak

### Stap 2: Notion Automation Configureren

**Trigger:** When "📤 Send to Tickedify" is checked
**Action:** Send email

**Email Template:**
```
To: import@mg.tickedify.com
Subject: [{{Project}}] {{Title}} @{{Context}}

{{Description}}

Duur: {{Duration}} minuten
Deadline: {{Due Date}}
Project: {{Project}}
Context: {{Context}}

---
Notion: {{URL}}
Status: {{Status}}
```

### Stap 3: Automation Cleanup

**Additional Action:** 
- Set "📤 Send to Tickedify" = FALSE
- Set "✅ Exported" = TRUE

## 📊 Parsing Logic

### Subject Line Parsing

| Pattern | Voorbeeld | Resultaat |
|---------|-----------|-----------|
| `[Project]` | `[Website]` | Project: "Website" |
| `@context` | `@development` | Context: "development" |
| `#tag` | `#urgent` | Tag: "urgent" (future use) |
| Rest | `Fix login bug` | Task title |

### Body Parsing

| Field | Pattern | Voorbeeld |
|-------|---------|-----------|
| Duration | `Duur: X minuten` | `Duur: 90 minuten` |
| Deadline | `Deadline: YYYY-MM-DD` | `Deadline: 2025-06-25` |
| Project | `Project: Name` | `Project: Website Redesign` |
| Context | `Context: Name` | `Context: Development` |

## ✅ Voorbeelden

### Voorbeeld 1: Volledig Gestructureerd
```
Subject: [Website] Fix homepage login @development #urgent

Er is een bug gevonden op de homepage login functie.

Duur: 90 minuten
Deadline: 2025-06-25
Context: Development

Deze bug verhindert users om in te loggen en moet snel opgelost worden.
```

**Resultaat:**
- Task: "Fix homepage login" + body content
- Project: "Website"
- Context: "development" (van subject) → "Development" (van body heeft voorrang)
- Duration: 90 minuten
- Deadline: 2025-06-25

### Voorbeeld 2: Simpel
```
Subject: Review presentation slides @office

Presentation for client meeting tomorrow needs review.
```

**Resultaat:**
- Task: "Review presentation slides" + body content
- Context: "office"
- Lijst: "inbox"

### Voorbeeld 3: Alleen Body Structuur
```
Subject: Client meeting prep

Project: Sales
Context: Office
Duur: 60 minuten
Deadline: 2025-06-20

Prepare materials for the client presentation tomorrow.
```

**Resultaat:**
- Task: "Client meeting prep" + body description
- Project: "Sales"
- Context: "Office"
- Duration: 60 minuten
- Deadline: 2025-06-20

## 🔒 Mailgun Setup (Voor Admin)

### 1. Mailgun Account
- Sign up at mailgun.com
- Verify domain: mg.tickedify.com
- Get API key en webhook signing key

### 2. DNS Configuration
```
MX Record: mg.tickedify.com → 10 mxa.mailgun.org
TXT Record: mg.tickedify.com → v=spf1 include:mailgun.org ~all
CNAME: email.mg.tickedify.com → mailgun.org (DKIM)
```

### 3. Webhook Configuration
- URL: `https://tickedify.com/api/email/import`
- Events: `delivered`, `failed`, `rejected`
- HTTP Method: POST

### 4. Email Routing
Setup route in Mailgun:
```
Priority: 1
Filter: match_recipient("^import\\+(.*)@mg.tickedify.com$")
Action: forward("https://tickedify.com/api/email/import")
```

## 🐛 Troubleshooting

### Email Niet Ontvangen
1. Check Mailgun logs
2. Verify webhook URL is correct
3. Check DNS configuration
4. Test met `/api/email/test` endpoint

### Parsing Errors
1. Use test endpoint to debug parsing
2. Check console logs in Vercel
3. Verify email format matches expected pattern

### Task Niet Aangemaakt
1. Check database connection
2. Verify required fields are present
3. Check server logs voor error messages

## 📈 Usage Statistics

Het systeem tracked automatisch:
- Import success rate
- Popular projects/contexts
- Parse errors
- Volume per dag

Check logs in Vercel dashboard voor gedetailleerde statistics.

## 🚀 Toekomstige Features

- **Auto-confirmation emails** (Mailgun sending setup)
- **Bi-directional sync** (Tickedify updates → Notion)
- **Multiple email addresses** voor verschillende workflows
- **AI-powered categorization** voor betere project/context detection
- **Attachment support** voor documents en images