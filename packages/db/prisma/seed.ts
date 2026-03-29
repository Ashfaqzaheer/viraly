import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const HOOKS = [
  // Tech
  { content: "This bug cost me 5 hours…", niches: ["tech"], relevanceScore: 95 },
  { content: "Stop doing this in your code…", niches: ["tech"], relevanceScore: 92 },
  { content: "Nobody tells developers this…", niches: ["tech"], relevanceScore: 90 },
  { content: "I mass-deleted 500 lines and everything still worked", niches: ["tech"], relevanceScore: 88 },
  { content: "The one VS Code shortcut that changed my life", niches: ["tech"], relevanceScore: 87 },
  { content: "Senior devs do this differently…", niches: ["tech"], relevanceScore: 86 },
  { content: "I got rejected from 50 companies. Then this happened.", niches: ["tech"], relevanceScore: 85 },
  { content: "Your code review is wrong. Here's why.", niches: ["tech"], relevanceScore: 84 },
  { content: "This AI tool writes better code than most juniors", niches: ["tech"], relevanceScore: 83 },
  { content: "I automated my entire job in 3 hours", niches: ["tech"], relevanceScore: 82 },
  // Fitness
  { content: "I did 100 pushups every day for 30 days", niches: ["fitness"], relevanceScore: 94 },
  { content: "Your trainer is lying to you about this…", niches: ["fitness"], relevanceScore: 91 },
  { content: "This exercise is destroying your back", niches: ["fitness"], relevanceScore: 89 },
  { content: "I lost 10kg without stepping in a gym", niches: ["fitness"], relevanceScore: 88 },
  { content: "The workout nobody talks about…", niches: ["fitness"], relevanceScore: 87 },
  { content: "Stop doing crunches. Do this instead.", niches: ["fitness"], relevanceScore: 86 },
  { content: "My physique after 1 year of consistency", niches: ["fitness"], relevanceScore: 85 },
  { content: "3 exercises that changed my body forever", niches: ["fitness"], relevanceScore: 84 },
  { content: "What I eat in a day to stay lean", niches: ["fitness"], relevanceScore: 83 },
  { content: "The protein myth nobody wants to hear", niches: ["fitness"], relevanceScore: 82 },
  // Finance
  { content: "I saved 50K by age 25. Here's how.", niches: ["finance"], relevanceScore: 93 },
  { content: "This money habit is keeping you broke", niches: ["finance"], relevanceScore: 91 },
  { content: "Rich people never tell you this…", niches: ["finance"], relevanceScore: 89 },
  { content: "I turned 1000 into 10000 in 6 months", niches: ["finance"], relevanceScore: 88 },
  { content: "Stop saving money. Do this instead.", niches: ["finance"], relevanceScore: 87 },
  { content: "The side hustle that pays my rent", niches: ["finance"], relevanceScore: 86 },
  { content: "3 apps that make me money while I sleep", niches: ["finance"], relevanceScore: 85 },
  { content: "Your bank is stealing from you. Here's proof.", niches: ["finance"], relevanceScore: 84 },
  // Comedy
  { content: "POV: Your boss checks your code", niches: ["comedy"], relevanceScore: 94 },
  { content: "When the client says 'small change'…", niches: ["comedy","tech"], relevanceScore: 92 },
  { content: "Nobody warned me adulting would be like this", niches: ["comedy","lifestyle"], relevanceScore: 90 },
  { content: "My brain at 3am vs during the meeting", niches: ["comedy"], relevanceScore: 88 },
  { content: "Things I say vs what I actually mean", niches: ["comedy"], relevanceScore: 87 },
  { content: "When you lie on your resume and get the job", niches: ["comedy"], relevanceScore: 86 },
  { content: "Expectation vs Reality of working from home", niches: ["comedy","lifestyle"], relevanceScore: 85 },
  { content: "The 5 stages of debugging", niches: ["comedy","tech"], relevanceScore: 84 },
  // Beauty
  { content: "This 2-minute routine cleared my skin", niches: ["beauty"], relevanceScore: 93 },
  { content: "Stop buying expensive skincare. Use this.", niches: ["beauty"], relevanceScore: 91 },
  { content: "The makeup trick nobody taught you", niches: ["beauty"], relevanceScore: 89 },
  { content: "I tried the viral skincare hack for 7 days", niches: ["beauty"], relevanceScore: 87 },
  { content: "Your dermatologist doesn't want you to know this", niches: ["beauty"], relevanceScore: 86 },
  // Food
  { content: "This 5-minute meal changed my life", niches: ["food"], relevanceScore: 94 },
  { content: "The recipe my grandma never shared", niches: ["food"], relevanceScore: 91 },
  { content: "You've been cooking pasta wrong your whole life", niches: ["food"], relevanceScore: 89 },
  { content: "3 ingredients. 10 minutes. Best meal ever.", niches: ["food"], relevanceScore: 88 },
  { content: "What I eat in a day as a busy creator", niches: ["food","lifestyle"], relevanceScore: 86 },
  // Lifestyle
  { content: "My morning routine that changed everything", niches: ["lifestyle"], relevanceScore: 93 },
  { content: "A day in my life as a content creator", niches: ["lifestyle"], relevanceScore: 91 },
  { content: "5 habits that made me a different person", niches: ["lifestyle"], relevanceScore: 89 },
  { content: "I quit social media for 30 days. Here's what happened.", niches: ["lifestyle"], relevanceScore: 87 },
  { content: "The one thing I wish I knew at 20", niches: ["lifestyle"], relevanceScore: 86 },
  // Education
  { content: "Learn this in 60 seconds", niches: ["education"], relevanceScore: 92 },
  { content: "The fact that will blow your mind today", niches: ["education"], relevanceScore: 90 },
  { content: "School never taught you this…", niches: ["education"], relevanceScore: 88 },
  { content: "I learned more in 5 minutes than 4 years of college", niches: ["education"], relevanceScore: 86 },
  // Travel
  { content: "The hidden spot tourists never find", niches: ["travel"], relevanceScore: 93 },
  { content: "I found paradise for under $50/day", niches: ["travel"], relevanceScore: 91 },
  { content: "Don't visit this place. Seriously.", niches: ["travel"], relevanceScore: 89 },
  // Fashion
  { content: "This outfit cost me less than $30", niches: ["fashion"], relevanceScore: 92 },
  { content: "The styling trick that makes any outfit look expensive", niches: ["fashion"], relevanceScore: 90 },
  { content: "3 pieces, 10 outfits. Watch this.", niches: ["fashion"], relevanceScore: 88 },
]

const TRENDS = [
  { title: "POV Storytelling", description: "First-person narrative reels with dramatic hooks that pull viewers into a story. The POV format creates instant immersion.", exampleFormat: "POV: Your boss checks your code and finds console.log everywhere", engagementLiftPercent: 320, niche: "tech" },
  { title: "Silent Aesthetic Vlog", description: "No talking, just aesthetic clips with text overlays and trending lo-fi audio. Minimal editing, maximum vibes.", exampleFormat: "A calm morning: wake up → coffee → desk setup → deep work", engagementLiftPercent: 280, niche: "lifestyle" },
  { title: "Myth vs Fact", description: "Quick debunking format with bold text overlays. Start with the myth, dramatic pause, then reveal the truth.", exampleFormat: "MYTH: You need 8 glasses of water a day. FACT: It depends on your body weight.", engagementLiftPercent: 250, niche: "fitness" },
  { title: "3-Second Hook + Tutorial", description: "Start with a shocking result in the first 3 seconds, then show how you did it. Reverse-reveal format.", exampleFormat: "Look at this result → Here's exactly how I did it in 5 steps", engagementLiftPercent: 310, niche: "beauty" },
  { title: "Money Math Breakdown", description: "On-screen calculations showing exactly how much you earn, save, or invest. Transparency builds trust.", exampleFormat: "I make $X/month from reels. Here's the exact breakdown.", engagementLiftPercent: 290, niche: "finance" },
  { title: "Expectation vs Reality", description: "Split format showing the glamorous expectation vs the messy reality. Beat drop on the transition.", exampleFormat: "What I thought freelancing would be vs what it actually is", engagementLiftPercent: 270, niche: "comedy" },
  { title: "ASMR Recipe Reels", description: "Overhead cooking shots with satisfying sounds — chopping, sizzling, plating. No voiceover needed.", exampleFormat: "Close-up: knife cutting vegetables → pan sizzle → beautiful plate", engagementLiftPercent: 240, niche: "food" },
  { title: "Hidden Gems Series", description: "Showcasing underrated spots, tools, or products that your audience doesn't know about yet.", exampleFormat: "This cafe in [city] has the best view and nobody knows about it", engagementLiftPercent: 260, niche: "travel" },
  { title: "Study With Me / Work With Me", description: "Real-time or time-lapse of focused work sessions. Viewers use it as motivation to be productive.", exampleFormat: "2-hour study session time-lapse with lo-fi beats", engagementLiftPercent: 230, niche: "education" },
  { title: "Outfit Transition", description: "Quick outfit changes synced to beat drops. The snap transition is key.", exampleFormat: "Casual → Business → Night out — 3 looks, 1 wardrobe", engagementLiftPercent: 275, niche: "fashion" },
  { title: "Day in My Life (Creator Edition)", description: "Behind-the-scenes of content creation — filming, editing, posting, checking analytics.", exampleFormat: "6AM wake up → film 3 reels → edit → post → check stats at night", engagementLiftPercent: 300, niche: "lifestyle" },
  { title: "Hot Take / Unpopular Opinion", description: "Start with a controversial statement to trigger comments. Back it up with evidence.", exampleFormat: "Unpopular opinion: You don't need a degree to make 6 figures", engagementLiftPercent: 340, niche: "finance" },
]

const MONETIZATION_DATA = [
  {
    title: "Foundation: Building Your Creator Brand",
    order: 1,
    lessons: [
      { title: "Define Your Niche & Unique Value", body: "Your niche is your superpower. Pick one topic you can talk about for hours without getting bored. Then find your angle — what makes YOUR take different from everyone else's?\n\nAction steps:\n1. List 3 topics you're passionate about\n2. Research who's already creating in those spaces\n3. Find the gap — what's missing that YOU can provide?\n4. Write your creator statement: 'I help [audience] achieve [result] through [your unique method]'\n\nExample: 'I help beginner developers land their first job through real-world project tutorials'\n\nYour niche should be specific enough to attract a loyal audience but broad enough to create content consistently.", estimatedReadMin: 4, order: 1, audienceLevel: "beginner" },
      { title: "Optimize Your Instagram Profile for Growth", body: "Your profile is your landing page. You have 3 seconds to convince someone to follow you.\n\nProfile checklist:\n1. Profile photo: Clear face shot or recognizable brand logo\n2. Username: Simple, memorable, searchable (avoid underscores and numbers)\n3. Bio line 1: What you do (e.g., 'Teaching you to code in 60 seconds')\n4. Bio line 2: Social proof (e.g., '50K+ developers helped')\n5. Bio line 3: CTA (e.g., 'Free coding roadmap below 👇')\n6. Link: Use a link-in-bio tool (Topmate, Linktree, or Bento)\n\nPro tip: Change your bio CTA monthly to match your current offer or content theme.", estimatedReadMin: 3, order: 2, audienceLevel: "beginner" },
      { title: "Content Pillars: Plan What to Post", body: "Content pillars are 3-5 recurring themes that make up your content strategy. They keep you consistent and help your audience know what to expect.\n\nExample pillars for a fitness creator:\n1. Workout tutorials (educational)\n2. Meal prep ideas (practical value)\n3. Transformation stories (inspirational)\n4. Gym fails/humor (entertainment)\n5. Product reviews (trust-building)\n\nRule of thumb:\n- 40% educational/value content\n- 30% entertaining/relatable content\n- 20% personal/behind-the-scenes\n- 10% promotional/sales content\n\nCreate a content calendar and batch-film 5-7 reels per week.", estimatedReadMin: 5, order: 3, audienceLevel: "beginner" },
    ],
  },
  {
    title: "Growth Engine: From 0 to 10K Followers",
    order: 2,
    lessons: [
      { title: "The Algorithm Decoded", body: "Instagram's algorithm prioritizes content that keeps people on the platform. Here's what actually matters:\n\n1. Watch time: The #1 signal. If people watch your reel to the end (or rewatch), Instagram pushes it harder.\n2. Shares: When someone sends your reel via DM, that's the strongest engagement signal.\n3. Saves: People bookmarking your content tells Instagram it has lasting value.\n4. Comments: Especially longer comments and replies.\n5. Follows from reel: If someone follows you after watching, that reel gets boosted.\n\nWhat DOESN'T matter as much: likes (lowest weight), hashtags (minimal impact in 2024+), posting time (matters less than content quality).\n\nOptimize for watch time and shares above everything else.", estimatedReadMin: 4, order: 1, audienceLevel: "beginner" },
      { title: "Hook Mastery: The First 1.5 Seconds", body: "You have 1.5 seconds before someone scrolls past your reel. Your hook must stop the scroll instantly.\n\nHook formulas that work:\n1. Curiosity gap: 'Nobody talks about this...' / 'The thing I wish I knew...'\n2. Bold claim: 'This one change doubled my engagement'\n3. Pattern interrupt: Start mid-action, use unexpected visuals\n4. Direct address: 'If you're a [niche] creator, watch this'\n5. Controversy: 'Unpopular opinion: [statement]'\n\nRules:\n- Never start with 'Hey guys' or 'So today I want to...'\n- Show, don't tell — visual hooks beat text hooks\n- Match your hook energy to your content energy\n- Test 3 different hooks for the same content and see which performs best", estimatedReadMin: 3, order: 2, audienceLevel: "beginner" },
      { title: "Hashtag & SEO Strategy", body: "Hashtags aren't dead — they're just different now. Instagram uses them for categorization, not discovery.\n\nStrategy:\n1. Use 5-8 hashtags max (not 30)\n2. Mix: 2 broad (#reels, #contentcreator), 3 niche-specific (#techreels, #codinghumor), 2 community (#devtok, #learntocode)\n3. Put hashtags in the caption, not comments\n4. Rotate hashtags — don't copy-paste the same set\n\nInstagram SEO (more important than hashtags):\n- Your caption's first line is searchable — include keywords\n- Alt text on posts helps categorization\n- Your bio keywords affect what searches you appear in\n- Consistent topic posting trains the algorithm to categorize you", estimatedReadMin: 4, order: 3, audienceLevel: "intermediate" },
      { title: "Collaboration & Cross-Promotion", body: "Growing alone is slow. Collaborations can 10x your growth speed.\n\nTypes of collabs:\n1. Duets/Stitches: React to or build on another creator's content\n2. Joint Lives: Go live together — both audiences see it\n3. Shoutout exchanges: Feature each other in stories\n4. Challenge creation: Start a trend and tag creators to join\n\nHow to find collab partners:\n- Same niche, similar follower count (within 2x)\n- Complementary content styles\n- DM with specific value proposition, not 'let's collab'\n\nTemplate: 'Hey [name], loved your reel about [topic]. I have an idea for a collab that would work for both our audiences — [specific idea]. Interested?'", estimatedReadMin: 3, order: 4, audienceLevel: "intermediate" },
    ],
  },
  {
    title: "Revenue Streams: Making Your First Dollar",
    order: 3,
    lessons: [
      { title: "Brand Deals & Sponsorships", body: "You don't need 100K followers to get brand deals. Micro-creators (1K-10K) often get better engagement rates and brands know this.\n\nHow to land your first deal:\n1. Create a media kit (1-page PDF): bio, niche, follower count, engagement rate, content examples, rates\n2. Pitch brands you already use — authenticity converts\n3. Start with product-for-post deals to build your portfolio\n4. Use platforms: Winkl, Plixxo, ClanConnect, or just DM brands directly on Instagram\n\nPricing guide (Indian market):\n- Under 5K followers: ₹2,000-5,000 per reel\n- 5K-25K: ₹5,000-20,000 per reel\n- 25K-100K: ₹20,000-75,000 per reel\n- 100K+: ₹75,000-3,00,000+ per reel\n\nNever accept a deal that doesn't align with your niche. One off-brand post can confuse your audience and hurt growth.", estimatedReadMin: 5, order: 1, audienceLevel: "beginner" },
      { title: "Affiliate Marketing That Actually Works", body: "Affiliate marketing lets you earn commission by recommending products. The key is recommending things you genuinely use.\n\nSetup:\n1. Join affiliate programs: Amazon Associates India (affiliate-program.amazon.in), Flipkart Affiliate, EarnKaro, or direct brand programs\n2. Get your unique links\n3. Add to your link-in-bio (use Topmate or Linktree)\n4. Create content that naturally features the product\n\nContent that converts:\n- 'Things I use daily as a [niche] creator' — list format\n- Honest reviews with pros AND cons (builds trust)\n- Tutorial content where the product is essential\n- 'Amazon finds' or 'desk setup' reels\n\nAmazon Associates India pays up to 10% commission. EarnKaro gives up to 10.8% on Amazon products with INR payouts directly to your bank.\n\nPro tip: Track which links get clicks. Double down on what your audience actually wants to buy.", estimatedReadMin: 4, order: 2, audienceLevel: "beginner" },
      { title: "Digital Products & Services", body: "Digital products have the highest profit margins because you create once and sell forever.\n\nProduct ideas by niche:\n- Fitness: Workout plans, meal prep guides, transformation programs\n- Tech: Code templates, Notion dashboards, course materials\n- Beauty: Skincare routines, preset packs, tutorial bundles\n- Finance: Budget spreadsheets, investment trackers\n- Lifestyle: Planning templates, habit trackers\n\nPlatforms to sell (India-friendly with INR payouts):\n- Topmate.io (built for Indian creators, 10% fee, sells products + courses + 1:1 sessions)\n- Instamojo (Indian platform, payment links + online store, supports UPI/cards)\n- Graphy (best for courses, Indian company, GST invoices, starts free)\n- Gumroad (works via Stripe in India, 10% fee — verify your bank is supported)\n\nPricing: Start at ₹199-999 for your first product. The goal is to validate demand, not maximize revenue. Once you have 50+ sales, raise prices.", estimatedReadMin: 4, order: 3, audienceLevel: "intermediate" },
    ],
  },
  {
    title: "Scaling: Building a Creator Business",
    order: 4,
    lessons: [
      { title: "Email List & Owned Audience", body: "Social media followers are rented. Your email list is owned. If Instagram disappears tomorrow, your email list survives.\n\nWhy email matters:\n- 40x higher conversion rate than social media\n- Direct access to your audience without algorithm interference\n- Essential for launching products and services\n\nHow to build your list:\n1. Create a lead magnet (free resource that solves a specific problem)\n2. Add it to your link-in-bio with a clear CTA\n3. Mention it in your reels: 'Free [resource] — link in bio'\n4. Use Mailchimp (free up to 500 contacts), Beehiiv, or ConvertKit\n\nEmail content:\n- Weekly newsletter with exclusive tips\n- Behind-the-scenes content\n- Early access to new products\n- Personal stories that build connection\n\nAll three platforms work in India and support INR billing. Mailchimp's free tier is the best starting point.", estimatedReadMin: 4, order: 1, audienceLevel: "intermediate" },
      { title: "Diversifying Revenue", body: "Relying on one income stream is risky. Successful creators have 3-5 revenue sources.\n\nRevenue stack example:\n1. Brand deals: 40% of income\n2. Digital products: 25% of income\n3. Affiliate marketing: 15% of income\n4. Coaching/consulting: 15% of income\n5. Ad revenue (Reels bonus): 5% of income\n\nHow to add streams gradually:\n- Month 1-3: Focus on growth + first affiliate links\n- Month 3-6: Land first brand deal + create first digital product\n- Month 6-12: Launch email list + coaching offer\n- Year 2+: Course creation + community membership\n\nKey principle: Each new revenue stream should complement your content, not distract from it.", estimatedReadMin: 5, order: 2, audienceLevel: "intermediate" },
      { title: "Analytics & Optimization", body: "What gets measured gets improved. Check your analytics weekly and adjust your strategy.\n\nKey metrics to track:\n1. Reach: How many unique accounts saw your content\n2. Engagement rate: (likes + comments + saves + shares) / reach × 100\n3. Follower growth rate: New followers per week\n4. Best performing content: What topics/formats get the most reach\n5. Audience demographics: Age, location, active hours\n\nWeekly review process:\n1. Identify your top 3 performing reels — what do they have in common?\n2. Identify your bottom 3 — what went wrong?\n3. Check which hooks got the highest watch time\n4. Adjust next week's content plan based on data\n\nTarget benchmarks:\n- Engagement rate: 3-6% is good, 6%+ is excellent\n- Reel views: Should be 2-5x your follower count\n- Save rate: 2-3% means your content has lasting value", estimatedReadMin: 5, order: 3, audienceLevel: "advanced" },
    ],
  },
]

// ── TREND ENGINE DATA ────────────────────────────────────────────────────────

const TREND_SIGNALS = [
  // Tech
  { niche: "tech", hook: "This bug cost me 5 hours of debugging", formatType: "talking_head", structureType: "problem_solution", engagementScore: 95, source: "manual" },
  { niche: "tech", hook: "Stop doing this in production", formatType: "screen_recording", structureType: "list", engagementScore: 92, source: "manual" },
  { niche: "tech", hook: "Nobody tells junior developers this secret", formatType: "talking_head", structureType: "story", engagementScore: 90, source: "manual" },
  { niche: "tech", hook: "I mass-deleted 500 lines and everything still worked", formatType: "screen_recording", structureType: "before_after", engagementScore: 88, source: "manual" },
  { niche: "tech", hook: "Senior devs do this differently and nobody notices", formatType: "mixed", structureType: "problem_solution", engagementScore: 86, source: "manual" },
  { niche: "tech", hook: "POV: Your first day at a FAANG company", formatType: "mixed", structureType: "pov", engagementScore: 94, source: "manual" },
  { niche: "tech", hook: "I automated my entire job in 3 hours using AI", formatType: "screen_recording", structureType: "tutorial", engagementScore: 91, source: "manual" },
  { niche: "tech", hook: "The VS Code extension that changed my workflow forever", formatType: "screen_recording", structureType: "tutorial", engagementScore: 85, source: "manual" },
  { niche: "tech", hook: "I got rejected from 50 companies then this happened", formatType: "talking_head", structureType: "story", engagementScore: 89, source: "manual" },
  { niche: "tech", hook: "Your code review is wrong and here is why", formatType: "screen_recording", structureType: "problem_solution", engagementScore: 84, source: "manual" },
  // Fitness
  { niche: "fitness", hook: "I did 100 pushups every day for 30 days", formatType: "mixed", structureType: "before_after", engagementScore: 94, source: "manual" },
  { niche: "fitness", hook: "Your trainer is lying to you about protein", formatType: "talking_head", structureType: "problem_solution", engagementScore: 91, source: "manual" },
  { niche: "fitness", hook: "This exercise is destroying your lower back", formatType: "mixed", structureType: "problem_solution", engagementScore: 89, source: "manual" },
  { niche: "fitness", hook: "I lost 10kg without stepping in a gym once", formatType: "talking_head", structureType: "story", engagementScore: 88, source: "manual" },
  { niche: "fitness", hook: "Stop doing crunches. Do this instead for abs.", formatType: "mixed", structureType: "problem_solution", engagementScore: 86, source: "manual" },
  { niche: "fitness", hook: "My physique after 1 year of consistency", formatType: "mixed", structureType: "before_after", engagementScore: 85, source: "manual" },
  { niche: "fitness", hook: "3 exercises that completely transformed my body", formatType: "voiceover", structureType: "list", engagementScore: 84, source: "manual" },
  { niche: "fitness", hook: "What I eat in a day to stay lean year round", formatType: "aesthetic", structureType: "list", engagementScore: 83, source: "manual" },
  // Finance
  { niche: "finance", hook: "I saved 5 lakhs by age 25 using this method", formatType: "talking_head", structureType: "story", engagementScore: 93, source: "manual" },
  { niche: "finance", hook: "This money habit is keeping you broke forever", formatType: "talking_head", structureType: "problem_solution", engagementScore: 91, source: "manual" },
  { niche: "finance", hook: "Rich people never tell you this about investing", formatType: "talking_head", structureType: "story", engagementScore: 89, source: "manual" },
  { niche: "finance", hook: "Stop saving money in a bank. Do this instead.", formatType: "mixed", structureType: "problem_solution", engagementScore: 87, source: "manual" },
  { niche: "finance", hook: "The side hustle that pays my rent every month", formatType: "talking_head", structureType: "story", engagementScore: 86, source: "manual" },
  { niche: "finance", hook: "3 apps that make me money while I sleep", formatType: "screen_recording", structureType: "list", engagementScore: 85, source: "manual" },
  // Comedy
  { niche: "comedy", hook: "POV: Your boss checks your code at 5pm Friday", formatType: "mixed", structureType: "pov", engagementScore: 94, source: "manual" },
  { niche: "comedy", hook: "When the client says just a small change", formatType: "talking_head", structureType: "pov", engagementScore: 92, source: "manual" },
  { niche: "comedy", hook: "Nobody warned me adulting would be like this", formatType: "mixed", structureType: "story", engagementScore: 90, source: "manual" },
  { niche: "comedy", hook: "Things I say vs what I actually mean at work", formatType: "mixed", structureType: "before_after", engagementScore: 88, source: "manual" },
  { niche: "comedy", hook: "Expectation vs Reality of working from home", formatType: "mixed", structureType: "before_after", engagementScore: 85, source: "manual" },
  // Beauty
  { niche: "beauty", hook: "This 2-minute routine cleared my skin completely", formatType: "mixed", structureType: "tutorial", engagementScore: 93, source: "manual" },
  { niche: "beauty", hook: "Stop buying expensive skincare. Use this instead.", formatType: "talking_head", structureType: "problem_solution", engagementScore: 91, source: "manual" },
  { niche: "beauty", hook: "The makeup trick nobody taught you in school", formatType: "mixed", structureType: "tutorial", engagementScore: 89, source: "manual" },
  { niche: "beauty", hook: "I tried the viral skincare hack for 7 days straight", formatType: "mixed", structureType: "before_after", engagementScore: 87, source: "manual" },
  // Food
  { niche: "food", hook: "This 5-minute meal changed my entire week", formatType: "aesthetic", structureType: "tutorial", engagementScore: 94, source: "manual" },
  { niche: "food", hook: "The recipe my grandma never shared with anyone", formatType: "voiceover", structureType: "story", engagementScore: 91, source: "manual" },
  { niche: "food", hook: "You have been cooking pasta wrong your whole life", formatType: "mixed", structureType: "problem_solution", engagementScore: 89, source: "manual" },
  { niche: "food", hook: "3 ingredients. 10 minutes. Best meal ever.", formatType: "aesthetic", structureType: "list", engagementScore: 88, source: "manual" },
  // Lifestyle
  { niche: "lifestyle", hook: "My morning routine that changed everything", formatType: "aesthetic", structureType: "list", engagementScore: 93, source: "manual" },
  { niche: "lifestyle", hook: "A day in my life as a content creator in India", formatType: "aesthetic", structureType: "story", engagementScore: 91, source: "manual" },
  { niche: "lifestyle", hook: "5 habits that made me a completely different person", formatType: "talking_head", structureType: "list", engagementScore: 89, source: "manual" },
  { niche: "lifestyle", hook: "I quit social media for 30 days. Here is what happened.", formatType: "talking_head", structureType: "before_after", engagementScore: 87, source: "manual" },
  // Education
  { niche: "education", hook: "Learn this concept in 60 seconds flat", formatType: "screen_recording", structureType: "tutorial", engagementScore: 92, source: "manual" },
  { niche: "education", hook: "The fact that will blow your mind today", formatType: "talking_head", structureType: "story", engagementScore: 90, source: "manual" },
  { niche: "education", hook: "School never taught you this critical skill", formatType: "talking_head", structureType: "problem_solution", engagementScore: 88, source: "manual" },
]

const TREND_CLUSTERS = [
  // Tech
  { name: "Mistake-Based Dev Content", niche: "tech", description: "Scripts built around coding mistakes, bugs, and debugging horror stories. High relatability drives shares.", strength: 94, growthPercent: 280, exampleHooks: ["This bug cost me 5 hours", "Stop doing this in production", "Your code review is wrong"] },
  { name: "POV Developer Life", niche: "tech", description: "First-person narrative of developer experiences. Creates instant immersion and comment engagement.", strength: 91, growthPercent: 320, exampleHooks: ["POV: Your first day at FAANG", "POV: The client says small change", "POV: Deploying on Friday"] },
  { name: "Tool & Productivity Hacks", niche: "tech", description: "Quick tutorials showing tools, shortcuts, and automation. High save rate.", strength: 87, growthPercent: 210, exampleHooks: ["The VS Code extension that changed my life", "I automated my job in 3 hours", "This AI tool writes better code"] },
  { name: "Career Story Arc", niche: "tech", description: "Personal journey stories about rejections, breakthroughs, and career pivots.", strength: 85, growthPercent: 190, exampleHooks: ["I got rejected from 50 companies", "Senior devs do this differently", "Nobody tells junior developers this"] },
  // Fitness
  { name: "Transformation Challenge", niche: "fitness", description: "Before/after content with specific timeframes. Drives saves and shares.", strength: 93, growthPercent: 260, exampleHooks: ["100 pushups for 30 days", "My physique after 1 year", "I lost 10kg without a gym"] },
  { name: "Myth Busting Fitness", niche: "fitness", description: "Debunking common fitness myths. Triggers comments and debates.", strength: 90, growthPercent: 250, exampleHooks: ["Your trainer is lying", "This exercise destroys your back", "Stop doing crunches"] },
  { name: "What I Eat In A Day", niche: "fitness", description: "Daily nutrition content with aesthetic food shots. High save rate.", strength: 84, growthPercent: 180, exampleHooks: ["What I eat to stay lean", "3 exercises that transformed my body", "The protein myth"] },
  // Finance
  { name: "Money Mistake Awareness", niche: "finance", description: "Content about financial mistakes and hidden costs. Fear-driven engagement.", strength: 91, growthPercent: 290, exampleHooks: ["This habit keeps you broke", "Stop saving in a bank", "Your bank is stealing from you"] },
  { name: "Side Hustle & Passive Income", niche: "finance", description: "Income stories and passive income strategies. Aspiration-driven.", strength: 88, growthPercent: 240, exampleHooks: ["Side hustle pays my rent", "3 apps make me money", "I saved 5 lakhs by 25"] },
  // Comedy
  { name: "Workplace POV Comedy", niche: "comedy", description: "Relatable workplace humor in POV format. Highest share rate across niches.", strength: 93, growthPercent: 340, exampleHooks: ["POV: Boss checks your code", "When client says small change", "Expectation vs Reality WFH"] },
  // Beauty
  { name: "Quick Routine Reveals", niche: "beauty", description: "Short routine content with dramatic before/after. Drives saves.", strength: 91, growthPercent: 230, exampleHooks: ["2-minute routine cleared my skin", "Stop buying expensive skincare", "The makeup trick nobody taught you"] },
  // Food
  { name: "Quick Meal Magic", niche: "food", description: "Ultra-fast recipes with aesthetic presentation. ASMR-style cooking.", strength: 92, growthPercent: 240, exampleHooks: ["5-minute meal changed my life", "3 ingredients 10 minutes", "You cook pasta wrong"] },
  // Lifestyle
  { name: "Routine & Habit Content", niche: "lifestyle", description: "Morning routines, daily vlogs, and habit transformation content.", strength: 90, growthPercent: 220, exampleHooks: ["Morning routine that changed everything", "Day in my life as creator", "5 habits that changed me"] },
  // Education
  { name: "60-Second Learning", niche: "education", description: "Micro-learning content that teaches one concept fast. High save rate.", strength: 89, growthPercent: 200, exampleHooks: ["Learn this in 60 seconds", "School never taught you this", "Mind-blowing fact today"] },
]

const TREND_PATTERNS = [
  // Tech patterns
  { niche: "tech", hookTemplate: "This [mistake/bug] cost me [time period]...", hookType: "mistake", structureType: "problem_solution", emotionType: "relatability", formatType: "talking_head", trendScore: 95 },
  { niche: "tech", hookTemplate: "Stop doing [bad practice] in [context]...", hookType: "bold_claim", structureType: "problem_solution", emotionType: "fear", formatType: "screen_recording", trendScore: 92 },
  { niche: "tech", hookTemplate: "Nobody tells [audience] this about [topic]...", hookType: "curiosity", structureType: "story", emotionType: "curiosity", formatType: "talking_head", trendScore: 90 },
  { niche: "tech", hookTemplate: "POV: [relatable developer scenario]", hookType: "pov", structureType: "pov", emotionType: "humor", formatType: "mixed", trendScore: 94 },
  { niche: "tech", hookTemplate: "I [automated/built] [thing] in [short time]", hookType: "bold_claim", structureType: "tutorial", emotionType: "inspiration", formatType: "screen_recording", trendScore: 88 },
  { niche: "tech", hookTemplate: "The [tool/extension] that changed my [workflow]", hookType: "curiosity", structureType: "tutorial", emotionType: "curiosity", formatType: "screen_recording", trendScore: 85 },
  { niche: "tech", hookTemplate: "I got rejected from [number] companies. Then [twist].", hookType: "storytelling", structureType: "story", emotionType: "inspiration", formatType: "talking_head", trendScore: 87 },
  // Fitness patterns
  { niche: "fitness", hookTemplate: "I did [exercise] every day for [time]. Results:", hookType: "bold_claim", structureType: "before_after", emotionType: "curiosity", formatType: "mixed", trendScore: 94 },
  { niche: "fitness", hookTemplate: "Your [authority] is lying to you about [topic]", hookType: "controversy", structureType: "problem_solution", emotionType: "shock", formatType: "talking_head", trendScore: 91 },
  { niche: "fitness", hookTemplate: "This [exercise] is destroying your [body part]", hookType: "mistake", structureType: "problem_solution", emotionType: "fear", formatType: "mixed", trendScore: 89 },
  { niche: "fitness", hookTemplate: "I [achieved result] without [expected method]", hookType: "bold_claim", structureType: "story", emotionType: "inspiration", formatType: "talking_head", trendScore: 88 },
  { niche: "fitness", hookTemplate: "Stop doing [exercise]. Do this instead.", hookType: "mistake", structureType: "problem_solution", emotionType: "curiosity", formatType: "mixed", trendScore: 86 },
  // Finance patterns
  { niche: "finance", hookTemplate: "I saved [amount] by age [age]. Here is how.", hookType: "bold_claim", structureType: "story", emotionType: "inspiration", formatType: "talking_head", trendScore: 93 },
  { niche: "finance", hookTemplate: "This [habit] is keeping you [negative outcome]", hookType: "mistake", structureType: "problem_solution", emotionType: "fear", formatType: "talking_head", trendScore: 91 },
  { niche: "finance", hookTemplate: "Stop [common action]. Do this instead.", hookType: "bold_claim", structureType: "problem_solution", emotionType: "curiosity", formatType: "mixed", trendScore: 87 },
  { niche: "finance", hookTemplate: "[Number] apps that make me money while I sleep", hookType: "list", structureType: "list", emotionType: "curiosity", formatType: "screen_recording", trendScore: 85 },
  // Comedy patterns
  { niche: "comedy", hookTemplate: "POV: [relatable workplace/life scenario]", hookType: "pov", structureType: "pov", emotionType: "humor", formatType: "mixed", trendScore: 94 },
  { niche: "comedy", hookTemplate: "When [authority figure] says [trigger phrase]", hookType: "storytelling", structureType: "pov", emotionType: "humor", formatType: "talking_head", trendScore: 92 },
  { niche: "comedy", hookTemplate: "Expectation vs Reality of [activity]", hookType: "pov", structureType: "before_after", emotionType: "humor", formatType: "mixed", trendScore: 88 },
  { niche: "comedy", hookTemplate: "[Thing] I say vs what I actually mean", hookType: "pov", structureType: "before_after", emotionType: "relatability", formatType: "mixed", trendScore: 86 },
  // Beauty patterns
  { niche: "beauty", hookTemplate: "This [time]-minute routine [dramatic result]", hookType: "bold_claim", structureType: "tutorial", emotionType: "curiosity", formatType: "mixed", trendScore: 93 },
  { niche: "beauty", hookTemplate: "Stop buying [expensive thing]. Use this instead.", hookType: "mistake", structureType: "problem_solution", emotionType: "curiosity", formatType: "talking_head", trendScore: 91 },
  { niche: "beauty", hookTemplate: "I tried the viral [product/hack] for [days]", hookType: "storytelling", structureType: "before_after", emotionType: "curiosity", formatType: "mixed", trendScore: 87 },
  // Food patterns
  { niche: "food", hookTemplate: "This [time]-minute meal changed my [timeframe]", hookType: "bold_claim", structureType: "tutorial", emotionType: "curiosity", formatType: "aesthetic", trendScore: 94 },
  { niche: "food", hookTemplate: "You have been [cooking method] wrong your whole life", hookType: "mistake", structureType: "problem_solution", emotionType: "shock", formatType: "mixed", trendScore: 89 },
  { niche: "food", hookTemplate: "[Number] ingredients. [Time]. [Superlative] meal.", hookType: "list", structureType: "list", emotionType: "curiosity", formatType: "aesthetic", trendScore: 88 },
  // Lifestyle patterns
  { niche: "lifestyle", hookTemplate: "My [routine] that changed everything", hookType: "bold_claim", structureType: "list", emotionType: "inspiration", formatType: "aesthetic", trendScore: 93 },
  { niche: "lifestyle", hookTemplate: "A day in my life as a [role]", hookType: "storytelling", structureType: "story", emotionType: "curiosity", formatType: "aesthetic", trendScore: 91 },
  { niche: "lifestyle", hookTemplate: "[Number] habits that made me a different person", hookType: "list", structureType: "list", emotionType: "inspiration", formatType: "talking_head", trendScore: 89 },
  { niche: "lifestyle", hookTemplate: "I quit [thing] for [days]. Here is what happened.", hookType: "storytelling", structureType: "before_after", emotionType: "curiosity", formatType: "talking_head", trendScore: 87 },
  // Education patterns
  { niche: "education", hookTemplate: "Learn [topic] in [short time]", hookType: "bold_claim", structureType: "tutorial", emotionType: "curiosity", formatType: "screen_recording", trendScore: 92 },
  { niche: "education", hookTemplate: "School never taught you [critical skill]", hookType: "controversy", structureType: "problem_solution", emotionType: "curiosity", formatType: "talking_head", trendScore: 88 },
  { niche: "education", hookTemplate: "The fact that will blow your mind today", hookType: "curiosity", structureType: "story", emotionType: "shock", formatType: "talking_head", trendScore: 90 },
]


async function main() {
  console.log('🌱 Seeding database...')

  // Seed Hooks
  console.log(`  → Seeding ${HOOKS.length} hooks...`)
  for (const hook of HOOKS) {
    await prisma.hook.create({ data: hook })
  }
  console.log(`  ✅ ${HOOKS.length} hooks created`)

  // Seed Trends
  console.log(`  → Seeding ${TRENDS.length} trends...`)
  for (const trend of TRENDS) {
    await prisma.trend.create({ data: trend })
  }
  console.log(`  ✅ ${TRENDS.length} trends created`)

  // Seed Monetization Modules & Lessons
  console.log(`  → Seeding ${MONETIZATION_DATA.length} monetization modules...`)
  for (const mod of MONETIZATION_DATA) {
    const created = await prisma.monetizationModule.create({
      data: {
        title: mod.title,
        order: mod.order,
      },
    })
    for (const lesson of mod.lessons) {
      await prisma.monetizationLesson.create({
        data: {
          moduleId: created.id,
          title: lesson.title,
          body: lesson.body,
          estimatedReadMin: lesson.estimatedReadMin,
          order: lesson.order,
          audienceLevel: lesson.audienceLevel,
        },
      })
    }
    console.log(`    ✅ Module "${mod.title}" with ${mod.lessons.length} lessons`)
  }


  // Seed Trend Signals
  console.log(`  → Seeding ${TREND_SIGNALS.length} trend signals...`)
  for (const signal of TREND_SIGNALS) {
    await prisma.trendSignal.create({ data: signal })
  }
  console.log(`  ✅ ${TREND_SIGNALS.length} trend signals created`)

  // Seed Trend Clusters
  console.log(`  → Seeding ${TREND_CLUSTERS.length} trend clusters...`)
  const clusterMap: Record<string, string> = {}
  for (const cluster of TREND_CLUSTERS) {
    const created = await prisma.trendCluster.create({ data: cluster })
    clusterMap[cluster.name] = created.id
  }
  console.log(`  ✅ ${TREND_CLUSTERS.length} trend clusters created`)

  // Seed Trend Patterns (link to clusters by niche match)
  console.log(`  → Seeding ${TREND_PATTERNS.length} trend patterns...`)
  for (const pattern of TREND_PATTERNS) {
    // Find best matching cluster for this pattern
    const matchingCluster = TREND_CLUSTERS.find(c => c.niche === pattern.niche && c.exampleHooks.some(h => {
      const hookWords = new Set(h.toLowerCase().split(/\s+/))
      const templateWords = new Set(pattern.hookTemplate.toLowerCase().split(/\s+/))
      let overlap = 0
      for (const w of hookWords) { if (templateWords.has(w)) overlap++ }
      return overlap >= 2
    }))
    await prisma.trendPattern.create({
      data: {
        ...pattern,
        clusterId: matchingCluster ? clusterMap[matchingCluster.name] : undefined,
      },
    })
  }
  console.log(`  ✅ ${TREND_PATTERNS.length} trend patterns created`)

  console.log('🎉 Seed complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
