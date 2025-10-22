#!/usr/bin/env python3
"""
Safe UI Translation Script for Tickedify
Translates ONLY display text, preserves ALL HTML attributes
"""

import re
import sys

# Translation dictionary - Dutch to English
TRANSLATIONS = {
    # Common UI terms
    'Taak': 'Task',
    'Taken': 'Tasks',
    'taak': 'task',
    'taken': 'tasks',
    'Nieuwe': 'New',
    'nieuwe': 'new',
    'Toevoegen': 'Add',
    'toevoegen': 'add',
    'Annuleren': 'Cancel',
    'annuleren': 'cancel',
    'Opslaan': 'Save',
    'opslaan': 'save',
    'Verwijderen': 'Delete',
    'verwijderen': 'delete',
    'Bewerken': 'Edit',
    'bewerken': 'edit',
    'Sluiten': 'Close',
    'sluiten': 'close',

    # Messages
    'Fout': 'Error',
    'fout': 'error',
    'Gelukt': 'Success',
    'gelukt': 'success',
    'Waarschuwing': 'Warning',
    'waarschuwing': 'warning',
    'Let op': 'Warning',
    'Probeer opnieuw': 'Try again',
    'probeer opnieuw': 'try again',

    # Task operations
    'toegevoegd': 'added',
    'verwijderd': 'deleted',
    'bijgewerkt': 'updated',
    'opgeslagen': 'saved',
    'afgewerkt': 'completed',
    'verplaatst': 'moved',
    'gekopieerd': 'copied',
    'gewijzigd': 'changed',

    # Lists
    'Inbox': 'Inbox',
    'Acties': 'Actions',
    'Projecten': 'Projects',
    'Opvolgen': 'Follow-up',
    'opvolgen': 'follow-up',
    'Afgewerkt': 'Completed',
    'Afgewerkte': 'Completed',
    'afgewerkte': 'completed',
    'Uitgesteld': 'Deferred',
    'uitgesteld': 'deferred',
    'Wekelijks': 'Weekly',
    'wekelijks': 'weekly',
    'Maandelijks': 'Monthly',
    'maandelijks': 'monthly',
    '3-maandelijks': 'Quarterly',
    '6-maandelijks': 'Bi-annual',
    'Jaarlijks': 'Yearly',
    'jaarlijks': 'yearly',

    # Form labels
    'Naam': 'Name',
    'naam': 'name',
    'Project': 'Project',
    'project': 'project',
    'Context': 'Context',
    'context': 'context',
    'Prioriteit': 'Priority',
    'prioriteit': 'priority',
    'Datum': 'Date',
    'datum': 'date',
    'Duur': 'Duration',
    'duur': 'duration',
    'Herhaling': 'Recurrence',
    'herhaling': 'recurrence',
    'Opmerkingen': 'Notes',
    'opmerkingen': 'notes',
    'Notities': 'Notes',
    'notities': 'notes',
    'Subtaken': 'Subtasks',
    'subtaken': 'subtasks',
    'Bijlagen': 'Attachments',
    'bijlagen': 'attachments',

    # Actions
    'Plannen': 'Plan',
    'plannen': 'plan',
    'Instellen': 'Configure',
    'instellen': 'configure',
    'Selecteer': 'Select',
    'selecteer': 'select',
    'Kies': 'Choose',
    'kies': 'choose',
    'Zoeken': 'Search',
    'zoeken': 'search',

    # Time
    'Vandaag': 'Today',
    'vandaag': 'today',
    'Morgen': 'Tomorrow',
    'morgen': 'tomorrow',
    'Gisteren': 'Yesterday',
    'gisteren': 'yesterday',
    'Week': 'Week',
    'week': 'week',
    'Maand': 'Month',
    'maand': 'month',
    'Jaar': 'Year',
    'jaar': 'year',

    # Days
    'Maandag': 'Monday',
    'Dinsdag': 'Tuesday',
    'Woensdag': 'Wednesday',
    'Donderdag': 'Thursday',
    'Vrijdag': 'Friday',
    'Zaterdag': 'Saturday',
    'Zondag': 'Sunday',
    'Ma': 'Mon',
    'Di': 'Tue',
    'Wo': 'Wed',
    'Do': 'Thu',
    'Vr': 'Fri',
    'Za': 'Sat',
    'Zo': 'Sun',

    # Months
    'januari': 'January',
    'februari': 'February',
    'maart': 'March',
    'april': 'April',
    'mei': 'May',
    'juni': 'June',
    'juli': 'July',
    'augustus': 'August',
    'september': 'September',
    'oktober': 'October',
    'november': 'November',
    'december': 'December',

    # Priority
    'Laag': 'Low',
    'laag': 'low',
    'Gemiddeld': 'Medium',
    'gemiddeld': 'medium',
    'Hoog': 'High',
    'hoog': 'high',

    # Status
    'Actief': 'Active',
    'actief': 'active',
    'Inactief': 'Inactive',
    'inactief': 'inactive',
    'Voltooid': 'Completed',
    'voltooid': 'completed',

    # Common phrases
    'Geen project': 'No project',
    'Geen herhaling': 'No recurrence',
    'Geen context': 'No context',
    'Alle taken': 'All tasks',
    'Nieuwe taak': 'New task',
    'Taak plannen': 'Plan task',

    # Misc
    'Inloggen': 'Log in',
    'Uitloggen': 'Log out',
    'Registreren': 'Register',
    'Wachtwoord': 'Password',
    'wachtwoord': 'password',
    'Email': 'Email',
    'email': 'email',
    'Gebruiker': 'User',
    'gebruiker': 'user',
}

def translate_string_safely(content):
    """
    Translate only display text, never HTML attributes
    Uses word boundaries to avoid partial matches
    """
    result = content

    # Sort by length (longest first) to avoid partial replacements
    sorted_translations = sorted(TRANSLATIONS.items(), key=lambda x: len(x[0]), reverse=True)

    for dutch, english in sorted_translations:
        # Pattern: match the Dutch word within quotes, with word boundaries
        # This ensures we don't match partial words or HTML attributes
        pattern = r'(["\'])([^"\']*\b' + re.escape(dutch) + r'\b[^"\']*)(["\'])'

        def replacer(match):
            quote = match.group(1)
            text = match.group(2)
            close_quote = match.group(3)

            # Replace the Dutch word with English
            translated_text = re.sub(r'\b' + re.escape(dutch) + r'\b', english, text)
            return quote + translated_text + close_quote

        result = re.sub(pattern, replacer, result)

    return result

def main():
    if len(sys.argv) != 3:
        print("Usage: python translate_ui.py <input_file> <output_file>")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]

    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            content = f.read()

        translated = translate_string_safely(content)

        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(translated)

        print(f"✅ Translation complete: {input_file} -> {output_file}")

    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
