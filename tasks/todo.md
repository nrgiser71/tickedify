# Bug Fix: Inbox Counter Shows (1) But Inbox Is Empty

## Problem Analysis

**Symptom:** De sidebar toont "(1)" naast Inbox, maar de inbox is leeg.

**Root Cause:** Query mismatch tussen sidebar count en getList functie.

### Sidebar Count Query (server.js regel 7606-7615):
```sql
SELECT
    COUNT(CASE WHEN lijst = 'inbox' AND afgewerkt IS NULL THEN 1 END) as inbox,
    COUNT(CASE WHEN lijst = 'acties' AND afgewerkt IS NULL
        AND (verschijndatum IS NULL OR verschijndatum <= CURRENT_DATE) THEN 1 END) as acties,
    COUNT(CASE WHEN lijst = 'opvolgen' AND afgewerkt IS NULL THEN 1 END) as opvolgen,
    COUNT(CASE WHEN lijst LIKE 'uitgesteld-%' AND afgewerkt IS NULL THEN 1 END) as uitgesteld
FROM taken
WHERE user_id = $1
-- MIST: AND verwijderd_op IS NULL
```

### getList Query (database.js regel 757):
```sql
SELECT * FROM taken
WHERE user_id = $1
  AND lijst = $2
  AND afgewerkt IS NULL
  AND verwijderd_op IS NULL  -- <-- DEZE FILTER MIST IN SIDEBAR COUNT!
ORDER BY aangemaakt DESC
```

**Conclusie:** De sidebar count query telt ook soft-deleted taken (met `verwijderd_op IS NOT NULL`), terwijl de inbox lijst deze niet toont.

## Fix Plan

- [x] Analyseer de bug - root cause gevonden
- [ ] Fix de sidebar count query in server.js (regel 7614)
- [ ] Bump version in package.json
- [ ] Test de fix
- [ ] Commit en push naar staging

## Fix Details

De fix is simpel: voeg `AND verwijderd_op IS NULL` toe aan de WHERE clause van de sidebar count query.

**Voor:**
```sql
FROM taken
WHERE user_id = $1
```

**Na:**
```sql
FROM taken
WHERE user_id = $1 AND verwijderd_op IS NULL
```

Dit zorgt ervoor dat soft-deleted taken niet worden meegeteld in de sidebar counters.
