# GitHub Branch Protection Setup Instructions

## Waarom Dit Kritiek Is
- Tickedify gaat binnenkort naar bèta met echte gebruikers
- Main branch = LIVE productie omgeving
- Accidentele deployments kunnen bèta gebruiker vertrouwen beschadigen
- Branch protection voorkomt 99% van deployment accidents

## Branch Protection Rules Setup

### Stap 1: GitHub Repository Settings
1. Ga naar: https://github.com/nrgiser71/tickedify/settings/branches
2. Klik "Add branch protection rule"

### Stap 2: Main Branch Protection
**Branch name pattern:** `main`

**Protect matching branches - ENABLE:**
- ✅ **Require a pull request before merging**
  - ✅ Require approvals: `1`
  - ✅ Dismiss stale PR approvals when new commits are pushed
  - ✅ Require review from code owners
  
- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  
- ✅ **Restrict pushes that create files that exceed 100 MB**

- ✅ **Restrict pushes to matching branches**
  - This prevents ANY direct pushes to main branch
  
- ✅ **Do not allow bypassing the above settings**
  - This applies restrictions even to admins/repository owners

### Stap 3: Verify Protection
After setup, test the protection:

```bash
# This should FAIL after protection is enabled:
git checkout main
echo "test" > test-protection.txt
git add test-protection.txt
git commit -m "Test protection"
git push origin main  # <- This should be BLOCKED by GitHub
```

Expected response:
```
! [remote rejected] main -> main (protected branch hook declined)
error: failed to push some refs to 'https://github.com/nrgiser71/tickedify.git'
```

## Workflow After Protection

### Development Workflow
1. **ALL work on develop branch**
   ```bash
   git checkout develop
   # make changes...
   git add .
   git commit -m "Feature description"
   git push origin develop
   ```

2. **Staging testing**
   ```bash
   git checkout staging
   git merge develop --no-ff
   git push origin staging
   # Test on staging preview URL
   ```

3. **Production deployment**
   - Create Pull Request: staging → main
   - Wait for Jan's approval
   - Merge only after explicit "JA, DEPLOY NAAR PRODUCTIE"

### Emergency Hotfix Workflow
1. **Hotfix branch from main**
   ```bash
   git checkout main
   git checkout -b hotfix/critical-bug-description
   # fix the bug...
   git add .
   git commit -m "🚨 HOTFIX: Bug description"
   ```

2. **Test on staging first**
   ```bash
   git checkout staging
   git merge hotfix/critical-bug-description --no-ff
   git push origin staging
   # Test hotfix on staging preview URL
   ```

3. **Production after approval**
   - Create Pull Request: hotfix/critical-bug-description → main
   - Ask: "🚨 Hotfix getest op staging - klaar voor PRODUCTIE?"
   - Wait for "JA, DEPLOY NAAR PRODUCTIE"
   - Merge after approval

## Benefits van Branch Protection

### Absolute Safety
- ✅ **0% kans** op accidentele main pushes
- ✅ **Forced staging testing** voor alle changes
- ✅ **Manual approval required** voor productie deployments
- ✅ **Emergency hotfixes** nog steeds mogelijk binnen 15 minuten

### Development Efficiency  
- ✅ **Freedom op develop/staging** zonder productie risico
- ✅ **Automatic preview deployments** voor testing
- ✅ **Clear approval process** - geen verwarring over deployment status
- ✅ **Git history protection** - geen geforceerde rewrites mogelijk

### Bèta User Protection
- ✅ **Stable production environment** voor bèta gebruikers
- ✅ **Reliable user experience** verhoogt conversie kansen
- ✅ **Professional deployment process** toont betrouwbaarheid
- ✅ **Confident feature development** zonder live user impact

## Troubleshooting

### "Protected branch hook declined" error
**Oorzaak:** Je probeert direct naar main te pushen
**Oplossing:** Gebruik Pull Request workflow
```bash
git checkout develop  # Switch away from main
# Create PR via GitHub interface
```

### "Branch not up to date" error  
**Oorzaak:** Main branch heeft nieuwere commits
**Oplossing:** Update je branch eerst
```bash
git checkout staging
git merge main --no-ff
git push origin staging
# Then create PR
```

### Emergency deployment needed
**Proces:** 
1. Hotfix branch → staging test → ask approval
2. "🚨 Kritieke bug - hotfix getest op staging - DEPLOY NAAR PRODUCTIE?"
3. Wacht op "JA, DEPLOY NAAR PRODUCTIE"
4. Create urgent PR met "URGENT HOTFIX" label

## Verification Checklist

After setting up branch protection, verify:
- [ ] Direct push to main fails
- [ ] Pull Request creation works
- [ ] Staging preview deployments work
- [ ] PR merge requires approval
- [ ] Main branch shows "protected" badge in GitHub

## Implementation Status

**Current status:**
- [x] Branches created (main, staging, develop)
- [x] CLAUDE.md deployment rules updated
- [x] Staging test page deployed
- [ ] **GitHub branch protection rules setup** ← NEXT STEP
- [ ] Workflow testing and verification

**Jan's Action Required:**
Please set up the GitHub branch protection rules following the steps above. This is the final step to make the staging workflow 100% secure for bèta launch.