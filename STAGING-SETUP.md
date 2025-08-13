# Staging Environment Setup Guide

## Overzicht
Dit document beschrijft hoe je de staging environment van Tickedify opzet voor veilige development en testing voorafgaand aan de bèta launch.

## Branch Strategie

### Branch Structuur
```
main (PROTECTED) → tickedify.com (PRODUCTIE - BÈTA GEBRUIKERS)
├── staging → preview deployment (staging testing)
└── develop → development work (feature development)
```

### Workflow
1. **Development**: Alle work op `develop` branch
2. **Staging Test**: Merge naar `staging` → automatische preview deployment
3. **Production**: Pull Request van `staging` naar `main` (met approval)

## Vercel Deployment

### Automatische Deployments
- **Main branch** → tickedify.com (productie)
- **Staging branch** → automatische preview URL
- **Alle andere branches** → preview deployments

### Preview URL
Vercel genereert automatisch preview URLs voor staging branch:
- Format: `tickedify-git-staging-[username].vercel.app`
- Of custom domain: `dev.tickedify.com` (optioneel)

## Database Setup

### Staging Database (Aanbevolen)
1. **Neon Dashboard** → Create nieuwe database
2. **Connection String** kopiëren
3. **Vercel Environment Variables** → staging environment setup
4. **Schema Migration** → kopieer productie schema naar staging

### Environment Variables Setup
```bash
# In Vercel dashboard voor staging environment:
DATABASE_URL=postgresql://staging-connection-string
NODE_ENV=staging  
FORENSIC_DEBUG=true
ADMIN_PASSWORD=staging-specific-password
```

## Development Workflow

### Feature Development
```bash
# 1. Start development
git checkout develop
git pull origin develop

# 2. Create feature
# ... make changes ...
git add .
git commit -m "✨ New feature description"
git push origin develop

# 3. Test on staging
git checkout staging
git merge develop --no-ff
git push origin staging

# 4. Verify staging deployment
# Test on preview URL

# 5. Production deployment (with approval)
# Create PR: staging → main
# Wait for user approval
# Merge to deploy to production
```

### Emergency Hotfix
```bash
# 1. Create hotfix branch
git checkout main
git checkout -b hotfix/critical-bug-name

# 2. Implement fix
# ... fix the bug ...
git add .
git commit -m "🚨 HOTFIX: Critical bug description"

# 3. Test on staging
git checkout staging
git merge hotfix/critical-bug-name --no-ff
git push origin staging

# 4. Verify staging
# Test hotfix on preview URL

# 5. Request production approval
# "🚨 Hotfix getest op staging - klaar voor PRODUCTIE?"
# Wait for "JA, DEPLOY NAAR PRODUCTIE"

# 6. Create urgent PR
# Create PR: hotfix/critical-bug-name → main
# Merge after approval
```

## Safety Features

### Branch Protection
- **Main branch**: Protected tegen direct pushes
- **Pull Request required**: Voor alle main changes
- **Review required**: Minimaal 1 approval van Jan
- **Status checks**: Optionele CI/CD checks

### Automatic Safeguards
- **Vercel**: Alleen main branch deployt naar productie domain
- **Preview URLs**: Alle andere branches krijgen staging URLs
- **Database isolation**: Staging database apart van productie

### Manual Safeguards  
- **Git branch check**: Altijd controleren voor commits
- **Staging testing**: Verplicht testen voor productie
- **Explicit approval**: "JA, DEPLOY NAAR PRODUCTIE" vereist

## Custom Staging Domain (Optioneel)

### dev.tickedify.com Setup
1. **Vercel Dashboard** → Custom domain toevoegen
2. **DNS Settings** → CNAME record: `dev.tickedify.com` → Vercel
3. **Branch Assignment** → Assign `staging` branch to custom domain
4. **SSL Certificate** → Automatisch via Vercel

### Voordelen Custom Domain
- ✅ Consistente staging URL
- ✅ Eenvoudiger te onthouden
- ✅ Professional staging environment
- ✅ SSL certificate included

## Testing Checklist

### Voor Staging Deployment
- [ ] Feature werkt lokaal
- [ ] Git branch is develop of feature branch
- [ ] Commit message is descriptief
- [ ] Geen hardcoded productie URLs/data

### Voor Production Deployment
- [ ] Feature getest op staging preview URL
- [ ] Database migraties getest op staging database
- [ ] Email functionaliteit werkt op staging
- [ ] Error handling getest
- [ ] User approval verkregen: "JA, DEPLOY NAAR PRODUCTIE"

### Na Production Deployment
- [ ] Productie URL test (tickedify.com)
- [ ] Database integriteit check
- [ ] Error monitoring check
- [ ] User feedback verzamelen

## Troubleshooting

### Common Issues
1. **Preview deployment faalt** → Check build logs in Vercel dashboard
2. **Database connection errors** → Verify staging environment variables
3. **Email niet werkend** → Check Mailgun staging route setup
4. **SSL certificate issues** → Custom domain SSL regeneration

### Debug Commands
```bash
# Check current branch
git branch

# Check deployment status
curl -I https://staging-preview-url

# Test database connection
node -e "const db = require('./database.js'); db.testConnection();"
```

## Security Notes

### Staging Specific Security
- ✅ **Separate passwords**: Gebruik andere wachtwoorden voor staging
- ✅ **Test data**: Geen echte gebruiker data op staging
- ✅ **Debug logging**: Enable forensic debugging op staging
- ✅ **Environment isolation**: Staging env vars apart van productie

### Production Protection  
- ❌ **No direct access**: Staging team heeft geen productie access
- ❌ **No production data**: Staging database bevat geen echte gebruiker data
- ❌ **No auto-deployment**: Main branch deployment vereist manual approval

## Conclusie

Met deze staging setup krijg je:
- 🔒 **100% Bescherming** tegen accidentele productie deployments
- ⚡ **Snelle development** cycle op staging
- 🧪 **Volledige testing** capability voor alle features
- 🚀 **Betrouwbare productie** deployments na approval

De bèta gebruikers krijgen een stabiele ervaring terwijl development door kan gaan.