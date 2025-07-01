# MindDump Waitlist Implementation Guide

## 🎯 Doel
Implementeer een complete waitlist landing page voor MindDump, gebaseerd op de succesvolle Tickedify waitlist infrastructuur, maar met MindDump-specifieke branding en content.

## 📋 Overzicht van Wat We Bouwen

### Technische Componenten (Hergebruik van Tickedify Pattern)
- **Database tabel** voor MindDump waitlist emails
- **API endpoints** voor signup en statistieken
- **Landing page** met responsive design
- **GoHighLevel integratie** voor email sequences
- **Form validatie** en error handling
- **Real-time statistieken** counter
- **Test endpoints** voor debugging

### MindDump-Specifieke Aanpassingen
- **Unieke branding** en messaging
- **MindDump feature cards** ipv Tickedify features
- **Aparte GoHighLevel tag** voor segmentatie
- **MindDump-specifieke content** en value proposition

## 🔧 Implementatie Stappen

### Stap 1: Database Schema
```sql
-- Voeg toe aan initDatabase() functie in database.js
CREATE TABLE IF NOT EXISTS minddump_waitlist (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    naam VARCHAR(255),
    aangemaakt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    referrer TEXT
);
```

### Stap 2: API Endpoints
Voeg toe aan `server.js` (na bestaande waitlist endpoints):

```javascript
// MindDump Waitlist API endpoints
app.post('/api/minddump-waitlist/signup', async (req, res) => {
    try {
        const { email, firstname, lastname, name } = req.body;
        
        // Basic email validation
        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'Geldig email adres is verplicht' });
        }
        
        // Get client info for tracking
        const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
        const userAgent = req.headers['user-agent'];
        const referrer = req.headers.referer || req.headers.referrer;
        
        // Insert into MindDump waitlist
        const result = await pool.query(
            'INSERT INTO minddump_waitlist (email, naam, ip_address, user_agent, referrer) VALUES ($1, $2, $3, $4, $5) RETURNING id, aangemaakt',
            [email.toLowerCase().trim(), name, ipAddress, userAgent, referrer]
        );
        
        console.log(`✅ New MindDump waitlist signup: ${email}`);
        
        // Add to GoHighLevel if API key is configured
        if (process.env.GHL_API_KEY) {
            try {
                const locationId = process.env.GHL_LOCATION_ID || 'FLRLwGihIMJsxbRS39Kt';
                
                // First, search for existing contact by email
                const searchResponse = await fetch(`https://services.leadconnectorhq.com/contacts/search/duplicate?locationId=${locationId}&email=${encodeURIComponent(email.toLowerCase().trim())}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
                        'Content-Type': 'application/json',
                        'Version': '2021-07-28'
                    }
                });

                let contactId = null;

                if (searchResponse.ok) {
                    const searchData = await searchResponse.json();
                    if (searchData.contact && searchData.contact.id) {
                        contactId = searchData.contact.id;
                        console.log(`📍 Found existing contact: ${contactId}`);
                    }
                }

                if (!contactId) {
                    // Create new contact
                    const createResponse = await fetch('https://services.leadconnectorhq.com/contacts/', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
                            'Content-Type': 'application/json',
                            'Version': '2021-07-28'
                        },
                        body: JSON.stringify({
                            email: email.toLowerCase().trim(),
                            firstName: firstname || (name ? name.split(' ')[0] : 'MindDump'),
                            lastName: lastname || (name ? (name.split(' ').slice(1).join(' ') || 'User') : 'User'), 
                            name: (firstname && lastname) ? `${firstname} ${lastname}` : (name || 'MindDump User'),
                            locationId: locationId,
                            tags: ['minddump-waitlist-signup'],
                            source: 'minddump-waitlist',
                            customFields: [
                                {
                                    id: 'source',
                                    field_value: 'MindDump Waitlist'
                                }
                            ]
                        })
                    });

                    if (createResponse.ok) {
                        const createData = await createResponse.json();
                        contactId = createData.contact?.id;
                        console.log(`✅ New MindDump contact created: ${contactId}`);
                    }
                } else {
                    // Add tag to existing contact
                    const tagResponse = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}/tags`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
                            'Content-Type': 'application/json',
                            'Version': '2021-07-28'
                        },
                        body: JSON.stringify({
                            tags: ['minddump-waitlist-signup']
                        })
                    });

                    if (tagResponse.ok) {
                        console.log(`✅ MindDump tag added to existing contact: ${contactId}`);
                    }
                }

            } catch (ghlError) {
                console.error('⚠️ GoHighLevel MindDump integration error:', ghlError.message);
            }
        }
        
        // Get total waitlist count
        const countResult = await pool.query('SELECT COUNT(*) as total FROM minddump_waitlist');
        const totalCount = parseInt(countResult.rows[0].total);
        
        res.json({ 
            success: true, 
            message: 'Je staat nu op de MindDump wachtlijst!',
            position: totalCount,
            id: result.rows[0].id
        });
        
    } catch (error) {
        console.error('MindDump waitlist signup error:', error);
        
        // Handle duplicate email
        if (error.code === '23505') {
            return res.status(409).json({ 
                error: 'Dit email adres staat al op de MindDump wachtlijst',
                already_exists: true 
            });
        }
        
        res.status(500).json({ error: 'Er is een fout opgetreden. Probeer het later opnieuw.' });
    }
});

// Get MindDump waitlist stats
app.get('/api/minddump-waitlist/stats', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) as total FROM minddump_waitlist');
        const totalCount = parseInt(result.rows[0].total);
        
        res.json({ 
            total: totalCount,
            message: totalCount === 1 ? '1 persoon' : `${totalCount} mensen`
        });
    } catch (error) {
        console.error('MindDump waitlist stats error:', error);
        res.status(500).json({ error: 'Fout bij ophalen statistieken' });
    }
});

// Test endpoint for MindDump GoHighLevel integration
app.post('/api/test/minddump-ghl-tag', async (req, res) => {
    try {
        const { email, name } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        if (!process.env.GHL_API_KEY) {
            return res.status(500).json({ error: 'GoHighLevel API key not configured' });
        }

        const locationId = process.env.GHL_LOCATION_ID || 'FLRLwGihIMJsxbRS39Kt';
        console.log(`🧪 Testing MindDump GHL integration for: ${email}`);
        
        // Search and tag logic (same as above but with minddump-waitlist-signup tag)
        // ... [Same implementation as main endpoint but for testing]
        
        res.json({ success: true, message: 'MindDump GHL test completed' });
        
    } catch (error) {
        console.error('🧪 MindDump GHL test error:', error);
        res.status(500).json({ 
            error: error.message,
            success: false 
        });
    }
});
```

### Stap 3: Frontend - MindDump Waitlist Pagina
Maak `public/minddump-waitlist.html`:

```html
<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MindDump - Binnenkort Beschikbaar</title>
    <!-- [CUSTOMIZATION POINT] - MindDump favicon/logo -->
    <link rel="icon" type="image/png" href="minddump-logo.png">
    <style>
        /* [REUSE] - Exact same CSS as Tickedify waitlist but with MindDump branding colors */
        /* Copy all CSS from waitlist.html and customize color variables */
        :root {
            /* [CUSTOMIZATION POINT] - MindDump color scheme */
            --primary-color: #FF6B35; /* Example: Orange for MindDump */
            --primary-hover: #E55A2B;
            /* Keep all other CSS variables the same */
        }
        /* Rest of CSS identical to Tickedify waitlist */
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <header class="header">
            <!-- [CUSTOMIZATION POINT] - MindDump logo -->
            <img src="minddump-logo.png" alt="MindDump" class="logo">
            <h1 class="hero-title">MindDump</h1>
            <!-- [CUSTOMIZATION POINT] - MindDump value proposition -->
            <p class="hero-subtitle">De revolutionaire mind mapping app</p>
            <p class="hero-description">
                Organiseer je gedachten, projecten en ideeën zoals nooit tevoren. Binnenkort beschikbaar.
            </p>
        </header>

        <!-- Signup Section -->
        <section class="signup-section">
            <h2 class="signup-title">Schrijf je in voor early access</h2>
            <p class="signup-subtitle">Wees de eerste die MindDump gebruikt wanneer we live gaan</p>
            
            <div class="waitlist-stats" id="waitlist-stats">
                <span id="stats-text">Bezig met laden...</span>
            </div>

            <form class="signup-form" id="signup-form">
                <div class="name-fields" style="display: flex; gap: 12px; margin-bottom: 12px;">
                    <input 
                        type="text" 
                        class="email-input" 
                        id="firstname-input"
                        placeholder="Voornaam" 
                        required
                        style="flex: 1; margin-bottom: 0;"
                    >
                    <input 
                        type="text" 
                        class="email-input" 
                        id="lastname-input"
                        placeholder="Achternaam (optioneel)" 
                        style="flex: 1; margin-bottom: 0;"
                    >
                </div>
                <input 
                    type="email" 
                    class="email-input" 
                    id="email-input"
                    placeholder="je@email.com" 
                    required
                >
                <button type="submit" class="signup-button" id="signup-button">
                    Schrijf je in
                </button>
            </form>

            <p class="privacy-text">
                We respecteren je privacy. Geen spam, alleen updates over MindDump.
            </p>
        </section>

        <!-- Features Section -->
        <section class="features-section">
            <h2 class="features-title">Wat maakt MindDump uniek?</h2>
            <div class="features-grid">
                <!-- [CUSTOMIZATION POINT] - MindDump specific features -->
                <div class="feature-card">
                    <span class="feature-icon">🧠</span>
                    <h3 class="feature-title">AI-Powered Mind Mapping</h3>
                    <p class="feature-description">
                        Intelligente suggesties en automatische structurering van je gedachten en ideeën.
                    </p>
                </div>

                <div class="feature-card">
                    <span class="feature-icon">🎨</span>
                    <h3 class="feature-title">Visuele Organisatie</h3>
                    <p class="feature-description">
                        Prachtige, intuïtieve interface om complexe projecten overzichtelijk te houden.
                    </p>
                </div>

                <div class="feature-card">
                    <span class="feature-icon">🔄</span>
                    <h3 class="feature-title">Real-time Synchronisatie</h3>
                    <p class="feature-description">
                        Werk samen aan mind maps die automatisch synchroniseren tussen al je devices.
                    </p>
                </div>

                <div class="feature-card">
                    <span class="feature-icon">📱</span>
                    <h3 class="feature-title">Cross-Platform</h3>
                    <p class="feature-description">
                        Beschikbaar op web, desktop, en mobile. Je mind maps overal bij de hand.
                    </p>
                </div>

                <div class="feature-card">
                    <span class="feature-icon">📊</span>
                    <h3 class="feature-title">Smart Analytics</h3>
                    <p class="feature-description">
                        Inzicht in je denkpatronen en productiviteit door geavanceerde analytics.
                    </p>
                </div>

                <div class="feature-card">
                    <span class="feature-icon">🎯</span>
                    <h3 class="feature-title">Focus Mode</h3>
                    <p class="feature-description">
                        Elimineer afleiding en focus op één onderdeel van je mind map tegelijk.
                    </p>
                </div>
            </div>
        </section>
    </div>

    <!-- Footer -->
    <footer class="footer">
        <p>&copy; 2025 MindDump. Binnenkort beschikbaar.</p>
    </footer>

    <!-- Toast Container -->
    <div class="toast-container" id="toast-container"></div>

    <script>
        // [REUSE] - Exact same JavaScript as Tickedify but with MindDump API endpoints
        
        // Toast notification system (identical)
        class ToastManager {
            // ... [Copy exact implementation from Tickedify waitlist]
        }

        const toast = new ToastManager();

        // Load MindDump waitlist stats
        async function loadWaitlistStats() {
            try {
                const response = await fetch('/api/minddump-waitlist/stats');
                const data = await response.json();
                
                const statsText = document.getElementById('stats-text');
                if (data.total === 0) {
                    statsText.textContent = 'Wees de eerste op de MindDump wachtlijst! 🚀';
                } else {
                    statsText.textContent = `${data.message} wachten al op MindDump 🎉`;
                }
            } catch (error) {
                console.error('Error loading stats:', error);
                document.getElementById('stats-text').textContent = 'Join the waitlist! 🚀';
            }
        }

        // Handle form submission
        document.getElementById('signup-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const firstnameInput = document.getElementById('firstname-input');
            const lastnameInput = document.getElementById('lastname-input');
            const emailInput = document.getElementById('email-input');
            const submitButton = document.getElementById('signup-button');
            const firstname = firstnameInput.value.trim();
            const lastname = lastnameInput.value.trim();
            const email = emailInput.value.trim();

            // Basic validation
            if (!firstname) {
                toast.error('Voornaam is verplicht');
                return;
            }
            
            if (!email || !email.includes('@')) {
                toast.error('Voer een geldig email adres in');
                return;
            }

            // Disable form during submission
            submitButton.disabled = true;
            submitButton.textContent = 'Bezig...';

            try {
                const response = await fetch('/api/minddump-waitlist/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, firstname, lastname })
                });

                const data = await response.json();

                if (response.ok) {
                    toast.success(`Gelukt! Je bent nummer ${data.position} op de MindDump wachtlijst 🎉`, 6000);
                    firstnameInput.value = '';
                    lastnameInput.value = '';
                    emailInput.value = '';
                    loadWaitlistStats(); // Refresh stats
                } else {
                    if (data.already_exists) {
                        toast.error('Dit email adres staat al op de MindDump wachtlijst');
                    } else {
                        toast.error(data.error || 'Er is een fout opgetreden');
                    }
                }
            } catch (error) {
                console.error('Signup error:', error);
                toast.error('Netwerk fout. Controleer je internetverbinding.');
            } finally {
                // Re-enable form
                submitButton.disabled = false;
                submitButton.textContent = 'Schrijf je in';
            }
        });

        // Load stats on page load
        loadWaitlistStats();
    </script>
</body>
</html>
```

## 🎨 Customization Points

### Visuele Branding
1. **Logo**: Vervang `minddump-logo.png`
2. **Kleuren**: Pas CSS variabelen aan voor MindDump brand colors
3. **Typography**: Mogelijk andere fonts voor MindDump

### Content Aanpassingen
1. **Hero messaging**: MindDump value proposition
2. **Feature cards**: 6 MindDump-specifieke features
3. **Call-to-action**: MindDump-specifieke messaging
4. **Footer**: MindDump copyright

### Technische Aanpassingen
1. **API endpoints**: `/api/minddump-waitlist/` prefix
2. **Database tabel**: `minddump_waitlist`
3. **GoHighLevel tag**: `minddump-waitlist-signup`
4. **Environment variables**: Hergebruik bestaande GHL setup

## 🧪 Testing Checklist

### Database Testing
- [ ] MindDump waitlist tabel aangemaakt
- [ ] Email signup werkt en slaat op in database
- [ ] Duplicate email detection werkt

### API Testing
```bash
# Test signup
curl -X POST https://yoursite.com/api/minddump-waitlist/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com", "name":"Test User"}'

# Test stats
curl https://yoursite.com/api/minddump-waitlist/stats

# Test GoHighLevel integration
curl -X POST https://yoursite.com/api/test/minddump-ghl-tag \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com", "name":"Test User"}'
```

### Frontend Testing
- [ ] Pagina laadt correct op `/minddump-waitlist.html`
- [ ] Form submission werkt
- [ ] Toast notifications werken
- [ ] Stats counter werkt
- [ ] Responsive design werkt
- [ ] Error handling werkt

### GoHighLevel Testing
- [ ] Nieuwe contacten worden aangemaakt
- [ ] Bestaande contacten krijgen tag
- [ ] Tag `minddump-waitlist-signup` wordt toegevoegd
- [ ] Email sequences kunnen getriggerd worden

## 📋 User Action Items

### Voor Implementatie
1. **Branding materialen verzamelen**:
   - MindDump logo (PNG formaat)
   - Brand colors (hex codes)
   - Feature beschrijvingen
   - Value proposition tekst

2. **GoHighLevel setup**:
   - Bestaande API key kan hergebruikt worden
   - Nieuwe tag `minddump-waitlist-signup` aanmaken
   - Email workflow instellen (optioneel)

3. **Hosting beslissingen**:
   - Waar komt de pagina? (minddump.com/waitlist.html?)
   - Domain configuratie indien nodig

### Na Implementatie
1. **Testing uitvoeren** aan de hand van checklist
2. **GoHighLevel workflow testen** met eigen email
3. **Analytics instellen** voor performance tracking

## 🚀 Expected Timeline
- **Database & API**: 30 minuten
- **Frontend implementatie**: 45 minuten  
- **Branding customization**: 30 minuten
- **Testing & debugging**: 30 minuten
- **Total**: 2-2.5 uur voor complete implementatie

## 📞 Support
Als je vastloopt tijdens implementatie:
1. Check de console logs voor API errors
2. Verificeer database connectie
3. Test API endpoints apart met curl
4. Check GoHighLevel API key permissions

Deze guide bevat alles wat nodig is voor een succesvolle MindDump waitlist implementatie! 🎉