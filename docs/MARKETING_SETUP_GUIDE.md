# PakkaQuote — Marketing Infrastructure Setup Guide

Everything you need to configure in external dashboards to make the
tracking infrastructure work. The code is already in place — you just
need to create accounts, grab IDs, and plug them in.

---

## 1. Google Tag Manager (GTM) — THE HUB

GTM is the single container that manages all your tracking tags.
Every other tool (GA4, HubSpot, LinkedIn, Meta) gets added inside GTM,
not in your HTML code. This means you never touch code again to add
a new tracking pixel.

### Setup steps

1. Go to https://tagmanager.google.com
2. Create Account → name: `PakkaQuote`
3. Create Container → name: `pakkaquote.com`, type: **Web**
4. Copy your **Container ID** (format: `GTM-M26CDSJN`)
5. In your codebase, find-and-replace `GTM-M26CDSJN` with your real ID
   across all 4 HTML files (index, features, about, faq)

### Tags to create inside GTM

#### Tag 1: GA4 Configuration
- Tag type: Google Analytics: GA4 Configuration
- Measurement ID: `G-J6D1L0SGY5` (from step 2 below)
- Trigger: **Consent Initialized - All Pages** (or "All Pages" if not using consent mode)
- Enable: Built-in "Enhanced Measurement" (auto-tracks scrolls, outbound clicks, file downloads)
- Under "Advanced Settings" → "Consent Settings":
  - Set "Require additional consent for tag to fire" → `analytics_storage`

#### Tag 2: GA4 Custom Events
Create separate GA4 Event tags for each custom event:

| Event name          | Trigger (Custom Event) | Parameters to pass                    |
|---------------------|------------------------|---------------------------------------|
| `waitlist_signup`   | waitlist_signup         | signup_source, company_name, utm_source, utm_campaign |
| `cta_click`         | cta_click              | cta_text, cta_section, page_name      |
| `faq_open`          | faq_open               | faq_question, page_name               |
| `scroll_depth`      | scroll_depth           | scroll_percent, page_name             |
| `section_view`      | section_view           | section, page_name                    |
| `time_on_page`      | time_on_page           | seconds_on_page, page_name            |
| `nav_click`         | nav_click              | nav_text, nav_href, page_name         |
| `outbound_click`    | outbound_click         | link_url, link_text, page_name        |

For each: Tag type → GA4 Event → Event name matches the dataLayer event.
Add event parameters by pulling from the dataLayer variables.

#### Tag 3: HubSpot Tracking Script
- Tag type: Custom HTML
- HTML:
  ```html
  <script type="text/javascript" id="hs-script-loader" async defer
    src="//js-na2.hs-scripts.com/245789604.js"></script>
  ```
- Trigger: All Pages
- Consent: Requires `analytics_storage`

#### Tag 4: LinkedIn Insight Tag (when ready)
- Tag type: Custom HTML
- Get your tag from: LinkedIn Campaign Manager → Account Assets → Insight Tag
- Trigger: All Pages
- Consent: Requires `ad_storage`

#### Tag 5: Meta/Facebook Pixel (when ready)
- Tag type: Custom HTML
- Get your pixel from: Meta Business Suite → Events Manager → Pixels
- Trigger: All Pages
- Consent: Requires `ad_storage`

### Consent Mode setup in GTM

1. Go to Admin → Container Settings → Enable "Consent Overview"
2. For each tag, set the appropriate consent requirement:
   - GA4 tags → require `analytics_storage`
   - HubSpot → require `analytics_storage`
   - LinkedIn/Meta → require `ad_storage`
3. The `tracking.js` file handles consent mode via the dataLayer
   (`consent_default` and `consent_update` events)

---

## 2. Google Analytics 4 (GA4)

### Setup steps

1. Go to https://analytics.google.com
2. Create Account: `PakkaQuote`
3. Create Property: `PakkaQuote Website`
   - Timezone: India (GMT+05:30)
   - Currency: Indian Rupee (INR / ₹)
4. Business details: Industry = Business & Industrial, Size = Small
5. Choose "Get baseline reports"
6. Create Web Data Stream:
   - URL: `https://pakkaquote.com`
   - Stream name: `PakkaQuote Web`
7. Copy the **Measurement ID** (format: `G-J6D1L0SGY5`)
8. Paste this ID into the GA4 Configuration tag in GTM (step 1 above)

### Configure in GA4 dashboard

#### Mark conversions
Go to Admin → Events → find `waitlist_signup` → toggle "Mark as conversion"

#### Create audiences (for retargeting)
Go to Admin → Audiences → Create:

| Audience name              | Condition                                           |
|----------------------------|-----------------------------------------------------|
| Pricing viewers            | `section_view` where section = "pricing"            |
| High-intent visitors       | `scroll_depth` ≥ 75% AND `time_on_page` ≥ 60s      |
| Feature page visitors      | page_path = /features.html                          |
| FAQ engaged                | `faq_open` event fired at least 2 times             |
| Waitlist signups           | `waitlist_signup` event fired                       |
| LinkedIn traffic           | utm_source = "linkedin"                             |
| WhatsApp referrals         | utm_source = "whatsapp"                             |

#### Enhanced Measurement (auto-enabled)
Verify these are on in Admin → Data Streams → your stream → Enhanced Measurement:
- Page views ✓
- Scrolls ✓
- Outbound clicks ✓
- Site search ✓
- File downloads ✓

---

## 3. HubSpot Tracking

You already have the form working (Portal ID: 245789604). Now add the
tracking script via GTM (Tag 3 above) so you can:

- See which pages a contact visited before signing up
- Score leads based on page engagement
- Trigger workflows based on page visits

### In HubSpot dashboard

1. Go to Settings → Tracking & Analytics → Tracking Code
2. Your tracking code is already being loaded via GTM
3. Go to Settings → Tracking & Analytics → Add your domain: `pakkaquote.com`

### Create a workflow for new waitlist signups
1. Marketing → Workflows → Create
2. Trigger: Contact property "message" = "PakkaQuote waitlist signup"
3. Actions:
   - Send welcome email immediately
   - Wait 1 day → Send "here's how it works" email
   - Wait 2 days → Send "meet the founder" email
4. This nurtures leads between signup and your manual outreach

---

## 4. Google Search Console

1. Go to https://search.google.com/search-console
2. Add property → URL prefix → `https://pakkaquote.com`
3. Verify via HTML tag (add meta tag to index.html) or DNS record
4. Submit sitemap: `https://pakkaquote.com/sitemap.xml`
5. Request indexing for all 4 pages

---

## 5. UTM Link Strategy

For every link you share, use UTM parameters so you can track what works.

### Link templates

| Channel           | Example URL                                                                                    |
|--------------------|---------------------------------------------------------------------------------------------|
| LinkedIn post      | `pakkaquote.com?utm_source=linkedin&utm_medium=organic&utm_campaign=launch_apr26`            |
| WhatsApp forward   | `pakkaquote.com?utm_source=whatsapp&utm_medium=referral&utm_campaign=founder_outreach`       |
| Email signature    | `pakkaquote.com?utm_source=email&utm_medium=signature&utm_campaign=always_on`                |
| IndiaMART outreach | `pakkaquote.com?utm_source=indiamart&utm_medium=dm&utm_campaign=seller_outreach_apr26`       |
| CA referral        | `pakkaquote.com?utm_source=ca_referral&utm_medium=partner&utm_campaign=ca_program`           |
| Demo video link    | `pakkaquote.com/features.html?utm_source=linkedin&utm_medium=video&utm_campaign=demo_apr26`  |

Use https://ga-dev-tools.google/campaign-url-builder/ to generate these.
The tracking.js file captures UTMs automatically and persists them across
page navigations, so even if someone lands on the homepage and then
navigates to FAQ and signs up, the UTM attribution is preserved.

---

## 6. LinkedIn Insight Tag (Do when ready for ads)

1. Create a LinkedIn Campaign Manager account
2. Go to Account Assets → Insight Tag → copy tag code
3. Add as Custom HTML tag in GTM
4. Create conversions: "Waitlist Signup" → match event `waitlist_signup`

---

## 7. Meta/Facebook Pixel (Do when ready for ads)

1. Go to Meta Business Suite → Events Manager
2. Create a new Pixel
3. Add as Custom HTML tag in GTM
4. Create custom conversion for waitlist signup

---

## Quick checklist

- [x] Create GTM container (GTM-M26CDSJN) — embedded in all 4 HTML files
- [x] Create GA4 property (G-J6D1L0SGY5) — configured in GTM
- [x] Create GA4 custom event tags in GTM (8 events)
- [ ] **Publish latest GTM version** (event tags created but may not be published yet)
- [ ] Mark `waitlist_signup` as conversion in GA4 (after first signup fires)
- [x] Add HubSpot tracking script as GTM tag (Portal: 245789604)
- [ ] Add domain `pakkaquote.com` in HubSpot tracking settings
- [ ] Create HubSpot welcome email workflow
- [ ] Set up Google Search Console + submit sitemap
- [ ] Create GA4 audiences for retargeting (see audience table above)
- [x] Generate UTM links — see `docs/PakkaQuote_UTM_Links.xlsx`
- [x] Create OG image (1200x630px) — `assets/og-image.png`, added to all pages
- [x] Add Organization + WebSite JSON-LD schemas
- [x] Add DNS prefetch hints for GTM, GA4, HubSpot
- [x] Consent mode defaulted to granted (analytics), denied (ads)
- [ ] (Later) Add LinkedIn Insight Tag in GTM
- [ ] (Later) Add Meta Pixel in GTM
