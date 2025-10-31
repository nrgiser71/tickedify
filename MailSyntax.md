1. Doel en scope

Doel. Gebruikers sturen ontvangen e-mails door naar hun uniek Tickedify-importadres. Door een instructieregel op de eerste regel van de body te plaatsen, kunnen zij extra velden zetten. Zonder instructieregel blijft het huidige gedrag ongewijzigd.

In scope.
	•	Detectie en parsing van instructieregel die start met @t
	•	Toepassen van codes voor project, due date, context, prioriteit, duur en defer
	•	Automatisch afknippen van body na --end-- (case-insensitive), ongeacht het gebruik van @t
	•	Automatisch aanmaken van contexten en projecten
	•	Geen bevestigingsmails
	•	Genereren van een uitgebreide helpfile in Markdown

Out of scope.
	•	Bijlagen verwerken of opslaan
	•	Subject-prefix stripping
	•	Tijdzoneondersteuning en tijd parsing
	•	Tags of andere velden dan hieronder gespecificeerd
	•	Verdere securitylogica dan het reeds unieke importadres per gebruiker

2. Gebruikersverhalen
	1.	Als gebruiker wil ik met een korte instructieregel bovenaan de e-mail extra taakvelden zetten, zodat ik met minimale frictie taken kan verrijken bij het doorsturen.
	2.	Als gebruiker wil ik dat Tickedify niets speciaals doet wanneer ik geen @t gebruik, zodat het huidige gedrag blijft werken.
	3.	Als gebruiker wil ik dat alles na --end-- niet in de notities komt, zodat handtekeningen of privacygevoelige stukken niet worden opgeslagen.
	4.	Als gebruiker wil ik geen e-mailbevestigingen ontvangen, zodat mijn inbox niet vervuild raakt.
	5.	Als gebruiker wil ik dat onbekende contexten en projecten automatisch worden aangemaakt, zodat ik niet eerst de taxonomie hoef te beheren.

3. Trigger en plaatsing
	•	De eerste niet-lege regel van de body moet beginnen met @t om parsing te activeren.
	•	Er wordt niet verder gezocht naar @t als die regel ontbreekt.
	•	@t zonder parameters is niet geldig als trigger voor parsing. In dat geval volgt standaardgedrag.

4. Instructiesyntaxis
	•	De instructies staan op één regel.
	•	Parameters worden gescheiden door puntkomma ; en puntkomma is verplicht als er meerdere parameters zijn.
	•	Sleutels zijn case-insensitive. Spaties rond sleutels en waarden worden getrimd.
	•	Formaat per parameter: key: waarde of vaste codes zonder waarde (bij prioriteit en defer, zie hieronder).

4.1 Ondersteunde codes
	•	p: projectnaam
	•	c: contextnaam
	•	d: due date als ISO datum YYYY-MM-DD
	•	t: duur in minuten; alleen integer, geen suffixen
	•	Prioriteit: p1, p2, p3
	•	Mapping en normalisatie:
	•	p1 = High
	•	p2 = Medium
	•	p3 = Low
	•	p0 interpreteren als High
	•	p4 of groter interpreteren als Low
	•	Defer shortcuts, enkel actief met dubbelepunt en zonder waarde:
	•	df Defer to Follow-up
	•	dw = Defer to Weekly
	•	dm = Defer to Monthly
	•	d3m = Defer to Quarterly
	•	d6m = Defer to Bi-annual
	•	dy = Defer to Yearly

4.2 Belangrijke logica
	•	Defer-codes hebben absolute voorrang. Zodra een defer-code aanwezig is, worden alle andere codes genegeerd, inclusief project, context, due, prioriteit en duur.
	•	Elke code mag maximaal één keer tellen. Bij dubbele codes telt de eerste en worden volgende duplicaten genegeerd.
	•	Alle velden zijn optioneel. Volgorde is vrij.
	•	Onjuiste of onbekende codes worden stil genegeerd. De taak wordt aangemaakt met wat geldig was.

4.3 Voorbeelden
@t p: Klant X; c: Werk; d: 2025-11-03; p1; t: 30;
@t c: Thuis; p: Huis; d: 2025-12-01;
@t dm; p: Project Y; c: Wachten;   ← dm: aanwezig, rest wordt genegeerd
@t p2; p: Langlopend; d: 2025-11-03; ← p2 zet prioriteit, project en due gelden ook
@t p4; d: 2025-11-03;               ← p4 wordt Low

5. Body-verwerking en --end--
	•	--end-- wordt case-insensitive herkend, bijvoorbeeld --END--.
	•	Alles na de eerste voorkomst van --end-- wordt genegeerd en niet in de notities opgeslagen.
	•	--end-- zelf wordt niet opgenomen.
	•	Deze regel geldt altijd, dus ook wanneer er geen @t werd gebruikt.
	•	Buiten --end-- wordt de body ongefilterd opgeslagen zoals ontvangen, conform huidige gedrag.

6. Entiteiten en defaults
	•	Project en context worden, indien opgegeven en niet bestaand, automatisch aangemaakt.
	•	Due date ondersteunt uitsluitend ISO datum YYYY-MM-DD. Bij foutieve of niet-ondersteunde formaten wordt due weggelaten zonder foutmelding.
	•	Duur t: accepteert alleen numerieke minuten. Negatief of niet-numeriek wordt genegeerd.
	•	Prioriteit wordt genormaliseerd zoals in 4.1 beschreven.

7. Onderwerp en titel
	•	Onderwerp blijft exact zoals ontvangen. Er is geen prefix-stripping of token-parsing in het onderwerp.
	•	De taaknaam blijft de onderwerpregel in de huidige vorm.

8. Security en routing
	•	Elke gebruiker heeft een uniek importadres. Alle e-mails die naar dat adres worden gestuurd, komen in de juiste account terecht. Geen extra afzendercontrole vereist in deze feature.

9. Foutafhandeling en feedback
	•	Geen e-mailbevestigingen of foutmails naar de gebruiker.
	•	Parsingfouten leiden niet tot falen. Onleesbare onderdelen worden genegeerd en wat wel geldig is, wordt toegepast.
	•	Idempotentie en duplicates blijven conform huidig platformgedrag.

10. Prestatie en betrouwbaarheid
	•	Parsing is O(n) in lengte van de eerste regel en eerste doorloop van body voor --end--.
	•	Tolerant voor verschillende mailclients. Geen afhankelijkheid van quote-headers of signature-markers.

11. Testgevallen

11.1 Positieve tests
	1.	@t p: A; c: Werk; d: 2025-11-03; p1; t: 45
Verwacht: project A aangemaakt of gekoppeld, context Werk idem, due 2025-11-03, prioriteit High, duur 45.
	2.	@t dm: gevolgd door andere codes
Verwacht: defer Monthly actief, overige codes genegeerd.
	3.	@t p4; d: 2025-12-01
Verwacht: prioriteit Low, due gezet.
	4.	@t p0; c: Thuis
Verwacht: prioriteit High, context Thuis.
	5.	@t c: Wachten op leverancier; p: Klant X
Verwacht: context en project aangemaakt of gekoppeld, spaties behouden.

11.2 Negatieve en randgevallen
	6.	@t alleen
Verwacht: geen parsing, standaardgedrag.
	7.	@t d: 03/11/2025;
Verwacht: due genegeerd wegens niet ISO, taak wordt aangemaakt met overige geldige velden.
	8.	@t t: abc;
Verwacht: duur genegeerd.
	9.	@t p: A; p: B; c: C;
Verwacht: project A gebruikt, project B genegeerd, context C gebruikt.
	10.	@t c: Werk met body die --END-- bevat
Verwacht: context Werk toegepast, body geknipt bij --END-- case-insensitive.
	11.	@t p1; p2; p3;
Verwacht: eerste prioriteitscode p1 geldt, rest genegeerd.
	12.	@t dw; met due en context
Verwacht: defer Weekly actief, due en context genegeerd.
	13.	Geen @t, maar --end-- in body
Verwacht: knip toegepast ondanks ontbreken van @t.

12. Implementatiedetails

12.1 Detectie en lexing
	•	Lees de body en bepaal de eerste niet-lege regel.
	•	Als die begint met @t gevolgd door spatie of einde regel, activeer parser.
	•	Instructieregel: splits op puntkomma ;. Trim elk segment.
	•	Voor elk segment:
	•	Test op defer-codes met puntkomma: ^(df|dw|dm|d3m|d6m|dy)\s*;\s*$ case-insensitive.
	•	Test op prioriteitscode: ^p(\d+)$ en normaliseer 0 naar 1 en 4+ naar 3.
	•	Test op sleutel-waarde: ^(p|c|d|t)\s*:\s*(.+)$ case-insensitive.
	•	Zodra een defer is gedetecteerd, markeer een vlag en negeer verdere segmenten.

12.2 Normalisatie en validatie
	•	p: en c: nemen waarde zoals getrimd. Lege waarden negeren.
	•	d: accepteert uitsluitend regex ^\d{4}-\d{2}-\d{2}$.
	•	t: accepteert uitsluitend integer ^\d+$.
	•	Duplicaten tracken per sleutel. Eerste instantie wint.

12.3 Body-knip
	•	Zoek in de volledige body de eerste case-insensitive match op exact --end--.
	•	Verwijder vanaf de match tot het einde. Verwijder de marker zelf.
	•	De instructieregel zelf wordt niet in de notities opgenomen.

12.4 Creatie entiteiten
	•	Als p: of c: geldig is en niet bestaat, maak entiteit automatisch aan en koppel.
	•	Defer-codes mappen naar interne defer-lijst. Implementatie van de mapping gebeurt in code conform bestaande modellen.

13. UI en documentatie
	•	Voeg in de UI bij het importadres een korte instructie:
	•	Voorbeeld:
Zet bovenaan je e-mail: @t p: Projectnaam; c: Werk; d: 2025-11-03; p2; t: 30
	•	Tip: --end-- knipt de rest van de body weg.
	•	Helpfile (.md) verplicht als onderdeel van deze feature:
	•	Uitleg van het doel, plaatsing, volledige syntaxis, voorbeelden, fouttolerantie, defer-voorrang, --end-- gebruik, veelgestelde vragen en troubleshooting.

14. Acceptatiecriteria
	•	Wanneer @t de eerste niet-lege regel is en syntaxis correct wordt gebruikt, worden de bedoelde velden geplaatst conform deze PRD.
	•	Bij aanwezigheid van een defer-code met dubbelepunt worden alle andere codes genegeerd.
	•	--end-- knipt altijd de body, ongeacht het gebruik van @t.
	•	Zonder @t werkt alles exact zoals nu.
	•	Onjuiste of niet-ondersteunde invoer veroorzaakt geen fouten of e-mailnotificaties.
	•	Projecten en contexten worden automatisch aangemaakt.
	•	Helpfile in Markdown is aanwezig en dekt alle onderdelen van deze PRD.

15. Non-functional
	•	Parser is performant en robuust op grote bodies.
	•	Gedrag is identiek op desktop en mobiel e-mailclients.
	•	Logging op debug-niveau voor geparste keys en normalisaties, zonder inhoud van de mail te loggen.