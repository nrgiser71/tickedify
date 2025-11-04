#!/usr/bin/env python3
"""
Security-sensitive information cleaner for Tickedify changelog.
Abstracts technical implementation details while keeping user-friendly descriptions.
"""

import re
import sys

def clean_changelog(content):
    """Clean security-sensitive information from changelog content."""

    # 1. API Endpoints - vervang exacte paths door beschrijvingen
    # Match any /api/... pattern with optional HTTP method prefix
    content = re.sub(r'(?:GET|POST|PUT|DELETE|PATCH)\s+<code>/api/[^<]+</code>', 'API endpoint', content)
    content = re.sub(r'<code>/api/[^<]+</code>', 'API endpoint', content)
    content = re.sub(r'(?:GET|POST|PUT|DELETE|PATCH)\s+/api/[\w\-/:\{\}]+', 'API endpoint', content)
    content = re.sub(r'/api/[\w\-/:\{\}\$]+', 'API endpoint', content)

    # Specific common patterns
    content = re.sub(r'DELETE endpoint', 'verwijder API', content)
    content = re.sub(r'PUT endpoint', 'update API', content)
    content = re.sub(r'POST endpoint', 'create API', content)
    content = re.sub(r'GET endpoint', 'data ophaal API', content)

    # 2. Database kolommen - verwijder specifieke kolom namen
    content = re.sub(r'\bverwijderd_op\b', 'verwijder timestamp kolom', content)
    content = re.sub(r'\bdefin(itief|iteif)_verwijderen_op\b', 'permanente verwijder timestamp kolom', content)
    content = re.sub(r'\blaatste_cleanup_op\b', 'cleanup timestamp kolom', content)
    content = re.sub(r'\blaatste_login\b', 'login timestamp kolom', content)
    content = re.sub(r'\blast_login\b', 'login timestamp kolom', content)
    content = re.sub(r'\bproject_id\b', 'project referentie', content)
    content = re.sub(r'\bcontext_id\b', 'context referentie', content)
    content = re.sub(r'\bactie_id\b', 'actie referentie', content)
    content = re.sub(r'\btaak_id\b', 'taak referentie', content)
    content = re.sub(r'\bafgewerkt\b', 'completed status', content)
    content = re.sub(r'\bvoltooid\b', 'completed status', content)
    content = re.sub(r'\bgeblokkeerd\b', 'blocked status', content)
    content = re.sub(r'\bverschijndatum\b', 'due date veld', content)
    content = re.sub(r'\bduur\b kolom', 'duration veld', content)
    content = re.sub(r'\bprioriteit\b kolom', 'priority veld', content)
    content = re.sub(r'\blijst\b kolom', 'lijst veld', content)

    # 3. Database tabellen
    content = re.sub(r'\btaken\b tabel', 'tasks database tabel', content)
    content = re.sub(r'\busers\b tabel', 'users database tabel', content)
    content = re.sub(r'\bdagelijkse_planning\b tabel', 'planning database tabel', content)
    content = re.sub(r'\bprojecten\b table', 'projects tabel', content)
    content = re.sub(r'\bcontexten\b table', 'contexts tabel', content)

    # 4. Index namen
    content = re.sub(r'\bidx_[\w_]+\b', 'database index', content)

    # 5. File paths en regelnummers - verwijder specifieke locaties
    content = re.sub(r'\bserver\.js[:\s]+(?:line\s+)?(\d+)', 'server-side logica', content)
    content = re.sub(r'\bapp\.js[:\s]+(?:line\s+)?(\d+)', 'frontend code', content)
    content = re.sub(r'\bdatabase\.js\b', 'database laag', content)
    content = re.sub(r'\bpublic/app\.js:\d+', 'frontend implementatie', content)
    content = re.sub(r'server-side logica-\d+', 'server-side logica', content)
    content = re.sub(r'\b(?:line|regel)\s+\d+', '', content)  # Remove generic line references
    content = re.sub(r'\(regel ~?\d+\)', '', content)
    content = re.sub(r'\(line ~?\d+\)', '', content)
    content = re.sub(r'\(\d+,\s*\d+,\s*\d+\)', '', content)  # Remove line number triplets

    # 6. Function namen - abstraheer technische details
    content = re.sub(r'\bparseEmailToTask\(\)', 'email parsing functie', content)
    content = re.sub(r'\bverwijderTaak\(\)', 'taak verwijder functie', content)
    content = re.sub(r'\brestoreNormalContainer\(\)', 'container restore functie', content)
    content = re.sub(r'\bcompletePlanningTask\(\)', 'taak completion handler', content)
    content = re.sub(r'\bfilterPlanningActies\(\)', 'filter functie', content)
    content = re.sub(r'\bfilterActies\(\)', 'filter functie', content)
    content = re.sub(r'\brenderPlanningActies\(\)', 'render functie', content)
    content = re.sub(r'\blaadHuidigeLijst\(\)', 'lijst refresh functie', content)
    content = re.sub(r'\blaadLijst\(\)', 'lijst load functie', content)
    content = re.sub(r'\btoonToast\(\)', 'toast notification', content)
    content = re.sub(r'\bcalculateNextRecurringDate\(\)', 'datum calculatie functie', content)
    content = re.sub(r'\bgetNext(?:Monthly|Yearly|Weekly)(?:Day|Date|Workday)\(\)', 'datum helper functie', content)
    content = re.sub(r'\bgetLastDayOf(?:Next)?(?:Month|Year)\(\)', 'laatste dag helper functie', content)
    content = re.sub(r'\bgetLastWorkdayOf(?:Next)?(?:Month|Year)\(\)', 'laatste werkdag helper functie', content)
    content = re.sub(r'\bfindOrCreateProject\(\)', 'project lookup/create', content)
    content = re.sub(r'\bfindOrCreateContext\(\)', 'context lookup/create', content)
    content = re.sub(r'\bparseDeferCode\(\)', 'defer code parser', content)
    content = re.sub(r'\bparsePriorityCode\(\)', 'priority parser', content)
    content = re.sub(r'\bparseKeyValue\(\)', 'key-value parser', content)
    content = re.sub(r'\btruncateAtEndMarker\(\)', 'tekst truncate functie', content)
    content = re.sub(r'\b(?:db\.)?getList\(\)', 'lijst query', content)
    content = re.sub(r'\b(?:db\.)?getDagelijksePlanning\(\)', 'planning query', content)
    content = re.sub(r'\b(?:db\.)?getTask\(\)', 'taak query', content)
    content = re.sub(r'\bstorageManager\.uploadFile\(\)', 'file upload functie', content)
    content = re.sub(r'\brequireAuth\b', 'authenticatie middleware', content)

    # 7. SQL queries en database operaties
    content = re.sub(r'WHERE [a-z_]+ IS NOT NULL', 'gefilterde database query', content)
    content = re.sub(r'WHERE [a-z_]+ IS NULL', 'gefilterde database query', content)
    content = re.sub(r'WHERE [a-z_]+ = [a-z]+', 'gefilterde database query', content)
    content = re.sub(r'CHECK constraint', 'database validatie', content)
    content = re.sub(r'DEFAULT NULL', 'standaard waarde', content)
    content = re.sub(r'INSERT INTO [\w_]+', 'database insert', content)
    content = re.sub(r'UPDATE [\w_]+', 'database update', content)
    content = re.sub(r'DELETE FROM [\w_]+', 'database delete', content)
    content = re.sub(r'SELECT [\*\w,\s]+FROM', 'database query van', content)
    content = re.sub(r'JSON LIKE pattern', 'JSON matching', content)
    content = re.sub(r'userId in JSON LIKE', 'user ID matching', content)
    content = re.sub(r'%"[\w]+":[^%]+%', 'JSON patroon', content)
    content = re.sub(r'COUNT\([^\)]+\)', 'telling query', content)
    content = re.sub(r'schema issues', 'database structuur problemen', content)

    # 8. Externe services - abstraheer technische details
    content = re.sub(r'\b4\.5MB\b payload', 'payload size limit', content)
    content = re.sub(r'\bBackblaze B2\b', 'cloud storage', content)
    content = re.sub(r'\bB2 (?:upload|file|API|attachment|cloud)\b', 'cloud storage', content, flags=re.IGNORECASE)
    content = re.sub(r'\bB2\b', 'cloud storage', content)
    content = re.sub(r'\bMailgun\b', 'email service', content)
    content = re.sub(r'\bVercel\b(?! MCP| serverless| cache| deployment)', 'hosting platform', content, flags=re.IGNORECASE)
    content = re.sub(r'\bPostgreSQL\b', 'database', content)
    content = re.sub(r'\bNeon\b(?! database)', 'database provider', content, flags=re.IGNORECASE)

    # 9. Session en authenticatie details
    content = re.sub(r'\b500ms interval\b', 'korte interval', content)
    content = re.sub(r'polls (?:/api/auth/me )?every 500ms', 'controleert authenticatie status periodiek', content)
    content = re.sub(r'session is valid', 'sessie gevalideerd is', content)
    content = re.sub(r'webhook validatie', 'webhook security', content)

    # 10. Class namen en properties
    content = re.sub(r'\bTaakbeheer\b class', 'task management class', content)
    content = re.sub(r'\bOnboardingVideoManager\b', 'onboarding component', content)
    content = re.sub(r'\bAuthManager\b', 'authenticatie component', content)
    content = re.sub(r'\bStorageManager\b', 'storage component', content)
    content = re.sub(r'\bDbTools\.\w+\(\)', 'database utility methode', content)
    content = re.sub(r'\bSystemActions\.\w+\(\)', 'systeem actie', content)
    content = re.sub(r'\bAPI\.\w+\.\w+\(\)', 'API client methode', content)
    content = re.sub(r'\bthis\.toonToast\(\)', 'toast notification methode', content)
    content = re.sub(r'\btoast\.(?:success|error|info)\(\)', 'toast notification', content)
    content = re.sub(r'\bupdateSidebarCounters\(\)', 'sidebar update functie', content)
    content = re.sub(r'\bparseInt\(\)', 'nummer parsing', content)

    # 11. Middleware en configuration details
    content = re.sub(r'\bmulter\b', 'file upload middleware', content)
    content = re.sub(r'\bupload\.any\(\)', 'file upload handler', content)
    content = re.sub(r'\buploadAttachment\.any\(\)', 'attachment upload handler', content)
    content = re.sub(r'\bmemory storage\b', 'in-memory buffer', content)
    content = re.sub(r'\bexpress\.static\b', 'static file serving', content)
    content = re.sub(r'\bvercel\.json\b', 'deployment configuratie', content)

    # 12. Test file details
    content = re.sub(r'\btest-herhalingen\.(?:js|html)\b', 'test utility', content)
    content = re.sub(r'\brecurring-date-calculator\.js\b', 'datum calculator module', content)
    content = re.sub(r'\bwindow\.app\b', 'frontend application object', content)

    # 13. Technische patterns - abstraheer
    content = re.sub(r'Date\.UTC\(\)', 'UTC datum constructie', content)
    content = re.sub(r'new Date\(Date\.UTC\([^\)]+\)\)', 'UTC datum object', content)
    content = re.sub(r'new Date\(\d+, \d+, \d+\)', 'datum object', content)
    content = re.sub(r'getUTC(?:FullYear|Month|Date|Day)\(\)', 'UTC datum getter', content)
    content = re.sub(r'setUTC(?:FullYear|Month|Date|Day)\(\)', 'UTC datum setter', content)
    content = re.sub(r'toISOString\(\)', 'ISO datum conversie', content)
    content = re.sub(r'setDate\(0\)', 'laatste dag berekening', content)
    content = re.sub(r'setTimeout', 'tijdsvertraging', content)
    content = re.sub(r'fade-out animatie', 'fade animatie', content)
    content = re.sub(r'opacity:0', 'verborgen element', content)

    # 14. Build en deployment details
    content = re.sub(r'Build timestamp', 'versie timestamp', content)
    content = re.sub(r'cache busting', 'cache refresh', content)
    content = re.sub(r'\'use strict\';', '', content)

    # 15. CDN en external resources
    content = re.sub(r'marked\.js library \(via CDN\)', 'markdown rendering library', content)
    content = re.sub(r'Prism\.js', 'syntax highlighting library', content)
    content = re.sub(r'FontAwesome', 'icon library', content)
    content = re.sub(r'fa-redo', 'herhaling icoon', content)
    content = re.sub(r'fa-question-circle', 'help icoon', content)

    # 16. Cleanup extra spaces from replacements
    content = re.sub(r'  +', ' ', content)
    content = re.sub(r'^ +', '', content, flags=re.MULTILINE)
    content = re.sub(r' +$', '', content, flags=re.MULTILINE)

    # 17. Remove empty list items that may have been created
    content = re.sub(r'<li>\s*</li>', '', content)

    return content

def main():
    input_file = "/Users/janbuskens/Library/CloudStorage/Dropbox/To Backup/Baas Over Je Tijd/Software/Tickedify/public/changelog.html"
    output_file = input_file  # Overwrite original

    # Read file
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Clean content
    cleaned = clean_changelog(content)

    # Write back
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(cleaned)

    print(f"✓ Changelog opgeschoond: {len(content)} → {len(cleaned)} bytes")
    print(f"✓ {input_file}")

if __name__ == '__main__':
    main()
