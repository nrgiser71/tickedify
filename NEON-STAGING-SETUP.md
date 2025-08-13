# Neon Staging Database Setup Guide

## Waarom Aparte Staging Database?

### Productie Bescherming
- ✅ **Geen data corruptie risico** - staging tests kunnen nooit live data beschadigen
- ✅ **Schema migration testing** - database wijzigingen eerst testen voor productie
- ✅ **Performance testing** - load testing zonder productie impact
- ✅ **Data privacy** - geen echte gebruiker data in development environment

### Development Freedom
- ✅ **Destructieve tests** - database resets, bulk deletes, schema drops
- ✅ **Test data experimenten** - grote hoeveelheden fake data voor testing
- ✅ **Migration rollbacks** - veilig testen van database downgrades
- ✅ **Integration testing** - end-to-end tests met database state changes

## Neon Staging Database Setup

### Stap 1: Nieuwe Database Aanmaken
1. **Login naar Neon Console:** https://console.neon.tech/
2. **Create New Project** of gebruik bestaand project
3. **Database Name:** `tickedify-staging`
4. **Region:** Same als productie voor consistency
5. **Compute:** Gebruik free tier (voldoende voor staging)

### Stap 2: Connection String Kopiëren
```
Neon geeft je een connection string zoals:
postgresql://username:password@ep-staging-123.region.aws.neon.tech/tickedify-staging?sslmode=require
```

### Stap 3: Schema Migration naar Staging
**Optie A: Manual Schema Copy**
```bash
# Export productie schema (zonder data)
pg_dump --schema-only $PRODUCTION_DATABASE_URL > schema.sql

# Import naar staging database  
psql $STAGING_DATABASE_URL < schema.sql
```

**Optie B: Run initDatabase() op Staging**
- Deploy staging met nieuwe DATABASE_URL
- De initDatabase() functie in database.js maakt automatisch alle tabellen aan
- Voordeel: garanties dat staging schema identiek is aan code expectations

### Stap 4: Vercel Environment Variables Setup
In Vercel dashboard voor staging environment:

```bash
# Primary database connection
DATABASE_URL=postgresql://staging-connection-string...

# Backup environment variables (for compatibility)
POSTGRES_URL=postgresql://staging-connection-string...
POSTGRES_PRISMA_URL=postgresql://staging-connection-string...
POSTGRES_URL_NON_POOLING=postgresql://staging-connection-string...

# Staging specific settings
NODE_ENV=staging
FORENSIC_DEBUG=true  # Enable detailed logging for staging
ADMIN_PASSWORD=staging-admin-password-different-from-prod
```

## Test Data Management

### Development Test Data
Voor realistic testing, maak basis test data:

```sql
-- Test gebruiker voor staging
INSERT INTO users (id, email, naam, wachtwoord_hash, rol) VALUES 
('test-user-1', 'test@example.com', 'Test Gebruiker', '$2a$12$hashedpassword', 'user');

-- Test taken in verschillende lijsten
INSERT INTO taken (id, naam, lijst, project, context, gebruiker_id) VALUES 
(1, 'Test Inbox Taak', 'inbox', 'Test Project', 'test', 'test-user-1'),
(2, 'Test Actie Taak', 'acties', 'Test Project', 'test', 'test-user-1'),
(3, 'Test Herhalende Taak', 'acties', 'Test Project', 'test', 'test-user-1');

-- Test herhalende taak
UPDATE taken SET 
  herhaling_type = 'weekly-1-1',
  herhaling_actief = true 
WHERE id = 3;
```

### Data Reset Script
Voor clean testing cycles:

```bash
#!/bin/bash
# reset-staging-data.sh

echo "🧹 Resetting staging database..."

# Connect to staging database
psql $STAGING_DATABASE_URL << EOF
-- Clear all data but keep schema
TRUNCATE TABLE taken RESTART IDENTITY CASCADE;
TRUNCATE TABLE users RESTART IDENTITY CASCADE;
TRUNCATE TABLE subtaken RESTART IDENTITY CASCADE;
TRUNCATE TABLE feedback RESTART IDENTITY CASCADE;

-- Re-insert test user
INSERT INTO users (id, email, naam, wachtwoord_hash, rol) VALUES 
('test-user-1', 'test@example.com', 'Test Gebruiker', 'placeholder-hash', 'user');

-- Re-insert basic test data
INSERT INTO taken (naam, lijst, project, gebruiker_id) VALUES 
('Test Inbox Taak', 'inbox', 'Test Project', 'test-user-1'),
('Test Actie Taak', 'acties', 'Test Project', 'test-user-1');

COMMIT;
EOF

echo "✅ Staging database reset complete"
```

## Staging Database Maintenance

### Weekly Reset Routine
```bash
# Scheduled reset voor clean testing (optioneel)
crontab -e
# Add: 0 9 * * 1 /path/to/reset-staging-data.sh
```

### Backup Strategy
```bash
# Periodic staging backup (voor rollback tijdens development)
pg_dump $STAGING_DATABASE_URL > staging-backup-$(date +%Y%m%d).sql
```

### Schema Sync Verification
```bash
# Compare staging vs production schema
pg_dump --schema-only $PRODUCTION_DATABASE_URL > prod-schema.sql
pg_dump --schema-only $STAGING_DATABASE_URL > staging-schema.sql
diff prod-schema.sql staging-schema.sql
```

## Environment Variable Management

### Local Development (.env.staging)
```bash
# Copy from .env.staging.example
cp .env.staging.example .env.staging

# Update with actual staging database URL
DATABASE_URL=postgresql://actual-staging-connection-string...
NODE_ENV=staging
FORENSIC_DEBUG=true
```

### Vercel Environment Setup
1. **Vercel Dashboard** → Project → Settings → Environment Variables
2. **Add variables for staging environment:**
   - Environment: Preview (staging branch)
   - DATABASE_URL: staging connection string
   - NODE_ENV: staging
   - FORENSIC_DEBUG: true

## Security Considerations

### Staging Security Best Practices
- ✅ **Geen productie data** - nooit echte gebruiker data kopiëren
- ✅ **Aparte passwords** - andere admin passwords voor staging
- ✅ **Test email adressen** - gebruik example.com email adressen
- ✅ **Debug logging** - forensic debugging enabled voor troubleshooting
- ✅ **Limited access** - staging database only accessible voor development

### Network Security
- ✅ **SSL enforced** - Neon enforces SSL by default
- ✅ **IP restrictions** (optioneel) - kan worden ingeschakeld in Neon console
- ✅ **Connection pooling** - Neon handles connection limits automatically

## Troubleshooting

### Common Database Issues

**Connection Timeouts:**
```bash
# Test staging database connection
psql $STAGING_DATABASE_URL -c "SELECT version();"
```

**Schema Out of Sync:**
```bash
# Re-run schema migration
node -e "const db = require('./database.js'); db.initDatabase();"
```

**Performance Issues:**
```bash
# Check staging database stats in Neon console
# Upgrade compute tier if needed (still free/cheap)
```

### Migration Issues
```bash
# Check if staging tables exist
psql $STAGING_DATABASE_URL -c "\dt"

# Check if columns are missing
psql $STAGING_DATABASE_URL -c "\d taken"
```

## Cost Management

### Neon Free Tier Limits
- **Storage:** 0.5 GB (voldoende voor staging)
- **Compute:** 100 hours/month (ruim voldoende)
- **Database branches:** 10 (we gebruiken er 2: prod + staging)

### Optimization Tips
- ✅ **Auto-suspend** - Neon suspend staging database automatisch bij inactiviteit
- ✅ **Minimal data** - Houd staging database klein met alleen test data
- ✅ **Regular cleanup** - Verwijder oude test data periodiek

## Implementation Checklist

### Setup Tasks
- [ ] Nieuwe Neon database aangemaakt voor staging
- [ ] Connection string gekopieerd en veilig opgeslagen
- [ ] Schema gemigreerd naar staging database
- [ ] Test data toegevoegd voor realistic testing
- [ ] Vercel environment variables geconfigureerd
- [ ] Staging deployment test uitgevoerd

### Verification Tasks
- [ ] Staging app connect naar staging database
- [ ] Geen cross-contamination met productie data
- [ ] All database operations werk op staging
- [ ] Schema changes getest op staging eerst
- [ ] Performance acceptable voor development use

### Maintenance Setup
- [ ] Data reset script gemaakt (optioneel)
- [ ] Backup procedure gedocumenteerd (optioneel)
- [ ] Schema sync verification process
- [ ] Access controls geconfigureerd

## Conclusie

Met een aparte staging database krijg je:
- 🔒 **100% Productie bescherming** tegen data corruption
- ⚡ **Volledige development freedom** voor destructieve testing
- 🧪 **Realistic testing environment** met echte database operations
- 🚀 **Betrouwbare schema migrations** getest voor productie deployment

De kleine extra setup tijd (30 minuten) voorkomt productie database disasters die uren/dagen kunnen kosten om te herstellen.