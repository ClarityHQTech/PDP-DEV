"""
Category-specific prompt additions for SEO and AEO agents.
Each category extends the base prompt with domain-specific signals.
"""

# ── GLOBAL BASE (always checked, all categories) ────────────────────────────
_GLOBAL_SEO_BASE = """
GLOBAL SIGNALS (check for ALL categories — do not skip):
- Product schema: name, price, availability, brand, GTIN/EAN, SKU
- Review/AggregateRating schema with review count
- BreadcrumbList schema
- Canonical URL, OG tags, SSL, mobile viewport
- H1 keyword, meta description, title length
- Image ALT tags, word count, internal links
""".strip()

_GLOBAL_AEO_BASE = """
GLOBAL AEO SIGNALS (check for ALL categories):
- E-E-A-T: Experience/Expertise/Authoritativeness/Trustworthiness
- FAQ section present with conversational Q&A
- Direct answer format (question → immediate answer)
- Return/refund policy visible
- Brand trust signals (certifications, awards, media mentions)
""".strip()

# ── CATEGORY-SPECIFIC ADDITIONS ────────────────────────────────────────────

_SEO_ADDITIONS = {

"fashion": """
FASHION-SPECIFIC SEO SIGNALS:
- Size guide / size chart present and linked from PDP
- Fit guide ("model is 5'9 wearing size M") for AI sizing recommendations
- Material composition with exact % (e.g., "60% Cotton 40% Polyester" — not just "cotton blend")
- Care instructions (machine wash, dry clean, hand wash)
- Occasion/use-case tags (office, casual, wedding, beach)
- Seasonal keywords present (summer, winter, festive, monsoon)
- Color/variant — each has unique URL (not just JS switcher)
- ClothingProduct schema or size property in Offer schema
- Image filenames are descriptive (blue-linen-kurta-front.jpg NOT img001.jpg)
- On-model photography present (not just flat-lay)
- Sustainability claims if applicable (recycled, organic cotton, vegan leather)
- Out-of-stock: availability in schema should be real-time (InStock/OutOfStock)
- Review content includes fit/sizing language ("runs small", "true to size")
""",

"electronics": """
ELECTRONICS-SPECIFIC SEO SIGNALS:
- Full tech specs table: processor, RAM, storage, display, battery, camera, weight, dimensions
- GTIN (UPC/EAN) AND MPN (manufacturer part number) — both required
- Compatibility info: OS (iOS/Android), platform (Windows/Mac), version support
- Model year or version in title AND URL (e.g., "OnePlus 12R" not just "OnePlus phone")
- Software update lifecycle / EoL: "X years of OS updates guaranteed" — AI uses this for "worth buying" queries
- Condition: New / Refurbished / Open-box explicitly in schema (ItemCondition)
- Energy efficiency rating if applicable (BEE star rating, ENERGY STAR)
- "What's in the box" list
- Warranty duration clearly stated (not just "standard warranty")
- Comparison vs previous model or competitors (helps AI answer "X vs Y" queries)
- Video demo present (VideoObject schema)
- Review schema with use-case-specific feedback (gaming, battery life, photography)
""",

"beauty": """
BEAUTY-SPECIFIC SEO SIGNALS:
- Full INCI ingredient list present (required for AI to answer "what's in this product")
- Key active ingredients called out with benefits (e.g., "Niacinamide 5% — reduces pores")
- Skin type targeting explicitly stated: "For oily/dry/sensitive/combination skin"
- Non-comedogenic / acne-safe claim if applicable (highly searched)
- PAO (Period After Opening) symbol or shelf life stated
- Certifications present: cruelty-free, vegan, dermatologist-tested, fragrance-free, paraben-free
- YMYL compliance: no unsubstantiated medical/therapeutic claims ("treats acne" vs "helps reduce the appearance of acne")
- Author/reviewer schema: "Reviewed by Dr. [Name], Dermatologist" — YMYL E-E-A-T critical
- SPF value explicitly in title/H1 for sunscreens
- Volume/weight AND cost-per-ml comparison enabled
- How to use / application steps present
- Before/after imagery or UGC photos
- Comedogenic rating content (even if just blog-linked)
""",

"furniture": """
FURNITURE-SPECIFIC SEO SIGNALS:
- Exact dimensions: Height × Width × Depth in BOTH cm and inches
- Weight capacity / load bearing (especially for chairs, shelves, beds)
- Material + finish details (solid oak vs MDF, matte vs gloss, fabric type)
- Assembly required: Yes/No, estimated assembly time, tools needed
- Room type suitability explicitly mentioned (bedroom, living room, office, balcony)
- Style keywords: mid-century modern, Scandinavian, industrial, bohemian, contemporary
- Delivery type: standard / white-glove / room-of-choice — clearly stated
- Warranty details with duration
- Care & maintenance instructions (how to clean fabric, polish wood)
- Weight of product for shipping context
- AR / 3D room visualizer tool present
- Lifestyle photography in real room context
- Color/finish variants with separate URLs or at minimum separate image arrays
""",

"supplements": """
SUPPLEMENTS/HEALTH-SPECIFIC SEO SIGNALS:
- Supplement Facts panel fully present: serving size, servings per container, ingredients, % DV
- Format explicitly stated in title/H1: capsule, gummy, powder, liquid, tablet
- Dosage instructions: how many, how often, with food or without
- Contraindications / Warnings EXPLICITLY present: "Do not use if pregnant," "Consult doctor if on blood thinners" — CRITICAL for AI recommendation
- Third-party certifications: NSF, USP, Informed Sport, FSSAI, GMP, USDA Organic
- Allergen info: gluten-free, soy-free, dairy-free, nut-free clearly stated
- "Who it's for" targeting: athletes, women 40+, postpartum, diabetics
- Ingredient sourcing: where active ingredients come from
- YMYL compliance: no disease-cure claims — only structure/function claims
- Author/medical reviewer schema: "Formulated by Dr. [Name]" or "Reviewed by nutritionist"
- Expiry/shelf life stated
""",

"food": """
FOOD-SPECIFIC SEO SIGNALS:
- Nutrition facts panel: calories, protein, carbs, fat, sodium, sugar per serving
- Full ingredient list in descending order
- Allergen declaration clearly visible (contains wheat, milk, nuts, soy)
- Net weight clearly stated in title or H1
- Dietary tags: vegan, vegetarian, keto, gluten-free, organic, non-GMO
- FSSAI / regulatory approval number (India) or FDA compliance
- Best before / shelf life
- Serving size and servings per pack
- Storage instructions
- Flavour variants with unique descriptions
- "How to use" / preparation instructions (for ready-to-cook, supplements, protein powder)
- Calorie count in title for health-focused products
""",

"sports": """
SPORTS/FITNESS-SPECIFIC SEO SIGNALS:
- Performance specs: weight, resistance levels, speed range, power output
- Activity-specific targeting: running, cycling, yoga, gym, swimming, cricket, football
- Surface/condition suitability: indoor/outdoor, wet/dry, trail/road
- Size + fit guide (for apparel, shoes, equipment)
- Technical features: waterproof rating (IPX), breathability, grip type, cushioning type
- Weight of product (critical for gym equipment and luggage)
- Compatibility: works with (Garmin, Apple Watch, Zwift)
- Safety certifications if applicable (helmets: BIS, CE)
- Warranty on equipment
- Video of product in use
""",

"jewellery": """
JEWELLERY-SPECIFIC SEO SIGNALS:
- Metal purity explicitly in title: 925 Sterling Silver, 18K Gold, 14K White Gold
- Gemstone details: type, carat weight, cut, clarity, color (for diamonds: 4Cs)
- Certification: BIS Hallmark, GIA, IGI, SGL certificate number
- Ethical sourcing: conflict-free, lab-grown vs natural distinction
- Ring size guide present and linked
- Chain/bracelet length options (16", 18", 20")
- Customization/engraving options
- Weight of piece in grams
- Rhodium plating / coating details (affects longevity)
- Care instructions: "store separately, avoid perfume contact"
""",

"pets": """
PETS-SPECIFIC SEO SIGNALS:
- Species targeting: dog, cat, bird, fish — in title
- Breed/size compatibility: small/medium/large breed, toy breed, giant breed
- Lifestage targeting: Puppy/Kitten, Adult, Senior — MUST be in title or H1
- Weight-based dosing (for food, medicine, flea treatment): clear chart
- For pet food: AAFCO statement of nutritional adequacy
- Crude Protein, Crude Fat, Crude Fiber, Moisture guaranteed analysis
- Allergen/ingredient safety: no artificial preservatives, grain-free claim
- Vet-recommended / veterinarian-approved claim if present
- Net weight clearly stated with price-per-kg calculation possible
- Feeding guide based on weight
""",


"jobs": """
JOBS/RECRUITMENT-SPECIFIC SEO SIGNALS:
- Job title exact match in H1 and title tag (e.g., "Senior Backend Engineer – Remote India")
- JobPosting schema: title, hiringOrganization, jobLocation, datePosted, validThrough, baseSalary, employmentType
- Salary range explicitly stated (ranges rank better than "competitive salary")
- Employment type clear: Full-Time / Part-Time / Contract / Freelance / Internship
- Location type: On-site / Remote / Hybrid — in schema AND visible text
- Required skills as bullet list (keyword-rich, AI extracts these for skill-match queries)
- Experience level stated: "2–4 years", "fresher", "senior" — not vague
- Benefits section: ESOPs, health insurance, WFH allowance, learning budget
- Company overview with headcount, funding, Glassdoor/LinkedIn link
- Application deadline or "Rolling basis" stated
- Duplicate job listing detection risk (same title on multiple pages)
- Review/rating schema for company (employer brand signals)
""",

"travel": """
TRAVEL/HOSPITALITY-SPECIFIC SEO SIGNALS:
- LodgingBusiness / TouristAttraction / TouristTrip schema as appropriate
- Price clearly stated per night / per person / per package (with currency)
- Check-in / Check-out times visible
- Amenities list structured (WiFi, pool, parking, breakfast) — AI extracts for "hotels with X" queries
- Star rating + review count in schema (AggregateRating)
- Location structured data: geo coordinates, address, nearby landmark
- Photo gallery with ALT tags describing views/rooms
- Cancellation policy clearly visible (trust signal + AI cites this)
- Availability widget or "Check Availability" CTA prominent
- Seasonal pricing / peak season dates mentioned
- FOMO signals: "Only 2 rooms left", "Sold out last weekend" — schema-compatible urgency
- Accessibility features stated (wheelchair, elevator) — required for inclusive search
""",

"healthcare": """
HEALTHCARE-SPECIFIC SEO SIGNALS (YMYL — highest scrutiny):
- Physician/Specialist name, qualifications (MBBS, MD, MCh) in MedicalBusiness or Person schema
- Author/reviewer schema: "Content reviewed by Dr. [Name], [Specialty], [Hospital]" — YMYL critical
- Service/treatment name exact in H1 and title
- MedicalCondition or MedicalProcedure schema where applicable
- Certifications: NABH, JCI accreditation, ISO — visible and in schema
- Address + Phone in LocalBusiness schema (NAP consistency critical)
- Appointment booking CTA with availability
- Cost range / insurance coverage stated (highly searched)
- Treatment success rate / patient outcomes if claimable (backed by data)
- No unsubstantiated cure claims ("treats" vs "may help manage")
- Patient testimonials with verified tag (not anonymous — YMYL trust)
- Privacy policy visible (DPDP Act 2023 compliance for Indian sites)
""",

"gaming": """
GAMING-SPECIFIC SEO SIGNALS:
- Game title + platform in H1 and title tag ("Elden Ring – PS5 Review / Buy")
- VideoGame schema: name, gamePlatform, genre, author, publisher, operatingSystem, applicationCategory
- Platform compatibility explicitly listed: PC / PS5 / Xbox / Switch / Mobile
- System requirements (minimum + recommended) — AI answers "can my PC run X"
- Genre tags: RPG, FPS, Strategy, Puzzle, Open World
- Multiplayer info: online/offline/co-op/PvP — highly queried
- Age rating (PEGI/ESRB/CERO) in schema
- DLC / expansion content list if applicable
- Release date + latest patch version
- AggregateRating from Metacritic/OpenCritic mentioned (trust signals)
- Video trailer with VideoObject schema
- Language support list
""",

"media": """
MEDIA/NEWS/CONTENT-SPECIFIC SEO SIGNALS:
- Article / NewsArticle / BlogPosting schema with author, datePublished, dateModified, publisher
- Author name + bio + authoritative credentials — E-E-A-T critical for news
- Publication date AND last-updated date both visible and in schema
- Headline exact match in H1 and title (no clickbait mismatch — Google penalty risk)
- Speakable schema for audio/voice assistant citability
- Article word count adequate (600+ for news, 1500+ for analysis pieces)
- Internal linking to related articles / series
- Image caption + photographer credit (copyright compliance + ALT)
- Topic taxonomy / tag breadcrumb in BreadcrumbList schema
- Podcast: PodcastEpisode schema with duration, episodeNumber, partOfSeries
- Video: VideoObject schema with thumbnailUrl, duration, uploadDate
- Paywall/access level declared in schema if applicable (isAccessibleForFree)
""",

"generic": """
GENERIC ECOMMERCE SIGNALS:
Apply all global SEO signals. Focus on:
- Product name clarity in title and H1
- Price and availability clearly stated
- At least one trust signal (reviews, certifications, brand info)
- Core Product schema fields present
"""
}

_AEO_ADDITIONS = {

"fashion": """
FASHION-SPECIFIC AEO SIGNALS:
AI queries this page must answer: "Is [product] true to size?", "What to wear to [occasion]?", "Best [garment] for [body type]"
- Size recommendation content: does page help AI answer "what size should I order?"
- Occasion coverage: can AI recommend this for wedding/office/casual from this page?
- Sustainability story: can AI answer "is [brand] sustainable?"
- Material transparency: can AI answer "what is this made of?" with exact %
- Model sizing context: enables AI to suggest "if you're 5'6, order M"
- Fit vocabulary present: oversized, relaxed, slim, regular, slim-fit, cropped
- Seasonal/occasion AI queries: "summer ethnic wear", "office party outfit"
- UGC reviews with fit language improve AI citability significantly
""",

"electronics": """
ELECTRONICS-SPECIFIC AEO SIGNALS:
AI queries this page must answer: "Is [product] worth buying in 2026?", "Best [category] under [price]?", "[Product A] vs [Product B]?"
- Software support lifecycle: AI won't recommend device without update guarantee
- "Worth buying" content: longevity signals, build quality mentions, long-term value
- Comparison content: head-to-head vs competitor helps AI answer comparison queries
- Real-world performance data in reviews (battery life hours, camera samples)
- "Who should buy this" content: content creator, student, gamer, business user
- Use case coverage: gaming, work-from-home, travel, photography
- Price-to-performance narrative: "best value under 20000"
""",

"beauty": """
BEAUTY-SPECIFIC AEO SIGNALS:
AI queries: "best moisturizer for oily acne-prone skin", "is [product] safe during pregnancy?", "does [product] contain parabens?"
- Ingredient safety for pregnancy/sensitivity: can AI answer safety queries?
- Skin concern coverage: "helps with dark spots", "reduces redness" — specific, not vague
- Dermatologist/expert validation: improves AI confidence to recommend
- Comparison to hero ingredients (how does 2% Salicylic acid compare to benzoyl peroxide)
- Non-comedogenic claim helps AI recommend for acne-prone searches
- Fragrance-free mention for sensitive skin AI queries
- "Results in X weeks" content with evidence (clinical study reference)
- How to layer with other products (serums, moisturizers, SPF) — AEO content
""",

"furniture": """
FURNITURE-SPECIFIC AEO SIGNALS:
AI queries: "best sofa for small apartment", "what size dining table for 6 people?", "how to clean velvet sofa"
- Exact dimensions enable AI to answer "will this fit in [room size]"
- Room size recommendation: "suits rooms 12x14 ft and above"
- Care content on page: directly answers "how to clean/maintain" queries
- Delivery + assembly transparency: AI answers logistics questions from this
- Style compatibility: "pairs well with Scandinavian/industrial decor"
- Weight capacity helps AI answer "is this safe for heavy use?"
- Warranty content helps AI answer "[Brand A] vs [Brand B] warranty comparison"
""",

"supplements": """
SUPPLEMENTS-SPECIFIC AEO SIGNALS:
AI queries: "safe for pregnant women?", "can I take with [medication]?", "how long to see results?"
- Contraindications MUST be explicit — AI will not cite supplements without safety warnings
- "When to take" content: morning/night, pre-workout, with food
- Expected results timeline: "most users see results in 4-6 weeks"
- Drug interaction warning: even a generic "consult your doctor if on medication" helps
- Certifications enable AI to answer "is this third-party tested?"
- Ingredient sourcing story: "plant-based", "clinically studied dosage"
- "Who should not take this" — AI needs this to responsibly recommend
""",

"food": """
FOOD-SPECIFIC AEO SIGNALS:
AI queries: "is [product] healthy?", "how many calories in [product]?", "suitable for diabetics?"
- Calorie and macro data enables AI to answer diet-specific queries
- Allergen info enables AI to answer "safe for nut allergy?" type questions
- Dietary certifications (vegan, keto, diabetic-friendly) increase AI citability
- Preparation/recipe content: AI can suggest "how to use this in a recipe"
- Comparison to homemade / restaurant: "healthier than restaurant version"
- Ingredient transparency enables AI to answer "what's in this?"
""",

"sports": """
SPORTS-SPECIFIC AEO SIGNALS:
AI queries: "best running shoes for flat feet", "resistance band for beginners", "waterproof fitness tracker"
- Activity-specific content enables precise AI recommendations
- Skill level targeting: beginner/intermediate/advanced
- Performance data in reviews helps AI answer "does this actually work for [activity]?"
- Comparison to professional/premium options: "entry-level vs pro"
- Safety certification enables AI to recommend for safety-critical gear
""",

"jewellery": """
JEWELLERY-SPECIFIC AEO SIGNALS:
AI queries: "lab-grown vs natural diamond ring", "how to choose ring size", "is 925 silver good quality?"
- Lab-grown vs natural distinction: AI specifically differentiates these
- Ethical sourcing helps AI answer sustainability queries
- Care instructions enable AI to answer "how to maintain silver jewelry"
- Certificate information helps AI answer "is this certified authentic?"
- Ring size guide helps AI answer sizing questions directly
""",

"pets": """
PETS-SPECIFIC AEO SIGNALS:
AI queries: "best dog food for senior large breed", "is this safe for puppies?", "how much to feed 10kg dog"
- Lifestage clarity is critical — AI won't recommend adult food for puppies
- Feeding guide enables AI to answer "how much to give?"
- AAFCO statement helps AI answer "is this nutritionally complete?"
- Ingredient safety helps AI answer "is this safe for [breed]?"
- Vet recommendation claim boosts AI confidence to cite
""",


"jobs": """
JOBS AEO SIGNALS:
- FAQ covering: salary, work hours, growth path, interview process, team culture
- Conversational content: "What does a [Job Title] do at [Company]?" answered directly
- Speakable schema on key job details (role summary, location, salary)
- Unique company value prop: why join us vs competitors?
- Employee testimonials / Glassdoor rating cited
- AI queries to cover: "Is [Company] a good place to work", "remote jobs in [city] for [skill]"
""",

"travel": """
TRAVEL AEO SIGNALS:
- FAQ: "Is [destination] safe?", "Best time to visit [place]?", "What is included in the package?"
- Direct answer format for top travel queries
- LocalBusiness + LodgingBusiness schema for AI map/assistant citations
- Review content covering: food, staff, cleanliness, location, value
- AI queries to cover: "best hotels near [landmark]", "family-friendly resorts in [city]"
- Speakable schema on location + price + availability
""",

"healthcare": """
HEALTHCARE AEO SIGNALS (YMYL — maximum E-E-A-T required):
- FAQ: "How much does [treatment] cost?", "Is [doctor] available on weekends?", "What to expect during [procedure]?"
- Every health claim backed by citation (NIH, PubMed, institutional study)
- Doctor credentials front-and-center — AI cites credentials for medical queries
- Speakable schema on clinic hours, address, contact
- AI queries to cover: "best [specialty] doctor in [city]", "[treatment] side effects", "[condition] specialist near me"
- Trust signals: patient count, years of practice, success rate (verifiable)
""",

"gaming": """
GAMING AEO SIGNALS:
- FAQ: "Is [game] worth buying?", "How long to beat [game]?", "Does [game] have multiplayer?"
- Direct answers to: system requirements, platform exclusivity, DLC count, game length
- Speakable schema on key game facts (genre, platform, rating)
- AI queries to cover: "best RPG games 2025", "[game] vs [game] comparison", "games like [title]"
- Review content with playtime hours mentioned (RAG-ready specificity)
- VideoObject schema for trailers (YouTube-cited by AI overviews)
""",

"media": """
MEDIA AEO SIGNALS:
- Speakable schema on article summary, headline, key finding
- FAQ: "What is [topic]?", "Why did [event] happen?", "What does [term] mean?"
- Author E-E-A-T: credentials, beat expertise, publication history
- Structured summary / TL;DR section at top (AI Overview source)
- Unique data / statistics cited (primary source) — AI prefers citable original data
- AI queries to cover: "[topic] explained", "latest news on [subject]", "summary of [event]"
- dateModified always updated — stale articles deprioritized by AI engines
""",

"generic": """
Apply all global AEO signals. Focus on:
- Direct answers to common product questions
- Trust signals for AI citability
- Basic FAQ covering price, availability, returns
"""
}


def get_seo_system_prompt(category: str) -> str:
    cat = category if category in _SEO_ADDITIONS else "generic"
    return f"""You are a senior e-commerce SEO specialist. Analyze the product page and return a SINGLE valid JSON object. No prose, no markdown fences.

{_GLOBAL_SEO_BASE}

{_SEO_ADDITIONS[cat]}

Return this EXACT JSON structure (fill all fields, use null if not found).
CRITICAL SCORING RULE: All individual component `score` fields MUST be scored on a scale of 0.0 to 10.0. The `overall_seo_score` MUST be on a scale of 0 to 100.
CRITICAL LENGTH RULE: Your output MUST NOT exceed 4000 tokens. You MUST STRICTLY limit ALL arrays (especially `recommendations`, `issues`, `quick_wins`, `brand_compliance.issues`) to a MAXIMUM of 2 items. Limit ALL string values to 1 short sentence (under 15 words). If you output more than 2 items in any array, the system will CRASH.
{{
  "page_title": string, "page_type": "product|category|homepage|other",
  "detected_platform": "shopify|woocommerce|magento|bigcommerce|custom",
  "primary_keyword": string, "brand": string, "category": "{cat}",
  "title_tag": {{"value": string|null, "char_count": int, "status": "good|warning|missing", "keyword_present": bool, "brand_present": bool, "truncation_risk": bool, "has_cta_modifier": bool, "score": float, "issues": [string], "recommendation": string}},
  "meta_description": {{"value": string|null, "char_count": int, "status": "good|warning|missing", "keyword_present": bool, "has_cta": bool, "is_unique": bool, "score": float, "issues": [string], "recommendation": string}},
  "h1": {{"value": string|null, "count": int, "status": "good|warning|missing", "keyword_present": bool, "score": float, "issues": [string]}},
  "heading_hierarchy": {{"h2_count": int, "h3_count": int, "h2_examples": [string], "has_logical_flow": bool, "keyword_in_subheadings": bool, "question_based_headings": bool, "score": float, "issues": [string]}},
  "keyword_analysis": {{"primary_keyword": string, "secondary_keywords": [string], "density_pct": float, "entity_coverage": "low|medium|high", "placement": {{"in_title": bool, "in_h1": bool, "in_meta_description": bool, "in_first_100_words": bool, "in_url": bool}}, "keyword_stuffing_risk": bool, "score": float, "issues": [string]}},
  "content_quality": {{"word_count": int, "readability": "poor|average|good|excellent", "has_product_benefits": bool, "has_specs_table": bool, "has_use_cases": bool, "is_thin_content": bool, "generic_manufacturer_copy": bool, "content_depth": "thin|moderate|comprehensive", "score": float, "issues": [string]}},
  "image_seo": {{"total_images": int, "images_missing_alt": int, "images_with_descriptive_alt": int, "uses_modern_format": bool, "lazy_loading_detected": bool, "score": float, "issues": [string]}},
  "structured_data": {{"schemas_found": [string], "product_schema": {{"present": bool, "has_name": bool, "has_price": bool, "has_availability": bool, "has_sku": bool, "has_brand": bool, "has_gtin": bool, "has_description": bool, "has_image": bool}}, "review_schema": {{"present": bool, "has_aggregate_rating": bool, "has_review_count": bool}}, "breadcrumb_schema": bool, "faq_schema": bool, "organization_schema": bool, "score": float, "missing_schemas": [string], "issues": [string]}},
  "technical_seo": {{"canonical": {{"present": bool, "is_self_referencing": bool}}, "open_graph": {{"present": bool, "has_og_title": bool, "has_og_description": bool, "has_og_image": bool}}, "twitter_card": {{"present": bool}}, "ssl_https": bool, "mobile_viewport": bool, "robots_indexable": bool, "core_web_vitals": {{"overall_risk": "low|medium|high", "lcp_risk": "low|medium|high", "cls_risk": "low|medium|high", "inp_risk": "low|medium|high", "large_images_detected": bool, "render_blocking_scripts": bool}}, "score": float, "issues": [string]}},
  "url_structure": {{"url": string, "is_seo_friendly": bool, "keyword_in_url": bool, "is_clean": bool, "excessive_params": bool, "issues": [string]}},
  "links": {{"internal_count": int, "external_count": int, "has_breadcrumb_nav": bool, "has_related_products_section": bool, "score": float}},
  "category_specific": {{}},
  "overall_seo_score": float, "grade": "A|B|C|D|F",
  "score_breakdown": {{"on_page_pct": float, "technical_pct": float, "content_pct": float, "structured_data_pct": float}},
  "brand_compliance": {{
    "score": float,
    "issues": [{{"status": "violation|warning|compliant", "element": string, "issue": string, "fix": string, "reference": string}}],
    "persona_alignment": [{{"persona": string, "match_percentage": float, "reason": string}}]
  }},
  "critical_issues": [string], "quick_wins": [string],
  "recommendations": [{{"issue": string, "impact": "high|medium|low", "fix": string, "example": string, "category": "on-page|technical|content|structured-data|links"}}]
}}"""


def get_aeo_system_prompt(category: str) -> str:
    cat = category if category in _AEO_ADDITIONS else "generic"
    return f"""You are an AEO (Answer Engine Optimization) specialist. Analyze the page and return a SINGLE valid JSON object. No prose, no markdown fences.

{_GLOBAL_AEO_BASE}

{_AEO_ADDITIONS[cat]}

Return this EXACT JSON structure:
CRITICAL SCORING RULE: All individual component `score` fields MUST be scored on a scale of 0.0 to 10.0. The `overall_score` MUST be on a scale of 0 to 100.
CRITICAL LENGTH RULE: Your output MUST NOT exceed 4000 tokens. You MUST STRICTLY limit ALL arrays (especially `recommendations`, `issues`, `quick_wins`, `top_ai_queries_missed`, `gaps`, `brand_compliance.issues`) to a MAXIMUM of 2 items. Limit ALL string values to 1 short sentence. If you output more than 2 items in any array, the system will CRASH.
{{
  "ai_visibility_score": float, "ai_visibility_grade": "A|B|C|D|F", "category": "{cat}",
  "engine_likelihood": {{"google_ai_overview": "high|medium|low", "google_ai_overview_reason": string, "chatgpt": "high|medium|low", "chatgpt_reason": string, "perplexity": "high|medium|low", "gemini": "high|medium|low"}},
  "eeat": {{"overall_score": float, "experience": {{"score": float, "signals_found": [string], "signals_missing": [string], "explanation": string}}, "expertise": {{"score": float, "signals_found": [string], "signals_missing": [string], "explanation": string}}, "authoritativeness": {{"score": float, "signals_found": [string], "signals_missing": [string], "explanation": string}}, "trustworthiness": {{"score": float, "signals_found": [string], "signals_missing": [string], "explanation": string}}}},
  "rag_readiness": {{"score": float, "is_citable": bool, "has_unique_content": bool, "factual_claims_count": int, "has_unique_value_prop": bool, "is_generic_manufacturer_copy": bool, "content_chunking_quality": "poor|average|good", "issues": [string]}},
  "faq_quality": {{"faq_section_present": bool, "faq_count": int, "quality": "none|poor|average|good|excellent", "is_conversational": bool, "faq_schema_present": bool, "answers_are_direct": bool, "covers_buying_intent": bool, "score": float, "suggested_faqs": [string], "issues": [string]}},
  "conversational_readiness": {{"has_question_based_headings": bool, "uses_answer_first_structure": bool, "speakable_schema_present": bool, "direct_answer_format": bool, "semantic_richness": "low|medium|high", "content_depth": "thin|moderate|comprehensive", "score": float, "issues": [string]}},
  "schema_for_ai": {{"product_schema": bool, "faq_schema": bool, "breadcrumb_schema": bool, "review_schema": bool, "speakable_schema": bool, "score": float, "missing_high_impact": [string]}},
  "brand_clarity": {{"score": float, "brand_name_prominent": bool, "unique_brand_claims": bool, "social_proof_present": bool, "return_policy_present": bool, "contact_info_present": bool}},
  "category_specific_gaps": [string],
  "brand_compliance": {{
    "score": float,
    "issues": [{{"status": "violation|warning|compliant", "element": string, "issue": string, "fix": string, "reference": string}}],
    "persona_alignment": [{{"persona": string, "match_percentage": float, "reason": string}}]
  }},
  "top_ai_queries_missed": [{{"query": string, "reason": string, "fix": string}}],
  "quick_wins": [string],
  "recommendations": [{{"issue": string, "impact": "high|medium|low", "fix": string, "example": string, "category": "eeat|faq|schema|content|structure"}}],
  "gaps": [string]
}}"""
