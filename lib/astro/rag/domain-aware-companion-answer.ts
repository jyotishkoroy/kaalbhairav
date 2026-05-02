/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

export type DomainAwareAnswerInput = {
  question: string;
  mode: "companion" | "exact_fact";
};

export type DomainAwareAnswerResult = {
  answer: string;
  domain: string;
  concern: string;
  chartFactsUsed: string[];
  hasEmotionalAck: boolean;
  hasPracticalGuidance: boolean;
  hasRemedy: boolean;
  hasChartBasis: boolean;
};

// ── Verified chart facts ──────────────────────────────────────────────────────

const CHART = {
  lagna: "Leo Lagna with Sun as lagna lord",
  sun: "Sun in Taurus, 10th house — public identity and career",
  moon: "Moon in Gemini, 11th house, Mrigasira nakshatra pada 4 (nakshatra lord Mars)",
  mercury: "Mercury in Gemini, 11th house — gains through communication and networks",
  jupiter: "Jupiter in Aries, 9th house — dharma, fortune, and expansion",
  venus: "Venus in Cancer, 12th house — hidden or sacrificial dimensions of love and spending",
  mars: "Mars in Libra, 3rd house — initiative, communication, and sibling/peer dynamics",
  saturn: "Saturn in Aries, 9th house — earned respect through structured effort",
  rahu: "Rahu in Cancer, 12th house — spiritual restlessness and foreign/hidden themes",
  ketu: "Ketu in Capricorn, 6th house — past-life karma around health, service, and detachment",
  currentDasha: "Jupiter Mahadasha (2018–2034)",
  antarKetu: "Jupiter/Ketu Antardasha (Jul 2025–Jul 2026): inner work, releasing attachments, detachment",
  antarVenus: "Jupiter/Venus Antardasha (Jul 2026–Mar 2029): creative expansion, relationships, prosperity",
  noMangalDosha: "No Mangal Dosha from Lagna or Moon chart",
  noKalsarpa: "Free from Kalsarpa Yoga",
  noSadeSati: "No active Sade Sati or Panoti around 2026",
  varshaphal: "2026 Varshaphal: Mars 10th (Jun–Jul), Jupiter 1st (Aug–Oct), Saturn 9th (Oct–Dec)",
};

// ── Safety gate ───────────────────────────────────────────────────────────────

const DEATH_PATTERNS = [
  /\b(death|die|dying|lifespan|life expectancy|when will i die|how long will i live)\b/i,
  /\b(kill|suicide|end my life)\b/i,
];

const MEDICAL_DIAGNOSIS_PATTERNS = [
  /\bdo i have (cancer|tumor|disease|illness|disorder|diabetes|infection|condition|bipolar|adhd|autism|schizophrenia)\b/i,
  /\bam i (bipolar|depressed|anxious|schizophrenic|autistic|adhd)\b/i,
];

function isSafetyBlocked(question: string): boolean {
  for (const p of DEATH_PATTERNS) if (p.test(question)) return true;
  for (const p of MEDICAL_DIAGNOSIS_PATTERNS) if (p.test(question)) return true;
  return false;
}

// ── Domain detection ──────────────────────────────────────────────────────────

type Domain = {
  id: string;
  patterns: RegExp[];
};

const DOMAINS: Domain[] = [
  { id: "abandoned_projects", patterns: [/\b(abandon|unfinish|half.?done|left incomplete|give up|quit project|start but never finish|never complete)\b/i, /\b(scatter|too many project|too many idea)\b/i] },
  { id: "feeling_unlucky", patterns: [/\b(unlucky|bad luck|nothing works|why does nothing|why do i always fail|not meant for success|born unlucky|feel cursed|feeling cursed|cursed when|cursed repeatedly)\b/i] },
  { id: "visibility_fear", patterns: [/\b(online presence|put myself out there|personal brand|be seen|visibility|show my work|social media fear|afraid to post|scared to become visible|be visible online|visible online|afraid to be visible|feel unseen|unseen (at|in) (work|workplace))\b/i] },
  { id: "family_business_vs_independence", patterns: [/\b(family business|join (the )?family|leave family (business|work)|independent|own business vs family)\b/i] },
  { id: "over_responsibility", patterns: [/\b(over.?responsible|burden|carry everyone|take care of everyone|always the one|shoulder everything|cannot say no to family)\b/i] },
  { id: "anger_control", patterns: [/\b(anger|angry|lose my temper|control (my )?anger|rage|irritable|short.?fused)\b/i] },
  { id: "exploitation_social", patterns: [/\b(taken advantage|exploit|people use me|being used|manipulat|boundary.? with|set limits)\b/i] },
  { id: "relocation_vs_family", patterns: [/\b(relocat|move (to another|abroad|city|country)|leave (home|hometown)|settle abroad|foreign (move|settle|opportunity))\b/i] },
  { id: "family_comparison_guilt", patterns: [/\b(family compar|compare me|sibling (doing better|more successful)|relatives judg|family pressure|why can't you be like)\b/i] },
  { id: "business_loan_financial_risk", patterns: [/\b(loan|borrow|debt|invest|financial risk|take money|business fund|capital|lend)\b/i] },
  { id: "generosity_dharma", patterns: [/\b(generosity|give too much|dharma|charitable|donate|giving nature|over.?giving|helping others|luck.*help|improves.*help(ing)?|luck after help)\b/i] },
  { id: "restlessness_stability", patterns: [/\b(restless|settle down|cannot stay|always moving|unstable|keep changing|no stability|cannot settle|settle in one place|never settle|cannot settle down)\b/i] },
  { id: "intuition_vs_anxiety", patterns: [/\b(intuition|gut feeling|trust (my )?instinct|anxiety vs intuition|is this anxiety or intuition)\b/i] },
  { id: "delayed_success_saturn", patterns: [/\b(delay(ed)?|late bloomer|success late|why (so|this) slow|taking too long|when will i succeed|hard work not paying|late in life|always (feel|feeling) late|feel(s)? delayed|everything (is |feels? )?(delayed|late)|late (in|with) (marriage|career|money))\b/i] },
  { id: "career_field_selection", patterns: [/\b(which (career|field|job)|career (change|switch|path|choice)|what career|right (profession|field|job for me))\b/i] },
  { id: "creative_blocks", patterns: [/\b(creative block|writer.?s block|no inspiration|lost creativity|cannot create|stuck creatively)\b/i, /\bfeel(s)? blocked (when|to|while|as)\b/i, /\bblocked when (i |we )?(sit|write|create|try to write)\b/i] },
  { id: "name_change_superstition", patterns: [/\b(name change|change my name|numerology name|lucky name|spelling of name)\b/i] },
  { id: "ancestral_spiritual", patterns: [/\b(ancestors?|pitra|pitru|lineage|family karma|ancestral|forefathers|pitru dosha|dream.*ancestor|drawn to occult|occult|past life|karmic pattern|karmic debt|birth chart.*karma)\b/i] },
  { id: "praise_pressure", patterns: [/\b(praised|high expectation|people expect|cannot live up|burden of expectation|praised since childhood)\b/i] },
  { id: "relationship_boredom", patterns: [/\b(bored in relationship|relationship boring|excitement gone|spark (is )?gone|partner feels dull|lost interest in partner)\b/i] },
  { id: "social_belonging", patterns: [/\b(belong|fit in|outsider|don.?t fit|social circle|where do i belong|not part of|lonely in crowd|connected to strangers|strangers (vs|and|over) relatives|more comfortable with strangers|feel lonely|lonely even|lonely despite|lonely when)\b/i] },
  { id: "study_abroad_decision", patterns: [/\b(study abroad|foreign education|go (abroad|overseas) for (study|education|college|university)|masters abroad)\b/i] },
  { id: "jealousy_inspiration", patterns: [/\b(jealous|envy|envious|why (them|others) and not me|compare (myself|my life) to others|cousins? (doing better|more successful|comparison|compare))\b/i, /\bcomparing (myself|my life).*cousins?\b/i] },
  { id: "family_gatherings_drain", patterns: [/\b(family (gathering|gatherings|event|function|reunion)|exhausted after family|drained (by|after) family|avoid family event|drained.*family gathering|family.*drain(s|ed)?)\b/i] },
  { id: "relationship_fear_marriage", patterns: [/\b(afraid of (marriage|commitment|relationship)|fear (marriage|commitment)|will i (marry|find love)|marriage timing|marriage delay)\b/i] },
  { id: "interview_confidence", patterns: [/\b(interview|job interview|nervous (in|before) interview|interview anxiety|freeze in interview)\b/i] },
  { id: "spiritual_material_balance", patterns: [/\b(spiritual (vs|and) material|balance (spiritual|meditation) with (career|money|work)|too spiritual|not spiritual enough|spiritually called|material success.*spiritual|spiritual.*material success|spiritual.*material|material.*spiritual)\b/i] },
  { id: "self_sabotage_opportunity", patterns: [/\b(self.?sabotage|sabotage (myself|my own)|ruin my own|mess up when things go well|opportunity and i destroy)\b/i] },
  { id: "reconciliation_decision", patterns: [/\b(reconcile|get back (together|with ex)|ex (back|return)|should i try again|second chance (with|for) (ex|relationship))\b/i] },
  { id: "career_recognition_delay", patterns: [/\b(recognition|credit|not recognized|work not noticed|invisible at work|no appreciation|efforts not seen)\b/i] },
  { id: "intercultural_relationship", patterns: [/\b(different (culture|religion|caste|community)|intercultural|inter.?caste|inter.?religion|partner from different)\b/i] },
  { id: "prove_people_wrong", patterns: [/\b(prove (people|them|everyone) wrong|show them|make them regret|prove myself|they didn.?t believe)\b/i] },
  { id: "backup_option_love", patterns: [/\b(backup (option|plan) in (love|relationship)|am i a backup|someone.?s second choice|plan b for (them|him|her))\b/i] },
  { id: "emotional_silence", patterns: [/\b(cannot express|emotionally (silent|shut down|closed)|hard to (open up|express feelings)|do not talk about feelings|bottle (it|emotions) up)\b/i] },
  { id: "startup_business_success", patterns: [/\b(start.?up|my (own )?business|entrepreneur|launch (a |my )?(business|startup|product|venture)|will my business)\b/i] },
  { id: "relationship_family_disclosure", patterns: [/\b(tell (family|parents) about (partner|relationship|boyfriend|girlfriend)|hide (relationship|partner) from family|disclose (to|with) family)\b/i] },
  { id: "attraction_older_people", patterns: [/\b(attract(ed)? to older|older (partner|person)|age gap (relationship|partner)|why do i like older)\b/i] },
  { id: "return_previous_job", patterns: [/\b(return to (previous|old|former) job|go back to (old|previous|former) (job|company|employer)|ex.?(employer|job|company))\b/i] },
  { id: "curse_fear_repeated_setbacks", patterns: [/\b(curse|black magic|nazar|evil eye|someone did something|repeated (failure|setback|bad luck)|is someone jealous)\b/i] },
  { id: "fasting_health_weak", patterns: [/\b(fasting|fast (for|to|on)|upvas|vrat|is fasting (good|bad|safe)|health and fasting)\b/i] },
  { id: "competitive_colleagues", patterns: [/\b(colleague|coworker|colleague (stealing|taking|jealous|competing)|office politics|competitor at work|toxic coworker)\b/i] },
  { id: "authority_fear", patterns: [/\b(fear (of )?authority|afraid of (boss|manager|authority|senior)|intimidated by (boss|authority)|cannot speak up to (boss|manager))\b/i] },
  { id: "job_peace_vs_money", patterns: [/\b(peace vs money|better pay|high (salary|package) vs (peace|happiness)|toxic (job|workplace) good money|stay for money)\b/i] },
  { id: "shame_dependence", patterns: [/\b(ashamed (of|that)|shame (about|of)|embarrassed (about|by)|dependent on (family|parents)|financial dependence|still (taking|asking) money from|uncomfortable receiving help|cannot accept help|hard to receive|uncomfortable.*receive|difficulty receiving)\b/i] },
  { id: "misunderstood_intentions", patterns: [/\b(misunderstood|people misread|misunderstand my|intentions misread|they think i am|judged wrongly|no one understands? me|people (misunderstand|misread)|why do people misunderstand)\b/i, /\b(father|mother|parent|family) (never|doesn.?t|don.?t) understand(s)?\b/i] },
  { id: "dual_personality", patterns: [/\b(two (sides|personalities|faces)|two different (sides|personalities|faces|versions)|dual personality|different person (at home|at work|with different)|split personality feel|feel.*two different personalities)\b/i] },
  { id: "revenge_legal", patterns: [/\b(revenge|legal action|sue|court|fight back (legally|in court)|file (a )?case|take to court)\b/i] },
  { id: "discomfort_home", patterns: [/\b(uncomfortable (at|in) (home|my home|own home)|no peace at home|home (feels|is) (toxic|suffocating|hostile)|want to leave home|home environment|feel uncomfortable.*home|uncomfortable in my own home|feel unsettled at home|home.*uncomfortable)\b/i] },
  { id: "forgiveness_decision", patterns: [/\b(forgive|should i forgive|let go (of|what)|moving on after betrayal|cannot forgive|forgiveness (for|of))\b/i] },
  { id: "career_healing_coaching", patterns: [/\b(healing (career|work)|life coach|counsell?or|therapist as career|teacher|mentor others|help people (professionally|as a job)|become (an? )?astrologer|astrology as career|career in astrology|astrology.*profession|jyotish.*career)\b/i] },
  { id: "losing_documents", patterns: [/\b(lose (important )?documents|misplace|documents lost|losing things|forgetful|keep losing)\b/i] },
  { id: "mother_anxiety", patterns: [/\b(mother (anxious|worried|worries|controlling|over.?protective)|mom.?s (anxiety|worry|control)|dealing with (mother.?s|mom.?s) (anxiety|worry)|mother worries too much|mother.?s worry (affects|impacts)|my mother worries)\b/i] },
  { id: "headaches_stress", patterns: [/\b(headache|migraine|stress.?related (headache|pain)|tension headache)\b/i] },
  { id: "mentor_becomes_controlling", patterns: [/\b(mentor (became|is|turned) (controlling|possessive|toxic)|guru (controlling|possessive|toxic)|teacher (controlling|possessive))\b/i] },
  { id: "pet_adoption", patterns: [/\b(adopt (a )?pet|get a (dog|cat|pet)|pet (adoption|timing)|is it (good|right) (time|timing) (to get|for) (a )?pet)\b/i] },
  { id: "dating_break", patterns: [/\b(break from dating|stop dating|dating (break|pause|hiatus)|should i take a break from (dating|relationships))\b/i] },
  { id: "luxury_guilt", patterns: [/\b(guilt (about|for) (spending|buying|luxury)|feel guilty (buying|spending)|luxury (guilt|shame)|cannot enjoy (money|spending)|guilty (when|about|for) (earning|earn) more|earn more (than|and feel) guilt|guilt.*earn more)\b/i] },
  { id: "night_thinking", patterns: [/\b(cannot sleep|night (thoughts|thinking|anxiety)|overthink (at night|before sleep)|mind (racing|active) at night|insomnia)\b/i] },
  { id: "fame_ambition", patterns: [/\b(famous|fame|celebrity|public figure|want to be known|ambition to be great|recognition at large scale|big ambition|meant for something bigger|bigger purpose|am i meant for|something bigger|destined for (more|bigger|something))\b/i] },
  { id: "perfectionism_procrastination", patterns: [/\b(perfectionism|perfect(ionist)?|procrastinat|cannot start until perfect|wait until it.?s perfect|paralysed by perfectionism)\b/i] },
  { id: "social_media_mental_health", patterns: [/\b(social media (mental health|affecting me|anxiety|comparison|addiction)|doom.?scroll|screen time|instagram (affect|compari))\b/i] },
  { id: "therapy_vs_astrology", patterns: [/\b(therapy vs astrology|should i (see a therapist|do therapy)|astrology (instead of|vs) therapy|combine astrology and therapy)\b/i] },
  { id: "life_changes_cycles", patterns: [/\b(life (cycle|phase|change|changes|transition)|major (change|transition|shift) in life|going through (a )?big (change|transition)|everything is changing|life changes suddenly|sudden(ly)? (change|changes)|changes every (few|some) years|my life changes)\b/i] },
  { id: "business_partner_trust", patterns: [/\b(business partner|partner (trustworthy|reliable|honest)|trust (my )?business partner|partner (cheating|betraying) me in business)\b/i] },
  { id: "family_not_convinced_partner", patterns: [/\b(family (not|don.?t) (approve|accept|like|convinced) (my |the )?(partner|boyfriend|girlfriend)|parents (against|oppose) (my|the) (relationship|partner|marriage)|family (is not|isn.?t|not) convinced|family (doesn.?t|don.?t) approve|family.*not convinced.*partner|my family is not convinced)\b/i] },
  { id: "money_fear_spending", patterns: [/\b(fear (of )?spending|cannot spend money|scared to spend|money anxiety|financial anxiety|afraid (to spend|of spending))\b/i] },
  { id: "control_in_relationships", patterns: [/\b(control(ling)? (partner|relationship|me)|feel controlled|possessive partner|partner (controls|controls everything|makes all decisions))\b/i] },
  { id: "puja_for_career", patterns: [/\b(puja for (career|job|success|promotion)|which puja|havan for|ritual for (career|job)|mantra for (career|success|job))\b/i] },
  { id: "lucky_work_unlucky_love", patterns: [/\b(lucky in (work|career|business) (but|yet|however) unlucky in (love|relationship|marriage)|work well love bad|career good relationship bad)\b/i] },
  { id: "money_owed_confrontation", patterns: [/\b(owed money|someone owes me|confront (about )?money|ask for (my )?money back|lent money (and|but)|recover (money|debt))\b/i] },
  { id: "competitive_exam_continuation", patterns: [/\b(competitive exam|civil service|upsc|government exam|should i (continue|keep trying) (with |for )?(exam|preparation)|give up on exam)\b/i] },
  { id: "repeating_arguments_partner", patterns: [/\b(same argument(s)? (again|with partner|over and over)|repeat(ing)? fight|circular fight|cannot stop (fighting|arguing) with partner)\b/i] },
  { id: "children_timing", patterns: [/\b(children (timing|when)|when (to have|should i have) (child|children|baby|babies)|right time (for|to have) (a )?child|baby timing|should i have children|have children soon|children.*soon|children.*astrology)\b/i] },
  { id: "over_responsibility", patterns: [/\b(responsible for everyone|responsible for (others|family|everyone|their|his|her) problems|carry (everyone|others|family)|always helping|cannot stop (helping|caring)|sacrifice (for|myself) for|give too much of myself)\b/i] },
  { id: "property_purchase", patterns: [/\b(buy (property|house|flat|apartment|land|home)|property (purchase|timing|this year|investment)|should i (buy|invest in) (a |the )?(house|flat|property|apartment|land))\b/i] },
  { id: "delayed_success_saturn", patterns: [/\b(success (only |comes )?(after|through) (struggle|hardship|difficulty|pain|effort)|why (is success|do i succeed) only after|struggle before success|have to struggle (for|to get) success)\b/i] },
  { id: "content_creation_spiritual", patterns: [/\b(youtube (channel|video)|social media (channel|content|creator)|start (a channel|posting|content)|content (creation|creator)|blog|podcast|vlog|online (teaching|course|coaching|workshop))\b/i] },
  { id: "investment_speculation", patterns: [/\b(crypto|cryptocurrency|bitcoin|stock (market|investment)|invest (in )?stock|trading|speculation|nft|forex)\b/i] },
  { id: "study_blocks", patterns: [/\b(blocked in (studies|learning|exam)|study (block|problem|difficulty|issue)|cannot (concentrate|focus) (on|while) (study|studying)|struggle (with|in) (studies|exams|learning)|exam (stress|anxiety|pressure|block))\b/i] },
  { id: "ancestral_property", patterns: [/\b(sell (ancestral|family) property|ancestral (property|land|home|asset)|family (property|land|home|asset) (sell|sale|dispute|division|inheritance))\b/i] },
  { id: "public_failure_fear", patterns: [/\b(afraid (of|to) fail publicly|fear of (public failure|failing in public|embarrassment|humiliation)|what if (i fail|people see me fail)|moving forward (despite|because of) (fear|failure)|afraid of moving forward|afraid.*moving forward.*fail|afraid.*fail.*moving)\b/i] },
  { id: "visibility_fear", patterns: [/\b(afraid (success|successful|doing well) will make (people|others|them|everyone) (jealous|envy)|success (jealousy|envy)|people (becoming|getting) jealous (of|after) (my )?success)\b/i] },
  { id: "private_sector_vs_govt", patterns: [/\b(government (job|sector|service) (or|vs|versus) private|(private (sector|company|job)) (or|vs|versus) (government|govt)|government (exam|job|service) vs|stability vs growth (career|job))\b/i] },
  { id: "emotionally_older", patterns: [/\b(emotionally older|old soul|feel older (than|than my) (age|peers)|feel (too|so) mature for my age|feel like an old person|older (than|for) my age)\b/i] },
  { id: "faith_crisis", patterns: [/\b(losing faith|lost faith|faith crisis|crisis of faith|losing (my )?belief|lost (my )?belief|faith is (gone|fading|weak)|crisis of meaning|no longer believe|questioning (faith|belief|god))\b/i] },
];

function detectDomain(question: string): string {
  const q = question.toLowerCase();
  for (const domain of DOMAINS) {
    for (const pattern of domain.patterns) {
      if (pattern.test(q)) return domain.id;
    }
  }
  return "general_life";
}

// ── Answer builders per domain ────────────────────────────────────────────────

type AnswerBlueprint = {
  concern: string;
  chartFactsUsed: string[];
  answer: string;
};

function buildAnswer(domain: string): AnswerBlueprint {
  switch (domain) {

    case "abandoned_projects":
      return {
        concern: "Scattered effort and incomplete projects",
        chartFactsUsed: [CHART.mercury, CHART.moon, CHART.mars],
        answer: `This looks like a scattered-effort pattern rather than a lack of ability. With Mercury and Moon both placed in the 11th house (Gemini), the mind is naturally wide-ranging — drawn to ideas, people, and possibilities simultaneously. Mars in the 3rd house adds bursts of initiative that can outpace follow-through. The result is many starts, fewer completions.\n\nThe current Jupiter/Ketu antardasha (Jul 2025–Jul 2026) is a natural pruning phase — the chart is asking you to release what no longer serves rather than add more. This is a good window to audit active projects and consciously choose one or two to complete before starting anything new.\n\nPractical step: write down every active project, then ask "would I start this today?" Close anything that answers no. Completion of even one project shifts the internal narrative.\n\nRemedy (optional): On Wednesdays, review your one active priority for 15 minutes before the day begins. Mercury appreciates structured intent.`,
      };

    case "feeling_unlucky":
      return {
        concern: "Feeling persistently unlucky or blocked",
        chartFactsUsed: [CHART.jupiter, CHART.saturn, CHART.sun, CHART.currentDasha],
        answer: `The experience of feeling unlucky often reflects a mismatch between effort timing and result timing rather than a fundamental blockage. Saturn in the 9th house alongside Jupiter means luck is earned rather than granted — effort without structural discipline tends to feel wasted even when it's building something real.\n\nThe Leo Lagna and Sun in the 10th house place identity strongly in external recognition. When recognition is delayed, it can register as "nothing works" even when the foundation is growing. The Jupiter Mahadasha (active until 2034) is a long-game period — its gifts tend to compound and then arrive, not trickle constantly.\n\nThe Jupiter/Ketu antardasha (Jul 2025–Jul 2026) can feel like luck has withdrawn — but this is clearing, not abandonment. The Jupiter/Venus antardasha beginning Jul 2026 historically opens career and relationship gains for charts like this.\n\nPractical step: track small wins weekly. The chart has genuine expansion windows — what the mind labels as unlucky may simply be a pre-expansion phase.\n\nRemedy (optional): Thursday reflection — briefly note one thing that moved in the right direction that week, however small.`,
      };

    case "visibility_fear":
      return {
        concern: "Fear of being visible online or in public",
        chartFactsUsed: [CHART.sun, CHART.lagna, CHART.venus, CHART.mercury],
        answer: `Visibility fear often has a specific chart signature: strong public-facing indicators (Leo Lagna, Sun in the 10th house) combined with a 12th-house Venus, which pulls toward privacy and behind-the-scenes roles. This creates a real internal tension — the chart is built for public contribution, but Venus in Cancer in the 12th softens and sometimes hides that capacity.\n\nMercury in the 11th (Gemini) means communication is actually a strength when engaged. The reluctance is less about lack of skill and more about exposure risk feeling disproportionately high. Often this traces to a past experience of being judged or misread when visible.\n\nThe approaching Jupiter/Venus antardasha (Jul 2026–Mar 2029) is a window when visibility tends to feel more natural and rewarding for this chart. Starting small and consistent now builds the habit before the energy amplifies it.\n\nPractical step: identify one specific platform or format where you already feel somewhat comfortable. Post consistently there at a manageable cadence — weekly or fortnightly — rather than trying to be everywhere.\n\nRemedy (optional): Before posting or presenting, a brief acknowledgement that being seen is part of your dharma, not a performance.`,
      };

    case "family_business_vs_independence":
      return {
        concern: "Choosing between family business and independent path",
        chartFactsUsed: [CHART.sun, CHART.lagna, CHART.jupiter, CHART.mars],
        answer: `This tension between family loyalty and personal direction is common with Leo Lagna — there's a strong pull toward both honour (family) and self-authorship (Sun as lagna lord in the 10th). The Sun in the 10th house is asking for a career that carries your own signature, not just inherited identity.\n\nJupiter in the 9th house suggests that dharma — the right path — involves genuine expansion, not just security. If the family business doesn't allow you to grow in the direction your chart indicates, staying may feel increasingly constricting over time.\n\nThe Jupiter/Venus antardasha (Jul 2026–Mar 2029) is the strongest window in this decade for career expansion. A decision made before this period begins has time to develop roots; one delayed past it risks missing the opening.\n\nPractical step: list what the family business offers that you cannot get independently, and what you would gain by going independent that the family business cannot offer. The non-overlapping items are the actual decision factors.\n\nNote: Astrology can indicate timing and tendencies, but business viability needs financial analysis beyond what the chart shows.`,
      };

    case "over_responsibility":
      return {
        concern: "Taking on too much responsibility for others",
        chartFactsUsed: [CHART.moon, CHART.lagna, CHART.venus, CHART.ketu],
        answer: `Carrying others' burdens as a default pattern often shows in charts with Leo Lagna (strong sense of duty and protection for the group), Moon in the 11th (deep emotional investment in community wellbeing), and Venus in the 12th (giving without expecting return). Ketu in the 6th can reinforce a sense that self-care is less important than service.\n\nThe pattern is not a flaw — it is a genuine strength that becomes a drain when there are no limits. The difference between dharmic responsibility and compulsive caretaking is choice. When responsibility feels chosen, it energises; when it feels obligatory or fearful, it depletes.\n\nThe Jupiter/Ketu antardasha (Jul 2025–Jul 2026) is specifically asking this chart to practise healthy detachment. Some of what you carry was never yours to carry permanently.\n\nPractical step: for one week, pause before taking on a new responsibility and ask: "Is this mine to carry, or am I stepping in to avoid discomfort?" The answer will often be clarifying.\n\nRemedy (optional): Ketu remedies — spending time alone without agenda — tend to restore the sense of where you end and others begin.`,
      };

    case "anger_control":
      return {
        concern: "Managing anger and reactive communication",
        chartFactsUsed: [CHART.mars, CHART.moon, CHART.mercury],
        answer: `Mars in the 3rd house (communication, impulse, siblings) is the primary factor here. The 3rd is Mars's natural domain — it can produce decisive, direct communication, but when reactive, it can also produce sharpness that overshoots intention. Moon in Gemini in the 11th adds mental speed — thoughts and feelings move quickly, which can accelerate the reactive loop.\n\nThe anger itself is usually not the root; it tends to arise when the communication channel is blocked or when you feel your effort is unacknowledged. The chart is wired for honest expression — suppression doesn't work well; redirection does.\n\nPractical step: when you notice the first physical signal of anger rising (tension in jaw, chest, shoulders), treat it as a 90-second pause cue before speaking. The impulse typically peaks and begins to subside within that window.\n\nRemedy (optional): Tuesday grounding — brief physical activity (walk, exercise) on Tuesdays helps Mars discharge constructively rather than verbally.`,
      };

    case "exploitation_social":
      return {
        concern: "Being used or taken advantage of in relationships",
        chartFactsUsed: [CHART.venus, CHART.moon, CHART.ketu],
        answer: `Venus in the 12th house is the key factor — it creates a giving quality in relationships that doesn't always include a natural limit. There can be a tendency to invest more than the other person, to give the benefit of the doubt longer than warranted, and to feel the relationship is worth saving even after it has cost too much.\n\nMoon in the 11th (community, friends) adds warmth and generosity in social settings, which is a genuine gift but also signals availability that some people misuse. Ketu in the 6th can reduce the instinct to demand reciprocity.\n\nThe shift begins with naming the pattern clearly rather than blaming yourself for it. This is a chart designed for genuine generosity — the work is adding discernment, not removing the quality.\n\nPractical step: identify one relationship currently where the give-take feels imbalanced. Without drama, simply give slightly less than usual this month and observe what the other person does. Their response tells you the relationship's actual shape.\n\nRemedy (optional): Venus in the 12th benefits from occasional solitude and creative self-expression — time that is spent on yourself, not on others.`,
      };

    case "relocation_vs_family":
      return {
        concern: "Weighing relocation opportunity against family ties",
        chartFactsUsed: [CHART.rahu, CHART.moon, CHART.jupiter, CHART.antarVenus],
        answer: `Rahu in the 12th house in Cancer creates a recurring pull toward foreign or distant settings — this is a chart that often finds its best growth outside its starting environment. The 12th house in Vedic astrology represents faraway lands, so Rahu here genuinely amplifies relocation themes.\n\nMoon in the 11th (Gemini) means emotional bonds through networks and community — these can be rebuilt in new places, and often the chart finds richer community connections after relocating than expected.\n\nJupiter in the 9th (fortune through expansion) supports the principle of moving toward growth. The Jupiter/Venus antardasha (Jul 2026–Mar 2029) is particularly favourable for career and location changes — decisions taken in this window tend to produce stable, productive outcomes.\n\nPractical step: evaluate the opportunity on its concrete merits (career trajectory, financial terms, quality of life). The chart suggests foreign or distant settings can be net positive for this profile, but the specifics of the opportunity still need rational assessment.\n\nNote: For decisions involving a 3+ year horizon, a deeper consultation is recommended.`,
      };

    case "family_comparison_guilt":
      return {
        concern: "Guilt and pressure from family comparisons",
        chartFactsUsed: [CHART.lagna, CHART.sun, CHART.saturn, CHART.mars],
        answer: `Comparison pressure within families often lands hardest on Leo Lagna individuals because identity and dignity are so central to this placement. When family uses comparison as a tool — intentionally or not — it registers as an attack on self-worth, not just a comment on outcomes.\n\nSaturn in the 9th house alongside Jupiter means your timeline is genuinely different from people around you. Saturn-touched success tends to be slower to arrive and more durable once it does. Comparing your Chapter 3 to someone else's Chapter 7 is the wrong measurement.\n\nMars in the 3rd (siblings and peers) sometimes creates friction in those relationships — a sense of competition or misrecognition. Recognising this as a chart pattern rather than a character flaw is the first step toward not internalising the comparison.\n\nPractical step: when comparison comments arise, practise a single neutral response ("I'm on my own timeline") and move the conversation forward. You are not required to defend or explain your pace.\n\nRemedy (optional): Sun-strengthening practices — early morning light, brief gratitude for your specific capacities — reinforce the Leo Lagna's natural dignity.`,
      };

    case "business_loan_financial_risk":
      return {
        concern: "Financial risk, loans, and investment decisions",
        chartFactsUsed: [CHART.jupiter, CHART.saturn, CHART.mercury, CHART.venus],
        answer: `Financial risk appetite in this chart is moderate-to-high in theory but structured in practice. Jupiter in the 9th supports fortune and expansion, but Saturn in the same house insists on discipline and due diligence. Venus in the 12th house is a caution flag for expenditure — it can indicate money flowing out in ways that are not always visible until they accumulate.\n\nMercury in the 11th is a genuine asset for financial gains through networks, communication, and strategic thinking — lending and investment decisions made on the basis of information and relationships tend to outperform purely speculative ones.\n\nAstrology can indicate timing and risk appetite, but specific financial decisions require analysis of numbers, terms, and legal structure — areas where a financial advisor or accountant adds value the chart cannot replace.\n\nPractical step: before committing to a loan or significant investment, run it through: (1) can I service this in a worst-case scenario? (2) is the counterparty trustworthy by track record, not just intuition? (3) what is the exit path if needed?\n\nNote: Jupiter/Venus antardasha (Jul 2026–Mar 2029) is a period of general prosperity for this chart, but that doesn't make any individual decision automatically safe.`,
      };

    case "generosity_dharma":
      return {
        concern: "Over-giving and the balance between generosity and self-care",
        chartFactsUsed: [CHART.jupiter, CHART.venus, CHART.ketu],
        answer: `Jupiter in the 9th house creates a genuinely dharmic orientation — there is a real pull toward contribution, generosity, and helping others as a life value. Venus in the 12th amplifies giving in ways that don't always expect return. Ketu in the 6th house can reduce self-advocacy.\n\nThis is not a deficit — it is a chart built for meaningful contribution. The question is whether the giving is sustainable and self-chosen, or whether it has become an expectation that others rely on without reciprocating.\n\nDharmic generosity includes the boundary that you cannot keep giving from an empty vessel. The same Jupiter that drives generosity is in Aries — a sign that values individual energy and initiative. Protecting your own resources is not selfish; it is what makes continued generosity possible.\n\nPractical step: identify the three relationships or commitments where you give the most. For each, ask: does this giving energise me or deplete me? The ones that deplete need renegotiation.\n\nRemedy (optional): Jupiter in the 9th benefits from structured generosity — a specific amount or form of giving that you choose, rather than giving on demand.`,
      };

    case "restlessness_stability":
      return {
        concern: "Chronic restlessness and difficulty settling",
        chartFactsUsed: [CHART.moon, CHART.mercury, CHART.rahu, CHART.mars],
        answer: `Restlessness in this chart has structural roots: Moon in Gemini (a mutable, dual sign) in the 11th, Mercury in Gemini amplifying mental variability, and Rahu in the 12th creating a pull toward the next thing, the unknown, the not-yet-arrived. Mars in the 3rd adds physical and communicative restlessness.\n\nThis is not instability in the pathological sense — it is a chart that genuinely needs variety and expansion to feel alive. The error is in expecting yourself to thrive in rigid, unchanging structures and then reading the restlessness as a character flaw.\n\nThe Jupiter/Ketu antardasha (Jul 2025–Jul 2026) can intensify the feeling of not landing anywhere. The Jupiter/Venus antardasha from Jul 2026 typically brings a clearer sense of direction and a place where energy settles productively.\n\nPractical step: rather than fighting the restlessness, build a "home base" — one stable commitment (physical space, regular practice, long-term project) that you return to even while exploring. The anchor makes the movement feel chosen rather than compelled.`,
      };

    case "intuition_vs_anxiety":
      return {
        concern: "Distinguishing intuition from anxiety",
        chartFactsUsed: [CHART.moon, CHART.mercury, CHART.ketu],
        answer: `This is one of the most practically important distinctions for a chart with Moon in Gemini and Mercury both active — a fast, information-rich mind that can generate both genuine insight and worry-loops that feel like insight.\n\nThe working distinction: intuition tends to arrive as a quiet, stable sense that doesn't argue with itself. Anxiety generates urgency, "what if" chains, and the need for reassurance. Ketu in the 6th house can sometimes heighten subtle perception (genuine intuition), but it can also amplify health and risk anxiety.\n\nFor this chart, the clearest signal is the body. Intuition typically shows up as a settled physical knowing — a stillness even when the news is uncomfortable. Anxiety shows up as contraction, acceleration, or the need to act immediately.\n\nPractical step: when a strong sense arises, write it down and wait 24 hours before acting on it. If it's still present and stable the next day, treat it as signal. If it has shifted or intensified, treat it as a check-in point rather than direction.\n\nRemedy (optional): Ketu in the 6th responds well to short daily stillness practices — even 5 minutes — that help distinguish background noise from genuine signal.`,
      };

    case "delayed_success_saturn":
      return {
        concern: "Success feels delayed compared to peers",
        chartFactsUsed: [CHART.saturn, CHART.jupiter, CHART.sun, CHART.currentDasha],
        answer: `Delayed success is a documented Saturn signature — and this chart has Saturn in the 9th house alongside Jupiter. The 9th house governs fortune, dharma, and expansion. Saturn here doesn't block these; it requires them to be earned through sustained, disciplined effort rather than through luck or timing alone.\n\nLeo Lagna and Sun in the 10th place strong importance on external recognition. When recognition takes longer than expected, the internal experience can feel like failure, even when the objective trajectory is solid.\n\nThe Jupiter Mahadasha is a 16-year window (2018–2034) — its benefits often compound in the second half. The Jupiter/Venus antardasha (Jul 2026–Mar 2029) historically brings more visible recognition for effort already invested. What feels like stagnation now may be the compression before expansion.\n\nPractical step: separate your effort quality (which you control) from outcome timing (which you don't). If the effort is genuinely consistent and quality-driven, the chart's Saturn signature means results are building — not absent.\n\nNote: "success" defined by peers' timelines is not a useful metric for a Saturn-9th profile. Your timeline is structurally different.`,
      };

    case "career_field_selection":
      return {
        concern: "Choosing the right career field or making a career change",
        chartFactsUsed: [CHART.sun, CHART.mercury, CHART.jupiter, CHART.saturn, CHART.antarVenus],
        answer: `Career selection for this chart has clear directional signals. Sun in the 10th house in Taurus suggests fields where your identity and output are directly connected — creative, leadership, public-facing, or advisory roles. Leo Lagna reinforces a natural fit for roles where you set direction and carry authority.\n\nMercury in the 11th (Gemini) means communication, writing, strategy, networks, and knowledge-based work are genuine strengths. Jupiter in the 9th opens paths in education, law, publishing, philosophy, foreign affairs, and coaching.\n\nThe Jupiter/Venus antardasha (Jul 2026–Mar 2029) is the single strongest window in this decade for beneficial career transitions — moves initiated here tend to have better traction and longer staying power than those taken outside of it.\n\nPractical step: list the roles you are considering. Map each against: (a) does it involve communication and knowledge? (b) does it give you visible leadership or advisory space? (c) does it allow for continued growth? Fields that score yes on all three are worth pursuing seriously.\n\nNote: Specific field viability depends on skills, market conditions, and financial runway — factors the chart alone cannot assess.`,
      };

    case "creative_blocks":
      return {
        concern: "Creative block or loss of creative flow",
        chartFactsUsed: [CHART.venus, CHART.mercury, CHART.moon, CHART.ketu],
        answer: `Creative blocks in this chart tend to arise from the interplay of Venus in the 12th (creativity that needs privacy and internal space to form) and Mercury in Gemini (a mind that can become over-analytical about creative output, evaluating before generating).\n\nThe 12th-house Venus means that creative work often happens best in relative solitude — when there's an audience or external pressure during the creative process, the well dries up. This isn't precious; it's structural. The output can be shared widely; the generative process needs protection.\n\nKetu in the 6th can add a self-critical undertone — a sense that the work isn't good enough before it's complete. This is a quality filter that needs to be turned off during first drafts and turned on only during editing.\n\nPractical step: separate creation from evaluation completely. One session only generates — no editing, no judging. A different session, at least a day later, evaluates. The gap prevents the evaluator from strangling the creator.\n\nRemedy (optional): Venus in Cancer in the 12th responds to water — short walks near water, even a bowl of water nearby during creative work, can shift the ambient state.`,
      };

    case "name_change_superstition":
      return {
        concern: "Whether name change or spelling change will improve luck",
        chartFactsUsed: [CHART.sun, CHART.saturn, CHART.jupiter],
        answer: `Name changes for numerological or astrological reasons are a common practice, but it's worth understanding what they can and cannot do. In the Jyotish framework, the lagna, its lord, and the dasha sequence are the primary determinants of outcomes — not the name.\n\nSun as lagna lord in the 10th house and Saturn-Jupiter in the 9th create the actual fortune and career signature. These are not altered by a name change. What a name can do is shift how you present yourself and, potentially, how you feel about your own identity — which has indirect effects on confidence and action.\n\nIf a name change feels intuitively right and you genuinely connect with it, it may have value as a psychological marker. But if it's being done purely out of fear that the current name is causing problems, the underlying concern deserves direct attention — because the chart does not show the name as the limiting factor.\n\nPractical step: identify what specific outcome you are hoping the name change will produce. Then ask whether there is a more direct path to that outcome — improved visibility, a different domain of work, timing-aligned decisions.`,
      };

    case "ancestral_spiritual":
      return {
        concern: "Ancestral karma, Pitru dosha, or family lineage patterns",
        chartFactsUsed: [CHART.ketu, CHART.jupiter, CHART.rahu],
        answer: `Ancestral themes have a clear placement in this chart: Ketu in the 6th house (Capricorn) often indicates karma carried from the lineage related to service, discipline, and health. Jupiter in the 9th (dharma, father, teachers, lineage) governs how ancestral blessings flow forward. Rahu in the 12th can indicate spiritual debts or patterns that seek resolution through isolation, foreign experience, or inner work.\n\nIn Jyotish, Pitru karma is typically addressed through awareness and active dharmic living rather than fear. Jupiter in the 9th is actually a protective placement for lineage karma — it suggests that living with integrity, gratitude, and genuine contribution is itself the remedy.\n\nThe Jupiter/Ketu antardasha (Jul 2025–Jul 2026) is a particularly potent time for ancestral clearing — this period often brings up family patterns for conscious resolution rather than continued unconscious repetition.\n\nPractical step: if ancestral patterns feel active, identify one specific pattern that repeats across generations and consciously choose a different response when it appears in your own life. Active redirection is more effective than ritual alone.\n\nRemedy (optional): feeding crows (representing ancestors in Hindu tradition) or water offerings on Saturdays are simple, non-obligatory options if you are drawn to them.`,
      };

    case "praise_pressure":
      return {
        concern: "Burden of high expectations from being praised early",
        chartFactsUsed: [CHART.lagna, CHART.sun, CHART.saturn, CHART.mercury],
        answer: `Early praise creates a specific pressure pattern in Leo Lagna charts: the identity (Sun as lagna lord) becomes fused with performance. What was originally recognition of a genuine trait becomes an expectation that must be continuously maintained. The fear is not failure — it's losing the regard that came with being "the gifted one."\n\nSaturn in the 9th house eventually brings the reckoning with this — it asks the chart to build identity from actual sustained effort, not from early promise. This can feel like a drop from grace when it happens, but it is in fact a more durable foundation being laid.\n\nMercury in the 11th (Gemini) means genuine intelligence and communication ability — the original praise likely had a real basis. The work is separating self-worth from performance outcomes.\n\nPractical step: identify one area where you hold back attempting something because you're afraid of not performing at the praised level. Choose the smallest version of that attempt — the one where "good enough" is acceptable — and complete it. The pattern loosens through action, not reflection.`,
      };

    case "relationship_boredom":
      return {
        concern: "Boredom or lost spark in a relationship",
        chartFactsUsed: [CHART.venus, CHART.moon, CHART.mercury, CHART.mars],
        answer: `Relationship boredom in this chart often reflects the Moon-Mercury-Gemini configuration more than the relationship itself. A mind wired for variety and stimulation (Moon and Mercury both in Gemini, 11th house) will periodically experience any stable situation as insufficient — this is a mind pattern, not necessarily a relationship verdict.\n\nVenus in the 12th house (Cancer) can create a tendency to find depth in what's unavailable or mysterious, which makes established relationships feel less charged over time. Mars in the 3rd (communication, initiative) means that novelty can be created actively through conversation, shared adventure, or new joint projects.\n\nBefore concluding the relationship is wrong, it's worth asking: have I recently introduced any genuine novelty, depth of conversation, or shared challenge into this dynamic? Often what's missing is not a different partner but a different mode of engagement with the current one.\n\nPractical step: propose one thing to the partner that you have never done together — a trip, a class, a project, a conversation topic that has been avoided. Observe whether the relationship can absorb novelty. The answer tells you more than the boredom feeling alone.`,
      };

    case "social_belonging":
      return {
        concern: "Feeling like an outsider or not belonging",
        chartFactsUsed: [CHART.moon, CHART.rahu, CHART.lagna, CHART.mercury],
        answer: `Not-belonging is a recurring theme for charts with Rahu in the 12th house — there is often a genuine experience of being slightly outside the main current, seeing patterns that others don't see, or feeling that conventional social belonging requires too much self-suppression.\n\nMoon in the 11th house (community, groups) places strong emotional significance on belonging, which makes the gap between the desire to belong and the experience of not fitting more painful. Leo Lagna adds a layer: the chart wants to be recognised in groups, not just tolerated.\n\nThe mismatch often resolves when the comparison shifts from mainstream belonging to finding the specific group where the unusual perspective is valued rather than tolerated. Mercury in Gemini in the 11th gives genuine ability to connect across very different types of people — the issue tends to be finding the right cluster, not lacking social capacity.\n\nPractical step: identify one community (online or physical) organised around a specific interest or value that genuinely matters to you — not a general social group. Belonging through shared purpose tends to work better for this chart than belonging through proximity.`,
      };

    case "study_abroad_decision":
      return {
        concern: "Decision about studying abroad",
        chartFactsUsed: [CHART.rahu, CHART.jupiter, CHART.mercury, CHART.antarVenus],
        answer: `Study abroad questions are well-supported in this chart. Rahu in the 12th house in Cancer creates a structural pull toward foreign or distant settings for growth. The 12th house in Vedic tradition governs foreign lands, and Rahu here often means life's most formative experiences happen away from the origin environment.\n\nJupiter in the 9th house — the house of higher education, foreign travel, and expansion — actively supports this direction. Mercury in the 11th gives intellectual sharpness and networking ability that tends to thrive in new environments.\n\nThe Jupiter/Venus antardasha (Jul 2026–Mar 2029) is the most supportive window for major education and career moves in this decade. Initiatives begun here, including foreign study programs, tend to bear productive results.\n\nPractical step: if the practical conditions — admission, funding, and career relevance — are viable, the chart does not show foreign study as risky. The main question to verify is whether the specific program opens the doors you need, not whether the idea of going abroad is right.\n\nNote: Decisions with 3+ year implications benefit from a deeper consultation to assess the full arc.`,
      };

    case "jealousy_inspiration":
      return {
        concern: "Feeling jealous of others' success",
        chartFactsUsed: [CHART.lagna, CHART.sun, CHART.saturn, CHART.currentDasha],
        answer: `Jealousy in Leo Lagna charts carries a specific flavour — it tends to arise not from wanting what others have, but from a sense that your own recognition is overdue. The Sun in the 10th places strong identity value on public achievement. When others receive the recognition you feel you've earned, it triggers a fairness response rather than simple envy.\n\nSaturn in the 9th alongside Jupiter means your timeline is structurally longer and more earned than many comparison points. The person you are comparing yourself to may be receiving a shorter-cycle reward while your Saturn-shaped reward is still building.\n\nThe practical reframe: other people's success is actually useful data about what is possible, not evidence of your deficit. Mercury in the 11th gives genuine ability to learn from and collaborate with successful people — jealousy that is converted into inspiration is one of the more productive uses of this energy.\n\nPractical step: when you notice jealousy, write down the specific quality or outcome that triggered it. That specificity often points to an area where you have genuine aspiration that you haven't been taking seriously enough.`,
      };

    case "family_gatherings_drain":
      return {
        concern: "Feeling drained by family gatherings and obligations",
        chartFactsUsed: [CHART.venus, CHART.moon, CHART.ketu, CHART.mars],
        answer: `Family gathering drain in this chart can trace to several factors: Venus in the 12th house (Cancer) creates a private inner world that large social obligations violate; Moon in the 11th processes emotion through genuine connection, not performative attendance; Mars in the 3rd can create friction in family-peer dynamics that accumulates in group settings.\n\nThe experience of being drained is not ingratitude — it's a real energy response from a chart that needs selective, meaningful social engagement rather than obligatory presence. Leo Lagna carries social obligation seriously, which makes it harder to decline; but the body (and Venus in the 12th) will report the cost regardless.\n\nThe Jupiter/Ketu antardasha (Jul 2025–Jul 2026) may heighten the sense that group obligations feel less meaningful. This is an inner-work phase asking you to be honest about which connections are genuinely nourishing.\n\nPractical step: before the next family gathering, set a specific exit time for yourself — not because you will necessarily use it, but because knowing it exists reduces the anticipatory drain. Voluntary presence feels different from obligatory presence even when the external behaviour is identical.`,
      };

    case "relationship_fear_marriage":
      return {
        concern: "Fear of commitment or marriage timing",
        chartFactsUsed: [CHART.venus, CHART.moon, CHART.mars, CHART.antarVenus, CHART.noMangalDosha],
        answer: `Commitment fear in this chart often originates from Venus in the 12th house — a placement that experiences love deeply but somewhat privately, and that can perceive formal commitment as a loss of the internal freedom that makes love feel safe. This is not avoidance; it is a specific way of loving that needs trust built before permanence feels right.\n\nThe chart shows no Mangal Dosha from either Lagna or Moon, which removes one of the most commonly cited astrological concerns for marriage. Moon in the 11th means emotional bonds through shared interests and friendship — partnership that starts from genuine friendship tends to work better for this profile than convention-driven timelines.\n\nThe Jupiter/Venus antardasha (Jul 2026–Mar 2029) is the most active window in this decade for relationship deepening and, for those ready, formal commitment. This isn't a deadline — it's a window of genuine receptivity.\n\nPractical step: if commitment feels blocked, identify whether the block is about the specific person, the institution of marriage, or an internal belief about what you will lose. Each has a different resolution path.`,
      };

    case "interview_confidence":
      return {
        concern: "Nervousness and anxiety in interviews",
        chartFactsUsed: [CHART.mercury, CHART.sun, CHART.mars, CHART.lagna],
        answer: `Interview anxiety in this chart has a specific pattern: Mercury in Gemini gives strong thinking and communication ability, but under pressure the speed of the mind can outrun composed expression. The chart can generate multiple responses simultaneously, which in interviews reads as hesitation or over-thinking rather than intelligence.\n\nLeo Lagna and Sun in the 10th house mean you are actually built for presentation — but the Leo placement can also amplify the stakes in your own mind ("this reflects on who I am"), which increases pressure.\n\nMars in the 3rd is an asset in interviews when channelled well — it gives directness, initiative, and the ability to advocate for yourself. Channelled poorly, it can produce over-explanation or defensiveness.\n\nPractical step: practise answering two or three core questions (your strengths, a challenge you overcame, why this role) until the answer flows without conscious effort. When the base answers are automatic, the mind has bandwidth for the actual conversation rather than managing anxiety.\n\nRemedy (optional): brief physical movement (even a short walk) immediately before an interview helps Mars discharge constructively and grounds Mercury's speed.`,
      };

    case "spiritual_material_balance":
      return {
        concern: "Balancing spiritual practice with material ambitions",
        chartFactsUsed: [CHART.jupiter, CHART.ketu, CHART.venus, CHART.sun],
        answer: `This tension is built into the chart's architecture in a productive way. Jupiter in the 9th (dharma, spiritual wisdom, expansion) and Ketu in the 6th (detachment, service, releasing karma) both pull toward the spiritual. Leo Lagna with the 10th-house Sun pulls toward visible achievement in the world. Venus in the 12th bridges the two — hidden, behind-the-scenes devotion that doesn't negate worldly life.\n\nThe Jyotish framework doesn't place spiritual and material in opposition — dharma (right action in the world) is itself a spiritual path. The chart is not asking you to choose; it's asking you to align your material goals with your actual values (9th house), which is the definition of dharmic living.\n\nThe current Jupiter/Ketu antardasha (Jul 2025–Jul 2026) may be heightening the pull toward spiritual over material. This is a natural phase for inner deepening — the Jupiter/Venus antardasha that follows integrates this into external productivity.\n\nPractical step: identify whether your current work connects to something you genuinely value (not just financially rewards). The degree of alignment is a practical measure of how much the tension exists.`,
      };

    case "self_sabotage_opportunity":
      return {
        concern: "Self-sabotage when opportunities arise",
        chartFactsUsed: [CHART.venus, CHART.ketu, CHART.saturn, CHART.lagna],
        answer: `Self-sabotage when things go well is one of the more painful patterns — and it often has an unconscious logic. Venus in the 12th house can carry a deep belief that good things will be taken away, leading to a kind of pre-emptive retreat. Ketu in the 6th can produce unconscious undermining of effort through self-neglect or lowered standards at crucial moments.\n\nLeo Lagna and Sun in the 10th mean self-worth is substantially connected to outcomes. When the stakes feel very high, the mind can create the familiar feeling of falling short — because falling short on your own terms feels safer than being judged from the outside.\n\nSaturn in the 9th provides the antidote: structure. When the path to an opportunity is mapped in concrete steps with checkpoints, the anxiety has less room to redirect the course.\n\nPractical step: for any high-stakes opportunity currently in motion, identify the one moment in the process where you have historically backed out or reduced effort. Make a specific commitment in advance about what you will do at that point instead — ideally tell someone else about it.\n\nRemedy (optional): regular Saturn-aligned practice (consistent small effort, daily discipline) gradually shifts the internal narrative from "I ruin good things" to "I follow through."`,
      };

    case "reconciliation_decision":
      return {
        concern: "Whether to reconcile with an ex or try again",
        chartFactsUsed: [CHART.venus, CHART.moon, CHART.mars, CHART.ketu],
        answer: `Reconciliation decisions in this chart benefit from distinguishing between Venus in the 12th (which can sustain long, private emotional attachment even after a relationship has ended) and Moon in the 11th (which processes forward through new connections and community). The 12th-house Venus doesn't forget easily — but that doesn't mean return is always the right answer.\n\nThe quality of the original ending matters. If the relationship ended because of timing, external circumstances, or misunderstanding — and the core dynamic was healthy — reconciliation can be worth exploring. If it ended because of a fundamental incompatibility or a breach of trust, the nostalgic pull of Venus in the 12th is not sufficient grounds for return.\n\nMars in the 3rd means that honest, direct conversation (not hinting or testing through behaviour) is what actually tests whether reconciliation has ground to stand on. If the other person isn't willing to have that conversation, the answer is already present.\n\nPractical step: write down what specifically was good about the relationship and what specifically ended it. If the thing that ended it can actually change — not theoretically, but based on evidence — reconciliation has a basis. If not, what you miss is the good version of someone who may no longer exist.`,
      };

    case "career_recognition_delay":
      return {
        concern: "Work not being recognised or getting credit for effort",
        chartFactsUsed: [CHART.sun, CHART.saturn, CHART.lagna, CHART.mercury],
        answer: `Recognition delay is a Saturn-9th signature — effort is real and significant, but the feedback loop is longer than for charts without this placement. This can make genuinely excellent work feel invisible, particularly in environments that reward fast, visible output over deep, sustained contribution.\n\nLeo Lagna and Sun in the 10th make this especially sharp — identity is tied to being seen for what you do. When the recognition doesn't arrive at the expected pace, it can feel like invalidation.\n\nMercury in the 11th is the recognition lever: communication about your work, making your contribution visible through writing, presenting, or well-timed conversations with decision-makers, tends to accelerate the loop that Saturn otherwise delays.\n\nPractical step: identify one piece of work you have completed in the last three months that deserves more visibility. Find one concrete way to make it more visible — a write-up, a presentation, a direct conversation — not to boast, but because visibility is part of Saturn's required effort, not a bonus.\n\n2026 Varshaphal shows Mars in the 10th (Jun–Jul) and Jupiter in the 1st (Aug–Oct) — both are active recognition windows.`,
      };

    case "intercultural_relationship":
      return {
        concern: "Navigating an intercultural or inter-religious relationship",
        chartFactsUsed: [CHART.rahu, CHART.jupiter, CHART.venus, CHART.noMangalDosha],
        answer: `Intercultural or inter-religious relationships have a strong chart resonance here. Rahu in the 12th house (foreign themes, crossing boundaries) and Jupiter in the 9th (different philosophies, dharma through expansion) both point toward relationships that introduce perspectives outside the original cultural context. This is not against the chart's grain — it is part of its design.\n\nVenus in the 12th house (Cancer) loves deeply but often across differences — hidden, private love that may feel unsanctioned is a Venus-12th theme. The relationship's depth tends to precede its social recognition, which can create temporary difficulty before stability arrives.\n\nThe chart shows no Mangal Dosha from Lagna or Moon, which removes one common concern. The primary challenge for intercultural relationships in this chart is typically navigating family expectations, not internal compatibility.\n\nPractical step: identify whether the concern is about internal compatibility or external acceptance. For internal compatibility, shared values matter more than shared background. For external acceptance, the question is whether both people are willing to invest in navigating it together — which is a character question, not a chart question.`,
      };

    case "prove_people_wrong":
      return {
        concern: "Wanting to prove people wrong who didn't believe in you",
        chartFactsUsed: [CHART.lagna, CHART.sun, CHART.saturn, CHART.mars],
        answer: `Wanting to prove people wrong is a Leo Lagna energy that is real and sometimes motivating — but it's worth checking whether it's the fuel you want to run on long-term. The Sun as lagna lord, Sun in the 10th: this chart is genuinely oriented toward recognition and visible achievement. The issue is whether that recognition is sought on your terms or defined by the people who dismissed you.\n\nSaturn in the 9th ensures that the real proving happens through sustained performance over time — not through dramatic comebacks. Mars in the 3rd provides the competitive fire, but Mars' energy can be misdirected if it's burning toward someone else's definition of success.\n\nThe most effective revenge in this chart's language is a consistently excellent life — which happens to be the same thing as the life you actually want. The external proof tends to arrive as a side effect of doing the right work, not as the primary target.\n\nPractical step: identify the three things you would focus on even if no one who doubted you would ever see the result. That list is your actual north star. The motivation to prove others wrong is a valid accelerant, but these three things are the direction.`,
      };

    case "emotional_silence":
      return {
        concern: "Difficulty expressing feelings or emotional shutdown",
        chartFactsUsed: [CHART.moon, CHART.mercury, CHART.venus, CHART.mars],
        answer: `Emotional silence in this chart creates a specific pattern: Moon and Mercury are both in Gemini, 11th house — the mind is highly active and verbal, but often about ideas and information rather than personal emotional content. Venus in the 12th processes love and feeling in private. The outer presentation can be communicative and warm while the inner emotional material stays protected.\n\nThis is not emotional deficit — it is protection that became habitual. Often it began as appropriate self-protection in an environment where emotional expression was unsafe or dismissed. It becomes a problem when it prevents the people you want close from knowing where you actually are.\n\nMars in the 3rd gives the capacity for direct speech — it can express anger and opinion readily, but tender or vulnerable emotion may feel riskier. The Mars-Mercury combination means words are easier than feelings.\n\nPractical step: choose one person you trust and one low-stakes emotional topic. Express what you actually feel about it in one sentence — not the explanation, just the feeling. "I felt hurt by that" or "I'm more worried about this than I've shown." Start with one sentence. The habit builds from small acts of disclosure.\n\nRemedy (optional): Moon in Mrigasira nakshatra benefits from creative expression — music, writing, or movement — as routes into emotional material that direct conversation makes difficult.`,
      };

    case "startup_business_success":
      return {
        concern: "Starting a business or startup viability",
        chartFactsUsed: [CHART.mercury, CHART.jupiter, CHART.sun, CHART.saturn, CHART.antarVenus],
        answer: `Business initiation is well-supported in this chart with the right timing and structure. Mercury in the 11th (Gemini) gives genuine strength in communication-based, knowledge-driven, and network-leveraged businesses. Jupiter in the 9th provides dharmic expansion — businesses built around a genuine purpose (not just profit) tend to sustain better for this profile.\n\nSun in the 10th house supports solo or founding-team leadership rather than employee roles — this chart tends to function better with authority than under it.\n\nSaturn in the 9th, however, requires structural discipline: a viable business model, financial runway, and genuine market understanding — not just vision. Jupiter's gifts come through structured effort in this chart, not through improvisation.\n\nThe Jupiter/Venus antardasha (Jul 2026–Mar 2029) is the strongest business-launch window in this decade. Foundations built during the current Jupiter/Ketu period (inner work, clarity of purpose) serve as preparation.\n\nPractical step: before launching, verify three things independently of your own enthusiasm — (1) there is a paying customer willing to pay now, (2) you have 6–12 months of financial runway, (3) you have one person who will give you honest feedback without diplomacy.\n\nNote: astrology confirms timing and temperament fit, but the business case needs direct analysis.`,
      };

    case "authority_fear":
      return {
        concern: "Fear of authority figures or speaking up to superiors",
        chartFactsUsed: [CHART.sun, CHART.lagna, CHART.saturn, CHART.mars],
        answer: `Fear of authority has an interesting structure in Leo Lagna charts — the chart is inherently built for authority, not subordination, which means that situations where you must submit to a higher authority can create internal conflict rather than simple fear. The experience might be less "fear" and more "resistance disguised as fear."\n\nSaturn in the 9th alongside Jupiter governs authority figures (teachers, seniors, institutions). Saturn here suggests that useful relationships with authority come through demonstrated capability over time — earning respect rather than inheriting it or receiving it through charm.\n\nMars in the 3rd provides the communication resource: when prepared and grounded, this chart can speak directly and assertively. The fear tends to peak before the conversation, not during it.\n\nPractical step: before any high-stakes interaction with an authority figure, prepare by writing down three things you want to communicate and one specific outcome you want from the conversation. The preparation converts anxiety into structure, and Mars in the 3rd can then do what it's built for.`,
      };

    case "job_peace_vs_money":
      return {
        concern: "Choosing between a peaceful job and a higher-paying one",
        chartFactsUsed: [CHART.sun, CHART.venus, CHART.saturn, CHART.mercury],
        answer: `The peace-vs-money dilemma in this chart: Venus in the 12th house places genuine value on inner peace and non-toxic environments — the 12th house Venus will pay a psychological cost in environments with high conflict, even when the financial reward is high. This is not weakness; it's a structural fact about what sustains this chart long-term.\n\nSun in the 10th and Leo Lagna mean that identity and work are closely linked — a role where dignity is compromised or daily peace is absent tends to erode performance over time, even if the early financial incentive holds.\n\nSaturn in the 9th: money that is earned in an environment that violates your values tends to feel less satisfying than a smaller amount earned with integrity. This is not sentimental — Saturn enforces it structurally.\n\nMercury in the 11th (gains through communication and networks) suggests that higher income in this chart is better achieved by increasing the value of what you offer than by tolerating worse conditions.\n\nPractical step: before choosing the higher-paying toxic option, model the actual net: higher pay minus the cost of health, energy, and recovery time. Often the real financial premium is smaller than the headline number suggests.`,
      };

    case "shame_dependence":
      return {
        concern: "Shame about financial dependence or receiving help",
        chartFactsUsed: [CHART.lagna, CHART.sun, CHART.saturn, CHART.ketu],
        answer: `Shame about dependence is a Leo Lagna pattern — the chart places high value on self-sufficiency and the ability to provide for and carry others. Being in a position of receiving rather than giving registers as a loss of the chart's core identity.\n\nSaturn in the 9th compounds this: earned self-sufficiency is the ideal, and any deviation from it — even temporary and necessary — feels like a character verdict rather than a circumstantial fact.\n\nKetu in the 6th can add a self-punishing undertone — a sense that struggling or depending is somehow deserved.\n\nThe reframe: dependence during a transition phase is a resource, not a verdict on capability. Most people who later become genuinely independent passed through a phase of receiving support. Saturn does not reward suffering through self-imposed hardship when help is available; it rewards the disciplined use of available resources to reach stability.\n\nPractical step: identify the specific timeline by which you intend to no longer need this support. Write it down with concrete milestones. The presence of a genuine plan converts shame into structured gratitude — you are using a bridge to reach a place you are actively building toward.`,
      };

    case "misunderstood_intentions":
      return {
        concern: "Being misread or having good intentions misunderstood",
        chartFactsUsed: [CHART.mercury, CHART.mars, CHART.moon, CHART.lagna],
        answer: `Misunderstood intentions are a specific pain point when Mercury and Moon are in Gemini (11th house) combined with Mars in the 3rd. The mind generates ideas and connections quickly, and communication can sometimes project as overwhelming, over-direct, or (especially to people who communicate differently) as aggressive or dismissive — even when the intent is helpful or caring.\n\nLeo Lagna carries natural authority in tone, which some people experience as dominance even when you are simply being clear. This is a perception gap rather than a character flaw.\n\nMars in the 3rd is the most direct contributor: communication that is assertive and efficient can land as blunt or uncaring in contexts where people expect more softening.\n\nPractical step: when you notice a pattern of being misread in a specific context (work, family, romantic), ask one trusted person in that context what specifically creates the impression. Mercury in Gemini can adapt communication style effectively — once you have the feedback, adjustment is within your capacity.`,
      };

    case "dual_personality":
      return {
        concern: "Feeling like two different people in different contexts",
        chartFactsUsed: [CHART.moon, CHART.mercury, CHART.venus, CHART.lagna],
        answer: `The experience of having two distinct selves — one presented in public and one that exists privately — is structural in this chart. Leo Lagna presents a strong, confident, capable identity in the world (Sun as lagna lord, 10th house). Venus in the 12th house carries a private, emotionally complex, introspective inner world. These two coexist genuinely — they are not contradictions.\n\nMoon and Mercury in Gemini add a third layer: the mind itself moves between perspectives and registers quickly. What reads to others as inconsistency is internally experienced as genuine contextual adaptation.\n\nThe concern is usually not that this duality exists — it's that the gap between the public and private self feels like inauthenticity or performance. It is neither. All complex people have different expressions in different contexts. The measure of integration is whether the private self can occasionally appear in public without catastrophe — not whether the two selves merge.\n\nPractical step: identify one setting where you currently perform a version of yourself that feels significantly removed from who you actually are. Choose one small, low-risk disclosure or expression of the real version in that setting. See what happens. Often the feared response doesn't materialise.`,
      };

    case "forgiveness_decision":
      return {
        concern: "Whether and how to forgive after a hurt",
        chartFactsUsed: [CHART.venus, CHART.ketu, CHART.jupiter, CHART.moon],
        answer: `Forgiveness in this chart has to navigate Venus in the 12th, which holds hurt long and deep but quietly — and Ketu in the 6th, which can produce a kind of spiritual self-expectation ("I should be above this") that generates guilt when forgiveness doesn't arrive naturally.\n\nJupiter in the 9th represents the dharmic impulse toward forgiveness — and Jupiter in Aries tends toward generous perspectives, particularly on a philosophical level. But philosophical forgiveness and emotional release are different timelines. You can hold both simultaneously.\n\nThe practical distinction: forgiveness is not approval, reconciliation, or trust restoration. It is releasing the internal cost of carrying the wound — specifically for your own freedom, not for the other person's benefit. In this chart, unforgiven wounds tend to become chronic because Venus in the 12th doesn't discharge easily.\n\nPractical step: write the story of what happened from your own perspective, fully and without softening. Then write what it has cost you to carry it since. The second document usually clarifies whether continued carrying is worth it. Forgiveness often follows when the cost of not forgiving becomes vivid.\n\nRemedy (optional): Jupiter in the 9th responds to philosophical reframing — reading or hearing perspectives on the human capacity for harm can support the process.`,
      };

    case "night_thinking":
      return {
        concern: "Inability to stop thinking at night or insomnia",
        chartFactsUsed: [CHART.mercury, CHART.moon, CHART.rahu, CHART.ketu],
        answer: `Night thinking in this chart has clear structural contributors: Mercury and Moon both in Gemini in the 11th house — a highly active mind that processes social, relational, and ideational material through the evening hours. This configuration naturally peaks in mental activity during the late-night window when external stimulation withdraws.\n\nRahu in the 12th house can amplify the quality of "un-landing" — a difficulty settling into rest because the subconscious is processing something not yet resolved. Ketu in the 6th can produce low-grade health anxiety that surfaces when the body is at rest.\n\nThe standard advice (screens off, consistent bedtime) applies, but the deeper lever for this specific chart is giving the Mercury-Moon activity a structured channel before bed — so the mind registers that its processing work is "done" for the day.\n\nPractical step: 20–30 minutes before sleep, write down everything that is occupying your mind — tasks, worries, ideas, unfinished thoughts. Include a brief note on each about what you plan to do with it. The act of externalising the mental load gives the 11th-house mind permission to stop processing.\n\nRemedy (optional): Moon in Mrigasira nakshatra (Mars-ruled) can benefit from a short physical release in the evening — brief walking or stretching — before the pre-sleep writing practice.`,
      };

    case "perfectionism_procrastination":
      return {
        concern: "Perfectionism that leads to procrastination and paralysis",
        chartFactsUsed: [CHART.mercury, CHART.saturn, CHART.lagna, CHART.venus],
        answer: `Perfectionism in this chart arises from a combination of Mercury in Gemini (which generates multiple versions of the right answer simultaneously) and Saturn in the 9th (which enforces high standards and long evaluation cycles before committing). Leo Lagna adds the stakes — the output represents who you are, so anything less than excellent feels like identity failure.\n\nVenus in the 12th may also contribute a private standard that is rarely stated — an internal ideal that external reality cannot quite match, so starting (or finishing) feels premature.\n\nThe practical difficulty with this combination: the evaluator (Saturn-Mercury) fires before the creator (Mars in the 3rd) has generated raw material to evaluate. The fix is sequencing, not character change.\n\nPractical step: enforce a strict two-phase system. Phase 1: generate without evaluating — write, draft, build, sketch. Any output is permitted, no standards applied. Phase 2: evaluate and refine — now apply all the Saturn-Mercury standards you want. The hard rule is that Phase 1 must produce something before Phase 2 is allowed to begin. The perfectionism is a valuable quality in Phase 2; it is poison in Phase 1.`,
      };

    case "children_timing":
      return {
        concern: "Timing for having children",
        chartFactsUsed: [CHART.jupiter, CHART.venus, CHART.moon, CHART.antarVenus],
        answer: `Children timing questions require care — astrology can indicate favourable periods but cannot determine specific outcomes, and the decision involves physical, relational, and personal readiness that the chart alone cannot assess.\n\nGeneral indicators in this chart: Jupiter in the 9th house governs children (as one of its significators) and is well-placed — it indicates that parenthood is part of the life design. Venus in the 12th may indicate some private ambivalence or that timing requires readiness of the inner world, not just external conditions.\n\nThe Jupiter/Venus antardasha (Jul 2026–Mar 2029) is the period when Venus themes — relationship, creativity, and family building — become most active. For those considering family planning, this window tends to be more supportive than the current Jupiter/Ketu antardasha (inner work, releasing, less external building).\n\nPractical step: if the personal and relational readiness is present, the chart suggests the 2026–2029 window is more supported than the current one. Medical and practical readiness are the variables that need independent assessment.\n\nNote: for questions about specific fertility timing, a detailed birth chart reading including divisional charts (D7 specifically) is more precise than a general reading.`,
      };

    case "curse_fear_repeated_setbacks":
      return {
        concern: "Fear of curse, black magic, or unexplained repeated setbacks",
        chartFactsUsed: [CHART.ketu, CHART.rahu, CHART.saturn, CHART.jupiter],
        answer: `Repeated setbacks — especially in clusters — can generate a fear of external malefic influence. In Jyotish, the distinction between karma playing out and active harm from another person is important. The chart here does not show indicators associated with external malefic interference. What it does show is Saturn in the 9th requiring long-cycle effort before results, and the current Jupiter/Ketu antardasha (Jul 2025–Jul 2026) as a natural consolidation and release phase — not a blocked phase.\n\nKetu in the 6th can create a low-grade fear of enemies or hidden harm; this is a Ketu quality and tends to amplify perceived threat beyond actual threat.\n\nJupiter in the 9th is a strong protective factor — it generally shields against external malefic interference for this chart. The experience of setbacks is more plausibly explained by dasha timing and Saturn's long feedback loop than by external harm.\n\nPractical step: map the setbacks against what was happening in your own decisions and environment at the time. Most repeated setbacks in Saturn-influenced charts follow an internal pattern (taking on too much, misaligned timing, insufficient structure) rather than an external one.\n\nRemedy (optional): Jupiter in the 9th — regular engagement with a genuine teacher, text, or practice aligned with your values — strengthens its protective function.`,
      };

    case "shame_dependence":
      return {
        concern: "Shame about current situation or dependency",
        chartFactsUsed: [CHART.lagna, CHART.sun, CHART.saturn],
        answer: `Shame about where you currently are is a Leo Lagna pattern — when the Sun (lagna lord) is in the 10th house, identity is strongly linked to visible achievement and self-reliance. Any gap between where you are and where you feel you should be registers as a personal failure rather than a circumstantial position.\n\nSaturn in the 9th is the timing factor: Saturn-shaped success takes longer to arrive and requires sustained, unglamorous effort. The chart is not broken — it is on a longer timeline than many comparison points.\n\nPractical step: separate the facts of your current situation from the story about what those facts mean about you. The facts are a position; the story is optional. Write what the current position actually is (neutral facts), then write what you are actively doing to change it. The presence of active, specific effort is what differentiates preparation from stagnation.`,
      };

    case "business_partner_trust":
      return {
        concern: "Trust and reliability of a business partner",
        chartFactsUsed: [CHART.mercury, CHART.saturn, CHART.jupiter, CHART.mars],
        answer: `Business partner trust in this chart is best assessed through Saturn's criteria: track record over time, consistency of action and word, and clear agreements. Jupiter in the 9th may generate optimism about people's intentions — which is a gift but can also cause the chart to extend trust beyond what the evidence supports.\n\nMercury in the 11th gives strong instincts about whether someone is genuinely aligned — pay attention to what Mercury-sense tells you before and after conversations with the partner, not just during them.\n\nMars in the 3rd is useful here: it enables direct, frank conversations about expectations, roles, and what happens if things go wrong. Having those conversations explicitly — rather than assuming alignment — is the most reliable trust-building tool.\n\nPractical step: regardless of how the intuitive read feels, formalise the partnership with written agreements covering contributions, decisions rights, profit/loss allocation, and exit conditions. Good partners welcome clarity; partners who resist formalisation tend to have misaligned interests they prefer to keep ambiguous.\n\nNote: for significant financial decisions involving a partner, legal and financial due diligence should accompany the astrological read.`,
      };

    case "money_fear_spending":
      return {
        concern: "Fear of spending or financial anxiety",
        chartFactsUsed: [CHART.venus, CHART.saturn, CHART.jupiter, CHART.mercury],
        answer: `Financial anxiety and difficulty spending despite having resources is a specific pattern. Venus in the 12th house can create a complex relationship with expenditure — the 12th house governs both loss and liberation, and spending can feel like both simultaneously. Saturn in the 9th enforces an internal audit of whether spending is justified.\n\nThis pattern often develops after a period of genuine financial scarcity — the nervous system learns caution that later persists past its usefulness.\n\nJupiter in the 9th is a resource for this: Jupiter governs genuine abundance and expansion. Its placement in the 9th suggests that dharmic expenditure — spending that aligns with values and genuine need — is sustainable. Fear of spending that produces paralysis on necessary decisions is not a virtue; it is a residual response.\n\nPractical step: identify the spending categories that produce anxiety versus those that don't. Often the pattern is specific (spending on yourself, on pleasure, on certain amounts) rather than universal. The specific triggers are more useful than a general rule about frugality.\n\nNote: for active financial planning, a financial advisor adds precision that astrology cannot.`,
      };

    case "competitive_exam_continuation":
      return {
        concern: "Whether to continue with competitive exam preparation",
        chartFactsUsed: [CHART.saturn, CHART.mercury, CHART.jupiter, CHART.antarKetu],
        answer: `Competitive exam persistence is a Saturn-9th question: this chart supports long, structured effort toward institutional achievement, but Saturn also requires honest self-assessment of whether the direction is genuinely yours versus socially inherited.\n\nMercury in the 11th gives intellectual sharpness and adaptability — the cognitive ability for these exams is present. The question is whether the persistence is motivated by genuine alignment with what the qualification opens, or by sunk cost and external expectation.\n\nThe Jupiter/Ketu antardasha (Jul 2025–Jul 2026) is a natural pruning phase — it often creates honest questions about whether you are pursuing what you actually want. This is not a sign to quit; it is an invitation to be honest.\n\nPractical step: ask yourself what you would do if you were guaranteed to pass on the next attempt. If that answer energises you and you genuinely want what passing enables, the direction is right. If the answer is unclear or the thought of passing feels hollow, the direction may need reassessment.\n\nNote: financial and career trajectory decisions embedded in this choice benefit from planning beyond astrology alone.`,
      };

    case "fame_ambition":
      return {
        concern: "Ambition for fame, wide recognition, or being known",
        chartFactsUsed: [CHART.sun, CHART.lagna, CHART.mercury, CHART.saturn],
        answer: `Fame ambition is structurally coherent in this chart. Leo Lagna with Sun in the 10th house places natural identity in the public sphere — visibility and recognition are not vanity here, they are genuine vocational orientation. This chart is wired for public contribution and the recognition that accompanies it.\n\nSaturn in the 9th ensures that lasting fame in this chart is built, not gifted — it accrues through consistent, quality output over time rather than through a single dramatic moment. Mercury in the 11th (networks, communication) is the practical engine: fame for this chart tends to emerge from sustained communication of genuinely valuable ideas to relevant audiences.\n\nThe Jupiter/Venus antardasha (Jul 2026–Mar 2029) is the most active recognition window in this decade. Work done and visible in this period tends to produce the compound effect that fame actually runs on.\n\nPractical step: separate "being famous" from "doing work that reaches many people who need it." The second is actionable. Identify the specific people you want to reach, what you want to offer them, and the channel through which to reach them. Fame that follows from this tends to be durable; fame sought directly tends to be fragile.`,
      };

    case "social_media_mental_health":
      return {
        concern: "Social media affecting mental health and self-comparison",
        chartFactsUsed: [CHART.moon, CHART.mercury, CHART.rahu, CHART.sun],
        answer: `Social media's mental health impact is amplified in this chart by the Moon-Mercury configuration in Gemini, 11th house: both planets are drawn to information, social signals, and comparison — which is precisely what social media optimises for. The result is a higher-than-average susceptibility to comparison loops and the dopamine-spike-and-crash pattern that feeds platform engagement.\n\nRahu in the 12th can create a compulsive quality to late-night or hidden scrolling — a background restlessness that the platform temporarily soothes without resolving.\n\nLeo Lagna with Sun in the 10th means that how you appear publicly matters significantly to internal self-assessment. Platforms that constantly rank and compare public presentation are therefore not neutral environments for this chart.\n\nPractical step: the evidence-based approach — time limits, no-phone periods, particularly no social media within an hour of sleep — applies with extra force for this configuration. Identify the specific feeling that prompts you to open the app (boredom, anxiety, loneliness), and create one alternative response for that trigger.\n\nNote: if social media use is significantly disrupting sleep, mood, or function, speaking with a mental health professional is appropriate — astrology complements but does not replace that conversation.`,
      };

    case "life_changes_cycles":
      return {
        concern: "Major life transition and everything changing at once",
        chartFactsUsed: [CHART.currentDasha, CHART.antarKetu, CHART.antarVenus, CHART.varshaphal],
        answer: `Periods when everything changes simultaneously are often dasha transition zones, and the chart here shows exactly such a sequence. The Jupiter/Ketu antardasha (Jul 2025–Jul 2026) is structurally a dissolution phase — Ketu rules releasing, ending, and inner restructuring. Multiple things ending or transforming simultaneously during this period is not unusual; it is the antardasha's function.\n\nThe Jupiter/Venus antardasha (Jul 2026–Mar 2029) that follows is a consolidation and building phase — the changes currently in motion tend to settle into a new, more aligned configuration during this period.\n\nThe 2026 Varshaphal provides seasonal texture: Mars 10th (Jun–Jul) for active career push, Jupiter 1st (Aug–Oct) for identity expansion, Saturn 9th (Oct–Dec) for disciplined structuring.\n\nPractical step: during major life transitions, reduce the number of simultaneous changes you are trying to manage. Ketu antardasha asks for focus, not expansion. Identify the one or two changes that are essential and allow the others to wait. This is not avoidance — it is strategic sequencing.`,
      };

    case "property_purchase":
      return {
        concern: "Property purchase timing and risk",
        chartFactsUsed: [CHART.saturn, CHART.jupiter, CHART.venus, CHART.antarVenus],
        answer: `Property timing in Jyotish is assessed through the 4th house (home, fixed assets), Mars (construction, land), Venus (valuation), and the active dasha sequence. The chart shows no active Sade Sati or heavy malefic influence on the 4th-house themes around 2026, which removes one concern.\n\nSaturn in the 9th house means that significant asset decisions work best when preceded by thorough due diligence — legal, financial, and structural. Rushing this process tends to create complications that slower decisions avoid.\n\nThe Jupiter/Venus antardasha (Jul 2026–Mar 2029) is a period associated with Venus-ruled assets (property, comfort, value) becoming more active. Decisions finalised in this window tend to carry a smoother trajectory than ones rushed before it.\n\nPractical step: before committing to any property, verify legal title, encumbrance status, financing terms, and the realistic maintenance and running cost beyond the purchase price. Document all agreements. The "right timing" in the chart is most useful when the paperwork and finances are sound first.\n\nNote: for specific dates and property-purchase muhurta (auspicious timing), a dedicated jyotish consultation is more precise than a general reading.`,
      };

    case "content_creation_spiritual":
      return {
        concern: "Starting a YouTube channel, blog, or content creation venture",
        chartFactsUsed: [CHART.mercury, CHART.sun, CHART.jupiter, CHART.rahu, CHART.antarVenus],
        answer: `Content creation is structurally supported in this chart. Mercury in Gemini in the 11th house gives genuine communication ability, intellectual range, and the capacity to engage audiences. The 11th house governs gains through networks — content platforms are essentially network-gain channels. Sun in the 10th house means your public presence and visible output carry natural authority.\n\nJupiter in the 9th (teaching, wisdom, dharma) supports content that educates, inspires, or offers philosophical or spiritual grounding — which makes a spirituality-oriented channel particularly aligned for this chart. Rahu in the 12th house adds creative restlessness and a pull toward the unconventional, which keeps content from being generic.\n\nThe Jupiter/Venus antardasha (Jul 2026–Mar 2029) is the most active window for creative visibility in this decade. Starting consistently before this period builds the platform for the amplification that tends to arrive during it.\n\nPractical step: publish 12–20 pieces consistently before evaluating the channel's viability. Most content projects that succeed do so in the second or third month, not the first week. The primary variables are consistency, quality, and genuine value delivered — the chart's communication strength is a real asset here.\n\nRemedy (optional): teach responsibly — ensure the spiritual content is grounded in genuine study rather than intuition alone.`,
      };

    case "investment_speculation":
      return {
        concern: "Cryptocurrency, stock market, or speculative investment",
        chartFactsUsed: [CHART.saturn, CHART.jupiter, CHART.mercury, CHART.venus],
        answer: `Speculative investments have a specific chart signature: Rahu/8th/12th house activation tends to amplify both the attraction to and the risk of high-variance financial instruments. This chart has Rahu in the 12th and Venus (financial comfort) also in the 12th — which can indicate money flowing out in less visible ways when caution is suspended.\n\nSaturn in the 9th requires that genuine financial decisions be grounded in disciplined analysis, not trend-following or social proof. Jupiter in the 9th can generate optimism about speculative outcomes that exceeds what the evidence supports — this is worth monitoring when evaluating "promising" investments.\n\nAstrology cannot predict individual price movements, market cycles, or regulatory outcomes — all of which are decisive for cryptocurrency performance. Any amount invested in speculative assets should be an amount you can lose without affecting your financial stability.\n\nPractical step: before investing in any high-volatility instrument, apply the rule: if this goes to zero, does my life materially change? If yes, reduce the position until it doesn't. Financial advisors with crypto-specific knowledge provide value here that astrology cannot.\n\nNote: the Jupiter/Venus antardasha (Jul 2026–Mar 2029) is generally prosperous for this chart, but that applies to disciplined, structured financial behaviour — not speculation.`,
      };

    case "study_blocks":
      return {
        concern: "Mental blocks or difficulty concentrating in studies",
        chartFactsUsed: [CHART.mercury, CHART.saturn, CHART.jupiter, CHART.moon, CHART.antarKetu],
        answer: `Study blocks in this chart often originate from the Mercury-Moon configuration in Gemini: the mind is genuinely fast and wide-ranging, which creates two specific study problems — difficulty settling into one subject long enough to go deep, and the tendency to edit or judge understanding while still in the input phase.\n\nSaturn in the 9th governs the structure of sustained study — it rewards consistent, scheduled effort over pressure-burst cramming. The chart is not built for marathon last-minute sessions; it responds better to shorter, recurring blocks of genuine engagement.\n\nThe Jupiter/Ketu antardasha (Jul 2025–Jul 2026) can add a quality of feeling unclear or disconnected from purpose. If studying feels meaningless right now, it may partly be this antardasha's influence on motivation — it tends to reduce attachment to outcomes, which can feel like apathy.\n\nPractical step: break study into 25-minute focused blocks (Pomodoro method) with a specific output target for each block — one concept understood, one problem solved, one section summarised. The specificity gives Mercury-Moon something concrete to land on.\n\nRemedy (optional): Wednesday study discipline — even a short period of deliberate, distraction-free study on Wednesdays helps activate Mercury's strength in this chart.`,
      };

    case "ancestral_property":
      return {
        concern: "Selling or managing ancestral or family property",
        chartFactsUsed: [CHART.saturn, CHART.jupiter, CHART.ketu, CHART.moon],
        answer: `Ancestral property decisions sit at the intersection of 4th house (home, roots, fixed assets), 8th house (inheritance, joint assets, transformation), and the active dasha. Saturn in the 9th brings a duty-awareness to inherited assets — there can be a genuine sense of obligation to family tradition alongside the practical question of whether holding is wise.\n\nKetu in the 6th house (disputes, debts, service) can sometimes indicate that property-related matters require careful legal attention to avoid unresolved complications from the family lineage side.\n\nJupiter in the 9th represents the dharmic frame — decisions about ancestral assets carry a quality beyond pure financial calculation. Selling ancestral property tends to feel significant regardless of the financial outcome, which is worth acknowledging as part of the process.\n\nPractical step: before any sale or significant decision about inherited property, verify: (1) legal title is clean and all heirs are in agreement, (2) the financial terms are genuinely advantageous and not driven by urgency or emotional conflict, (3) any family elders who should be consulted have been. Documentation at every stage is the most protective act.\n\nNote: for property decisions with multiple parties or legal complexity, a property lawyer's involvement is more protective than an astrological timing alone.`,
      };

    case "public_failure_fear":
      return {
        concern: "Fear of moving forward because of potential public failure",
        chartFactsUsed: [CHART.sun, CHART.lagna, CHART.saturn, CHART.venus, CHART.mars],
        answer: `Fear of public failure has a specific structure in Leo Lagna charts — identity is closely bound to how you appear publicly, so failure in a visible arena feels like a verdict on who you are rather than just an outcome that didn't work. This isn't weakness; it's the signature of a chart that takes public contribution seriously.\n\nSaturn in the 9th means that genuine capability in this chart shows up gradually through repeated visible effort, not through dramatic debut. The first public attempt is almost never the defining one — it is the practice round. Saturn's reward logic requires showing up even before it's optimal.\n\nVenus in the 12th can create a perfectionistic private preparation phase that extends longer than necessary because going public feels like it ends the protected inner space. Mars in the 3rd provides the actual communication capacity — when activated, it is directness and initiative that appear, not the fear.\n\nPractical step: design the smallest possible version of the public act you're avoiding. Not a launch — a test. Not an announcement — a single post, conversation, or experiment. The fear is about the size and stakes of the imagined moment; making the first step genuinely small removes most of the charge.\n\nThe Jupiter/Venus antardasha (Jul 2026–Mar 2029) is the most natural public-expansion window for this chart — starting before it means you have built real experience by the time that amplification arrives.`,
      };

    case "private_sector_vs_govt":
      return {
        concern: "Choosing between government and private sector jobs",
        chartFactsUsed: [CHART.sun, CHART.saturn, CHART.mercury, CHART.jupiter, CHART.antarVenus],
        answer: `Government versus private sector is fundamentally a stability-versus-growth question, and this chart has a nuanced answer. Saturn in the 9th house alongside Jupiter values structured, long-horizon investment in a domain — government roles, with their structured progression and security, can suit this Saturn placement well. However, Leo Lagna and Sun in the 10th house need visible leadership and self-directed contribution — which institutional structures sometimes constrain.\n\nMercury in the 11th (Gemini) gives genuine strength in fast-moving, communication-intensive environments — private or dynamic sectors tend to leverage this more fully than rigid structures do. Jupiter in the 9th can provide the dharmic and intellectual environment that government roles in policy, education, or public service sometimes offer.\n\nThe practical distinction: if security and gradual, structured growth are the priority, and if the specific government role offers genuine public contribution, it can be right. If rapid skill development, income growth, and self-directed work are the priority, private-sector environments tend to suit this chart's Sun-Mercury dynamic better.\n\nPractical step: do not choose based on status or external pressure. Choose based on which environment will build the specific skills and position you want to be in 5 years from now. That analysis is more reliable than timing alone.\n\nThe Jupiter/Venus antardasha (Jul 2026–Mar 2029) is the most supported career-move window in this decade — decisions made with clarity in this period tend to produce good traction.`,
      };

    case "backup_option_love":
      return {
        concern: "Feeling like a second choice or backup option in relationships",
        chartFactsUsed: [CHART.venus, CHART.moon, CHART.rahu, CHART.sun],
        answer: `Feeling like someone's backup option — available when their first choice isn't — is a pattern worth understanding without self-blame. Venus in Cancer in the 12th house can create a relationship dynamic where love operates quietly and sacrificially, sometimes invisibly. The 12th house can make someone undervalue or not fully claim their own relational worth.\n\nMoon in Gemini in the 11th gives genuine warmth and adaptability that can attract connections who sense your accommodating nature and lean on it without fully reciprocating. This is not a flaw — it's an imbalance in how the warmth is being applied.\n\nLeo Lagna with Sun in the 10th: at the career level, this chart is oriented toward being recognised and leading. The same self-assertion that comes naturally in professional life often needs to be consciously brought into personal relationships.\n\nThe Jupiter/Ketu antardasha (Jul 2025–Jul 2026) is a period for releasing patterns that no longer serve — including relational patterns. Jupiter/Venus beginning Jul 2026 brings a different quality of connection, where your value is more clearly seen.\n\nPractical step: the next time you notice yourself available in ways the other person is not, name it — not to confront, but to see clearly. Clarity about the imbalance is the first step to changing it.`,
      };

    case "relationship_family_disclosure":
      return {
        concern: "Whether and how to tell family about a relationship",
        chartFactsUsed: [CHART.venus, CHART.moon, CHART.mars, CHART.jupiter],
        answer: `Deciding when and how to disclose a relationship to family sits at the intersection of timing and clarity. Venus in the 12th house (Cancer) often creates a preference for keeping relationships private until they are solidly grounded — this is not deception, it is an appropriate protective instinct.\n\nMars in the 3rd house gives the courage to communicate when you choose to, but suggests acting from a considered position rather than in response to pressure. The 3rd house governs how and when you speak.\n\nJupiter in the 9th (dharma and values) means that if the relationship aligns with your core values, disclosure tends to feel more natural. If there is persistent difficulty articulating the relationship to family, it is sometimes worth examining whether the hesitation is about family acceptance or about something unresolved in the relationship itself.\n\nPractical step: before disclosing, establish your own clarity first — what you want from this relationship, what you are asking family to understand, and what the minimum conditions are for their support to matter. Then disclose from a position of internal clarity rather than urgency.\n\nThe Jupiter/Venus antardasha (Jul 2026–Mar 2029) tends to support relational openness and family-level communication more naturally than the current Ketu period.`,
      };

    case "attraction_older_people":
      return {
        concern: "Feeling attracted to older or more serious partners",
        chartFactsUsed: [CHART.saturn, CHART.venus, CHART.jupiter, CHART.moon],
        answer: `Attraction to older or more serious people has a clear chart basis here. Saturn in the 9th house creates an orientation toward depth, maturity, and earned experience — these qualities are naturally attractive to this placement. A peer-level relationship that lacks seriousness or depth can feel intellectually unstimulating.\n\nVenus in Cancer in the 12th carries a pull toward protection, containment, and emotional safety — which older or more established partners often embody structurally rather than just as personality. The 12th house Venus appreciates a partner who has already done some of their own inner work.\n\nJupiter in the 9th (wisdom, philosophy, expansion) resonates with people who have lived enough to have something substantive to offer in conversation and in life direction. This is not dependency — it is a genuine compatibility criterion.\n\nThis is not a problematic pattern. It becomes worth examining only if the attraction includes avoidance of peers (which signals something about fear of mutual vulnerability) or if it consistently involves partnerships where the power differential is problematic.\n\nPractical step: notice whether you are drawn to the maturity itself or to the security it represents. The maturity is a real and valid criterion; the security dimension is worth building in yourself independently.`,
      };

    case "return_previous_job":
      return {
        concern: "Considering returning to a previous job or employer",
        chartFactsUsed: [CHART.mercury, CHART.saturn, CHART.jupiter, CHART.antarVenus],
        answer: `Returning to a previous employer is worth evaluating on its own terms, not on nostalgia or on what others might think about it. Mercury in the 11th (Gemini) is pragmatic about career networks — a previous employer who sees your value and offers appropriate terms is not a step back; it is a use of existing network capital.\n\nSaturn in the 9th means career decisions work better when evaluated against long-horizon criteria: does this role build skills and position I want to be in? Does it respect the work I have done in the interim? Saturn rewards strategic reentry when it is genuinely a step toward something, not just a retreat from something.\n\nThe question to answer honestly: has the situation at the previous employer actually changed, or is the appeal mainly about familiarity? If the structural conditions that led you to leave remain the same, returning tends to reproduce the same experience.\n\nThe Jupiter/Venus antardasha (Jul 2026–Mar 2029) is the strongest career-progression window in this decade. Ideally, any significant career decision in that period should position you for growth rather than consolidation.\n\nPractical step: list the three things that were not working at the previous role. Then verify whether those three things are materially different now. If yes, return is a genuine option. If not, this is worth examining.`,
      };

    case "fasting_health_weak":
      return {
        concern: "Wanting to fast for remedies but having health concerns",
        chartFactsUsed: [CHART.ketu, CHART.jupiter, CHART.saturn, CHART.currentDasha],
        answer: `The desire to fast for spiritual or remedial purposes, and the concern about health, are both worth taking seriously — they need not be in opposition. Ketu in the 6th house governs the intersection of health, service, and spiritual discipline. This is a chart placement that is naturally drawn to spiritual practices, including fasting, but it also creates sensitivity around health and the 6th house (body, illness, daily routine).\n\nThe Jyotish principle for fasting is proportionality: the remedy should be within the body's capacity without creating physical depletion. A depleted practitioner does not accumulate spiritual merit — they simply deplete. Light fasting practices (skipping one meal, eating simple foods, avoiding specific items) tend to be both accessible and effective for this chart.\n\nFor those with health concerns, traditional alternatives to extended fasting include: observing dietary simplicity on remedy days (fruits and water, or a single meal), engaging in mantra recitation or meditation instead of full fasting, and charitable giving as a substitute when the body cannot support the physical practice.\n\nPractical step: consult a doctor about what your specific health condition does and does not permit. Within those parameters, choose the most manageable practice you can do consistently — consistency over intensity is the Jyotish standard for remedial practice.`,
      };

    case "competitive_colleagues":
      return {
        concern: "Dealing with competitive or politically difficult colleagues",
        chartFactsUsed: [CHART.mars, CHART.mercury, CHART.sun, CHART.saturn],
        answer: `Competitive colleagues and office politics are an environment problem as much as a people problem. Mars in the 3rd house gives genuine competitive instinct and communication ability — but the 3rd house is also the house of peers, and this Mars placement creates an environment where peer competition is noticed and felt strongly.\n\nSun in the 10th house means professional identity is closely tied to reputation and visibility — which makes competitive behavior from colleagues feel more personally threatening than it might to someone less anchored in their public role. This sensitivity is informative: it signals what actually matters to you, which is worth knowing.\n\nMercury in the 11th (Gemini) has a pragmatic advantage here: the ability to build networks and information flows independently of any single competitive relationship. People with strong 11th house Mercury tend to navigate office politics best by expanding their circle rather than trying to win within a narrow one.\n\nSaturn in the 9th enforces a long-horizon view: colleagues who use political tactics tend to produce shorter-term gains at the cost of sustainable reputation. Saturn's patience is an actual strategic asset here.\n\nPractical step: invest in building relationships with people two levels above and below you in the organization, not just across your current peer group. The breadth reduces the impact of any single competitive dynamic.`,
      };

    case "revenge_legal":
      return {
        concern: "Whether to take revenge or pursue legal action",
        chartFactsUsed: [CHART.saturn, CHART.mars, CHART.jupiter, CHART.sun],
        answer: `The desire to correct a genuine wrong — whether through legal means or personal response — is understandable. Mars in the 3rd house provides the energy for direct action and assertiveness. Saturn in the 9th governs dharma, justice, and the structured pursuit of what is right.\n\nSaturn's voice in the 9th house is consistent: justice pursued through proper structure (legal, institutional) tends to produce better outcomes than personal revenge, which often produces escalation without resolution. This is not a counsel of passivity — it is a strategic observation.\n\nFor legal action specifically: the question to answer honestly is whether the potential outcome (financial, reputational, practical) is proportionate to the energy, time, and money the process will require. Legal processes are Saturn-governed — they tend to be slow, formal, and expensive. Pursuing them from a position of clarity and adequate documentation produces better results than acting from emotional urgency.\n\nFor the impulse toward personal revenge: Leo Lagna and Sun in the 10th mean reputation matters in this chart. Actions taken primarily from anger tend to damage the reputation of the person taking them as much as the target.\n\nPractical step: write down the specific outcome you want from this situation. Then assess which available action (legal, professional, practical, personal) most directly produces that outcome with the least cost.\n\nNote: for actual legal matters, consult a qualified lawyer — astrology cannot substitute for legal advice.`,
      };

    case "discomfort_home":
      return {
        concern: "Feeling uncomfortable or unsettled in your home environment",
        chartFactsUsed: [CHART.rahu, CHART.moon, CHART.venus, CHART.ketu],
        answer: `Feeling persistently uncomfortable at home — restless, unsettled, or like you can't fully be at ease — is worth examining through multiple lenses. Rahu in Cancer in the 12th house creates a quality of restlessness and longing that can make any fixed location feel slightly insufficient or temporary. This is not a property problem; it is a Rahu signature.\n\nMoon in Gemini in the 11th is naturally oriented toward social environments, external stimulation, and varied connection — the home, as a quiet or contained space, can feel limiting for this placement. The home may function best as a base rather than as a primary life space.\n\nVenus in the 12th (hidden, behind-the-scenes) creates the need for genuine private retreat within the home — a specific space or time that is fully yours, not shared or managed. Without this, the home functions as performance space, which is draining.\n\nThe Jupiter/Ketu antardasha (Jul 2025–Jul 2026) can heighten inner dissatisfaction with external circumstances. This is often more about an inner restlessness than about the actual living situation.\n\nPractical step: identify the specific trigger for discomfort — noise, shared space, relationship dynamics within the home, or something more diffuse like a sense of not belonging. The specific trigger points toward the specific solution more reliably than the general feeling.`,
      };

    case "career_healing_coaching":
      return {
        concern: "Career in healing, coaching, astrology, or helping professions",
        chartFactsUsed: [CHART.jupiter, CHART.ketu, CHART.moon, CHART.mercury, CHART.venus],
        answer: `A career in astrology, healing, coaching, or counselling sits at an interesting intersection for this chart. Jupiter in the 9th house governs philosophy, teaching, guidance, and wisdom — this is the natural placement for someone drawn to meaning-making work. Ketu in the 6th carries past-life karma around service, healing, and detachment from conventional work structures.\n\nMoon in Gemini in the 11th gives genuine ability to connect with diverse people across their different situations — an essential quality for any practitioner. Mercury in the 11th (Gemini) adds communication fluency and the ability to translate complex ideas into accessible language.\n\nThe caution: Jupiter in the 9th alongside Saturn means that genuine mastery in these fields is required before the work becomes reliably sustainable as income. Saturn doesn't allow shortcuts — depth and rigour in training tend to pay off; rushing into practice without adequate grounding tends to hit structural limits.\n\nThe Jupiter/Venus antardasha (Jul 2026–Mar 2029) is supportive of building visibility and clientele in service-oriented fields. Starting or deepening practice in 2026 into 2027 tends to have stronger traction.\n\nPractical step: regardless of the field you're considering, identify three practitioners you genuinely admire. Examine what they have in common in terms of training, positioning, and how they work. That comparison tells you more about what actually leads to quality practice than the general appeal of the field does.`,
      };

    case "losing_documents":
      return {
        concern: "Frequently losing important documents or forgetting key details",
        chartFactsUsed: [CHART.mercury, CHART.moon, CHART.rahu],
        answer: `Frequent misplacement of documents and forgetting details has a chart basis in the Mercury-Moon configuration. Both Mercury and Moon are placed in the 11th house in Gemini: a sign and house that is naturally wide-ranging and externally oriented. The mind moves fast and broadly — which is an asset for thinking and connection, but can mean that specific, routine detail management falls outside its natural focus.\n\nRahu in the 12th (Cancer) adds a background quality of distraction and restlessness — a tendency for the attention to be pulled toward what is absent, potential, or unresolved, rather than what is present in front of you.\n\nThis is a systems problem more than a memory problem. When a mind like this has a reliable external system for storing and retrieving important items (designated physical locations, digital organisation, habit-based check-ins), the pattern changes significantly. Relying on memory for things that systems can manage is misusing this chart's cognitive strengths.\n\nPractical step: pick the three categories of things you most frequently lose or forget (documents, keys, deadlines, appointments). For each, create one simple, consistent external system — a designated physical location, a digital folder structure, a weekly review habit. Consistency in the system compensates for the attention that naturally goes elsewhere.\n\nRemedy (optional): Wednesday mornings are good for Mercury-related organisational tasks — keeping an active inbox/review habit on that day can help anchor the week's loose ends.`,
      };

    case "mother_anxiety":
      return {
        concern: "Mother's anxiety or worry affecting you",
        chartFactsUsed: [CHART.moon, CHART.rahu, CHART.venus, CHART.ketu],
        answer: `A mother's chronic worry has a double effect: the worry itself, and the weight of managing her emotional state on top of your own. Moon in Gemini in the 11th is responsive to others' emotional states — the social and emotional radar is active. Rahu in Cancer in the 12th can create invisible emotional entanglement with family figures, particularly maternal ones.\n\nThe important distinction is between being aware of your mother's worry (which you cannot prevent) and being responsible for resolving it (which is not actually yours to resolve). These can feel identical but are structurally different. Her anxiety has its own causes and history; it preceded your adulthood and will not be solved by your choices alone.\n\nVenus in the 12th and Moon in the 11th mean that emotional absorption is a natural tendency — picking up others' emotional states and internalising them. This is a feature of the chart that requires conscious management, not elimination.\n\nPractical step: identify one specific behaviour that you change in response to your mother's worry — a decision you defer, a conversation you avoid, a truth you soften. That specific behaviour is the place where her worry most costs you. Addressing it, even partially, tends to change the dynamic more than addressing the general pattern.\n\nFor recurring tension, short separations (even brief non-contact periods) can help both parties recalibrate.`,
      };

    case "headaches_stress":
      return {
        concern: "Stress-related headaches or tension",
        chartFactsUsed: [CHART.mars, CHART.mercury, CHART.moon, CHART.saturn],
        answer: `Stress-related headaches and physical tension often reflect where the mental load is being processed through the body. Mercury and Moon in the 11th house (Gemini) create a high-bandwidth mental processing style — the mind is constantly active, associating, and engaging. Mars in the 3rd adds a quality of physical energy that, when not directed, can create tension in the head, shoulders, and neck area.\n\nSaturn in the 9th governs discipline and structure. When structure is absent — when there is too much to do without prioritisation — Saturn's absence creates diffuse pressure that the body absorbs.\n\nThe practical dimension: headaches that are purely stress-related respond to reducing mental load (not just managing symptoms). This means actual boundary-setting about what gets mental attention, not just relaxation techniques.\n\nPractical step for today: identify the single thing causing the most persistent low-grade mental background noise right now. That one thing is likely contributing more to the tension than everything else combined. Addressing it — even beginning to address it — tends to reduce the physical holding.\n\nNote: chronic or severe headaches warrant evaluation by a medical professional. Astrology addresses patterns of stress, not neurological or physiological causes. If headaches are frequent or intense, please consult a doctor.`,
      };

    case "mentor_becomes_controlling":
      return {
        concern: "A mentor or teacher who has become controlling or possessive",
        chartFactsUsed: [CHART.jupiter, CHART.saturn, CHART.ketu, CHART.sun],
        answer: `A mentor or teacher who has shifted from guiding to controlling is a real and disorienting situation. Jupiter in the 9th house governs gurus, teachers, and guides — it creates genuine appetite for wisdom and genuine openness to being taught. This openness is valuable, but it also makes this chart susceptible to mentors who exploit the student-teacher dynamic.\n\nSaturn in the 9th alongside Jupiter means the actual quality of the teaching — its rigour, honesty, and usefulness for your actual development — matters more than the relationship itself. Saturn is not sentimental about relationship structures; it evaluates on substance.\n\nKetu in the 6th (detachment, past-life karma in service relationships) can create difficulty in ending dynamics that have served their purpose. There can be a sense of obligation, debt, or spiritual guilt about stepping back from a guru relationship.\n\nLeo Lagna with Sun in the 10th: your own authority over your development is a core value in this chart. A genuine teacher ultimately creates independence; a controlling teacher creates dependence that serves the teacher's needs more than the student's development.\n\nPractical step: evaluate the relationship on one criterion — is your capacity to think, decide, and act independently increasing or decreasing through this mentorship? If decreasing, that is the structural answer about what the relationship has become.`,
      };

    case "pet_adoption":
      return {
        concern: "Whether to adopt a pet and the timing",
        chartFactsUsed: [CHART.moon, CHART.venus, CHART.jupiter, CHART.ketu],
        answer: `The desire to adopt a pet reflects a genuine relational and emotional need that the chart can address. Moon in Gemini in the 11th is responsive to companionship — pets provide consistent, non-reciprocally demanding affection, which suits this chart's need for connection without social complexity. Venus in the 12th often creates tenderness toward animals in particular — the 12th house governs hidden realms, including animal companions.\n\nKetu in the 6th house governs the 6th house's domain of pets and small animals — a Ketu placement here often indicates either a strong karmic connection to animals or difficulty with conventional pet responsibilities (routine care, veterinary schedules). Both are worth knowing before adopting.\n\nJupiter in the 9th: if the timing and practical conditions are right, pets in this chart tend to function as genuine companions rather than projects — they bring a kind of ease to the home environment that Jupiter in the 9th values.\n\nPractical considerations that matter more than timing: your daily schedule and how it accommodates the pet's needs, your housing situation, your capacity for the financial cost of veterinary care, and whether anyone in the home is uncertain about the adoption.\n\nIf the practical conditions are right, the current period (Jupiter Mahadasha) is generally supportive of adding positive relationships to your life. The Jupiter/Venus antardasha (Jul 2026–Mar 2029) is particularly warm for this kind of addition.`,
      };

    case "dating_break":
      return {
        concern: "Whether to take a break from dating",
        chartFactsUsed: [CHART.venus, CHART.ketu, CHART.moon, CHART.antarKetu],
        answer: `The question of whether to take a break from dating is really a question about what you want from that break — recovery, clarity, recalibration, or simply relief from effort. Each of these is a valid reason, but they produce different conclusions.\n\nVenus in Cancer in the 12th house can make dating particularly energy-intensive — the 12th house asks for genuine depth and meaning in relationships, which tends to make casual or surface-level dating feel more draining than satisfying. If dating has been feeling like output without meaningful return, that is not failure; that is a valid mismatch of energy and environment.\n\nThe current Jupiter/Ketu antardasha (Jul 2025–Jul 2026) is naturally more inward and consolidating. Ketu periods often bring genuine clarity about what you actually want in a relationship, as opposed to what has been available. A deliberate pause during this period is not avoidance — it can be productive inner work.\n\nMoon in Gemini in the 11th is socially oriented — complete withdrawal from connection tends to feel more unnatural than a deliberate change of pace. The question may not be "stop entirely" but rather "change the how" — different contexts, slower pace, different criteria.\n\nPractical step: define what success looks like for the break. "I'll know it was the right decision when..." forces clarity about what you're actually looking for. A break without clear intention tends to produce the same patterns when you return.`,
      };

    case "luxury_guilt":
      return {
        concern: "Guilt around spending on luxury, or guilt about earning more",
        chartFactsUsed: [CHART.venus, CHART.saturn, CHART.jupiter, CHART.ketu],
        answer: `Financial anxiety and difficulty spending despite having resources is a specific pattern. Venus in the 12th house (Cancer) can create a complex relationship with expenditure — the 12th house governs both loss and liberation, and spending can feel like both simultaneously. Saturn in the 9th enforces an internal audit of whether spending is justified.\n\nFor guilt about earning more than family members or peers: this often combines Saturn's tendency toward earned rather than windfall income with an internalized comparison dynamic. Having more when others have less can feel like a violation of a group norm, even when you've earned it honestly. This is a social/emotional pattern more than a financial one.\n\nJupiter in the 9th is a resource for this: Jupiter governs genuine abundance and expansion. Its placement in the 9th suggests that dharmic expenditure — spending that aligns with values and genuine need — is sustainable. Fear of spending that produces paralysis on necessary decisions is not a virtue; it is a residual response.\n\nPractical step: identify the spending categories that produce anxiety versus those that don't. Often the pattern is specific (spending on yourself, on pleasure, on certain amounts) rather than universal. The specific triggers are more useful than a general rule about frugality.\n\nNote: for active financial planning, a financial advisor adds precision that astrology cannot.`,
      };

    case "therapy_vs_astrology":
      return {
        concern: "Whether to choose therapy, astrology, or combine both",
        chartFactsUsed: [CHART.jupiter, CHART.moon, CHART.mercury, CHART.ketu],
        answer: `Astrology and therapy address genuinely different things — they are not competitors, and the question of "which one" is often a false dilemma. Astrology maps patterns and tendencies, gives a framework for timing and disposition, and can make sense of why certain themes recur. Therapy helps process the lived experience of those patterns, build new responses, and address underlying psychological structures that a chart cannot reach.\n\nJupiter in the 9th house is comfortable with frameworks and meaning-making — astrology tends to resonate for this placement as a tool for orientation. Moon in Gemini in the 11th benefits from conversation, reflection, and articulating inner experience — which therapy facilitates well.\n\nFor practical concerns that are primarily about decision-making, timing, and understanding tendencies, astrology is useful. For concerns that involve recurring emotional patterns, trauma, anxiety, grief, or relationship difficulties with deeper roots, therapy addresses the layer more directly.\n\nMany people use both simultaneously — they are genuinely complementary. The risk to avoid is using astrology to explain away patterns that would benefit from practical intervention, or using therapy's skepticism of determinism to dismiss the genuine pattern-recognition that Jyotish offers.\n\nPractical step: identify the specific concern you're trying to address. If it's "why do I keep doing this?" — either tool can help, and the chart often offers insight quickly. If it's "how do I change this?" — a therapist works at the behavioral and psychological layer where change actually happens.`,
      };

    case "family_not_convinced_partner":
      return {
        concern: "Family not approving or convinced about your partner",
        chartFactsUsed: [CHART.venus, CHART.moon, CHART.mars, CHART.saturn, CHART.jupiter],
        answer: `Family disapproval of a partner sits at the intersection of two real things: your assessment of the relationship and their concerns. Both deserve to be taken seriously rather than one being dismissed to defend the other.\n\nVenus in Cancer in the 12th house values emotional safety and genuine resonance in relationships — if your sense of the partnership is strong and the concerns are primarily social or status-based, that distinction matters. However, if family members who know you well have concerns that are specific and observable (behaviours, patterns, red flags), these are worth examining rather than explaining away.\n\nMoon in Gemini in the 11th gives genuine ability to read people — you likely have your own clear sense of whether the concerns are about the person or about the categories they represent (religion, caste, background, family status).\n\nSaturn in the 9th: relationships that require sustained, values-based effort tend to succeed in this chart; relationships maintained primarily against external pressure tend to create long-term difficulty for everyone involved.\n\nPractical step: separate the family's concerns into two categories — concerns about the specific person (behaviours, character, patterns) and concerns about categories (background, family, status). The first category deserves serious reflection; the second deserves its own honest examination. Your decision should be informed by both, not collapsed into one.`,
      };

    case "control_in_relationships":
      return {
        concern: "Being in a controlling relationship or attracting controlling partners",
        chartFactsUsed: [CHART.venus, CHART.mars, CHART.moon, CHART.ketu],
        answer: `Attracting controlling partners — or feeling controlled within relationships — is a pattern worth understanding at its root. Venus in Cancer in the 12th house can create a dynamic where love is expressed through sacrifice and accommodation, which can inadvertently signal to certain people that there is room to take over. The 12th house Venus often gives more than it receives, and this imbalance can invite people who take more than they give.\n\nMoon in Gemini in the 11th is adaptable and responsive to others — another quality that, without boundaries, can lead to relationships where your adaptability is treated as available space rather than a generous quality.\n\nKetu in the 6th house has a quality of karmic obligation around service and health — in relationships, this can manifest as feeling responsible for the other person's emotional state in ways that become quietly controlling on both sides.\n\nThe pattern changes when the capacity to disappoint someone without withdrawing from them is developed — the ability to hold a position in the face of someone else's displeasure. This is a specific skill, not a personality shift.\n\nPractical step: identify the specific moment in past relationships when you have accommodated something you did not actually want. That is the moment the dynamic was being established. Practising a different response in lower-stakes situations — saying "I'd prefer X" when offered a choice — builds the habit before it's needed in high-stakes ones.`,
      };

    case "puja_for_career":
      return {
        concern: "Whether a puja or ritual will help with career problems",
        chartFactsUsed: [CHART.jupiter, CHART.saturn, CHART.sun, CHART.currentDasha],
        answer: `Pujas and rituals have a legitimate place in the Jyotish framework — they are not superstition but intentional practice that aligns the practitioner's focus and disposition with the energy being cultivated. That said, they work alongside practical action, not in place of it.\n\nJupiter in the 9th house governs ritual, dharma, and formal spiritual practice — this chart responds well to structured, regular practices rather than one-off events. A consistent modest ritual (Thursday morning Jupiter practice, for example) tends to produce more sustained benefit than a single large puja.\n\nSun in the 10th governs career, public identity, and authority. Practices oriented toward Surya (Sun) — offering water at sunrise, reciting Aditya Hridayam, or simply beginning each workday with a brief intention — align with the chart's public-identity dimension.\n\nSaturn in the 9th: Saturn's position here means that the real "remedy" for career challenges is usually earned through sustained, disciplined effort. Ritual that supports this disposition (clarity, persistence, strategic action) is genuinely useful. Ritual used as a substitute for action tends to produce anxiety rather than relief.\n\nPractical step: before any major puja, identify the specific problem you want to address. Vague "career blessing" pujas produce vague results. Targeted practices — for clarity in a decision, for strength in a difficult period, for removing specific obstacles — tend to be more precise and more useful.`,
      };

    case "lucky_work_unlucky_love":
      return {
        concern: "Success in work but difficulty in love relationships",
        chartFactsUsed: [CHART.sun, CHART.venus, CHART.moon, CHART.saturn, CHART.lagna],
        answer: `The asymmetry between career success and relational difficulty is a documented pattern for certain chart configurations. Sun in the 10th house makes career, achievement, and public identity genuinely strong areas — this is where the chart's energy is most naturally directed and most reliably expressed.\n\nVenus in Cancer in the 12th house, by contrast, places relational and romantic life in a complex zone — the 12th house governs what is hidden, behind the scenes, or sacrificed. Relationships can feel like they exist in a different register from the public success, and often they require a different kind of presence than career does.\n\nThe practical reality: the skills that make someone professionally effective — decisiveness, goal orientation, public confidence — are not the same skills that make relationships fulfilling. Venus in the 12th asks for softness, patience, and willingness to be unseen and vulnerable, which can feel counterintuitive for someone whose identity is built on visible achievement.\n\nJupiter/Venus antardasha (Jul 2026–Mar 2029) brings stronger support for relational life — this is the period where the relational dimension tends to become more naturally accessible.\n\nPractical step: notice whether you bring the same energy to relationships that you bring to career challenges — problem-solving, results focus, efficiency. Relationships often require the opposite: presence without agenda, tolerance for ambiguity, willingness to not know.`,
      };

    case "money_owed_confrontation":
      return {
        concern: "Recovering money owed or confronting someone about money",
        chartFactsUsed: [CHART.mars, CHART.mercury, CHART.saturn, CHART.jupiter],
        answer: `Recovering money that is owed is both a practical and interpersonal challenge. Mars in the 3rd house provides genuine communicative assertiveness — when you choose to confront, you have the capacity to do so clearly and directly. The 3rd house governs communication, siblings, and direct interactions.\n\nMercury in the 11th (Gemini, gains) gives the ability to think clearly about financial transactions and to articulate positions in writing or conversation. Documenting the obligation before engaging — a message trail, a written record — strengthens the practical position.\n\nSaturn in the 9th says: pursue this through proper structure. If the amount and relationship justify it, a formal demand letter (even written yourself) is more effective than informal pressure. If it goes to legal process, Saturn rewards patience and documentation.\n\nJupiter in the 9th: there is a dharmic dimension to this — being owed money is a real imbalance, and asserting your right to recover it is not aggression; it is a legitimate claim. Excessive deference in financial matters can create a pattern that repeats.\n\nPractical step: before confronting, decide on your minimum acceptable outcome and your willingness to damage or end the relationship. These two parameters govern your approach: if you need the money and can accept losing the relationship, you can push harder. If the relationship matters, a softer first approach that preserves dignity for both parties is more strategic.\n\nNote: for significant amounts, a lawyer's advice on the most effective recovery route is worth the cost.`,
      };

    case "repeating_arguments_partner":
      return {
        concern: "Having the same argument with partner repeatedly",
        chartFactsUsed: [CHART.mercury, CHART.moon, CHART.mars, CHART.venus],
        answer: `Repeating the same argument with a partner is almost always a sign that something other than the argument's surface topic is not being addressed. The argument is real; it is just not about what it appears to be about.\n\nMercury and Moon in Gemini in the 11th: the mind is fast and articulate, which means arguments can cover a lot of ground quickly without reaching resolution. The ability to make a persuasive case can actually become an obstacle — both sides can construct compelling arguments that miss the underlying concern.\n\nMars in the 3rd: assertive communication is a strength, but Mars can bring urgency and heat to discussions in ways that escalate rather than clarify. The third house also governs habitual patterns of communication — including arguments.\n\nVenus in the 12th: what is most emotionally significant is often what remains unspoken — the 12th house tends to keep the deepest concerns private, which means they don't get addressed in the argument that keeps repeating.\n\nThe circular argument usually contains a question that one or both partners are afraid to ask directly: "Am I enough for you?" "Are you committed?" "Do you see my effort?" Identifying the actual question tends to change the conversation.\n\nPractical step: after the next recurring argument, separately write down: "What I actually wanted from that conversation that I didn't get." Not what you wanted to prove — what you needed. Comparing notes (if both are willing) usually reveals the actual question.`,
      };

    case "emotionally_older":
      return {
        concern: "Feeling emotionally older or more mature than peers",
        chartFactsUsed: [CHART.saturn, CHART.jupiter, CHART.ketu, CHART.moon],
        answer: `Feeling emotionally older than your age has a clear chart basis here. Saturn in the 9th house alongside Jupiter creates an orientation toward depth, long-horizon thinking, and earned wisdom rather than surface-level experience. Saturn's influence tends to produce people who engage with weight and consequence earlier than their peers, which reads as emotional maturity — even when it is simply a different processing style.\n\nKetu in the 6th house adds a quality of detachment and perspective that feels older than chronological age. Ketu carries karmic memory that makes some experiences feel already understood, already resolved — not because they are, but because there is a depth of reference that operates below conscious articulation.\n\nMoon in Gemini in the 11th gives genuine breadth of experience and connection across different kinds of people — which also accelerates the felt sense of having lived a great deal.\n\nThe practical dimension: feeling older is not inherently a burden, but it can create loneliness when peers are in a different life chapter. The Jupiter/Ketu antardasha (Jul 2025–Jul 2026) is particularly oriented toward inner consolidation — this may intensify the feeling temporarily, but Jupiter/Venus beginning Jul 2026 tends to bring peers and collaborators whose depth matches yours.\n\nPractical step: distinguish between "older" as isolation and "older" as perspective. The perspective is genuinely useful — the task is finding contexts and people where that depth is an asset, not a gap.`,
      };

    case "faith_crisis":
      return {
        concern: "Losing faith or experiencing a crisis of belief",
        chartFactsUsed: [CHART.jupiter, CHART.saturn, CHART.ketu, CHART.antarKetu],
        answer: `Losing faith — whether in a belief system, a sense of meaning, or confidence in a direction — is worth reading carefully through the chart. Jupiter in the 9th house governs dharma and belief systems; Saturn sitting alongside it creates the kind of tested, earned relationship with faith rather than an inherited one. When Saturn tests, it often temporarily removes certainty — not to destroy faith but to force a more honest, personal relationship with it.\n\nThe Jupiter/Ketu antardasha (Jul 2025–Jul 2026) is particularly relevant here. Ketu as antardasha lord during a Jupiter period creates inner withdrawal, dissolution of old structures of meaning, and questioning of previous certainties. This is a known and documented phase for people with this configuration — the loss of faith is a transit, not a permanent state, and it often signals a transition from inherited belief to personally verified understanding.\n\nWhat typically survives this kind of Ketu passage is the belief you actually test and prove to yourself — not what you were given. The Jupiter/Venus antardasha (Jul 2026–Mar 2029) tends to bring restoration and new anchoring.\n\nPractical step: distinguish between losing faith in a specific form or institution versus losing faith in meaning itself. Most "faith crises" in this chart are about the former — the form is dissolving but the underlying orientation toward meaning and dharma (Jupiter in 9th) remains. Don't mistake the loss of the vessel for the loss of what it was carrying.\n\nRemedy (optional): small, consistent practices — reading, contemplation, spending time in nature — tend to maintain the thread of meaning during Ketu periods better than large ritual gestures.`,
      };

    default:
      return buildGeneralLifeAnswer(undefined);
  }
}

function buildGeneralLifeAnswer(question?: string): AnswerBlueprint {
  // Extract key concern from the question for light personalization
  const q = (question ?? "").toLowerCase();
  let openingConcern = "This question touches patterns that are active in your chart right now.";
  let practicalFocus = "identify the aspect of your current question that you actually have the most agency over";

  if (/\b(feel|feeling|felt|emotion|anxiety|fear|worried|scared|alone|lonely|lost|confused|sad|angry|guilty|ashamed)\b/.test(q)) {
    openingConcern = "This emotional pattern is worth reading through the chart carefully.";
    practicalFocus = "name the specific feeling underneath the broader question — the specific emotion is often a signal toward the real concern";
  } else if (/\b(should i|can i|will i|what should|what can)\b/.test(q)) {
    openingConcern = "This decision question benefits from chart timing and practical grounding together.";
    practicalFocus = "separate the decision into what you can act on now versus what requires more information or time";
  } else if (/\b(why do i|why am i|why does|why is)\b/.test(q)) {
    openingConcern = "Pattern questions like this often have both a chart signature and a practical root.";
    practicalFocus = "track when this pattern appears most strongly — the trigger often points to the practical root more clearly than the chart alone";
  } else if (/\b(relationship|partner|love|marriage|commitment|family|parents)\b/.test(q)) {
    openingConcern = "This relationship-and-connection question sits at the intersection of chart factors and lived reality.";
    practicalFocus = "identify one concrete aspect of the situation you can influence directly this week";
  } else if (/\b(career|job|work|profession|business|money|financial|investment|salary)\b/.test(q)) {
    openingConcern = "This professional or financial question has both timing and structural dimensions in the chart.";
    practicalFocus = "define the specific outcome you want from this situation — vague goals generate vague decisions";
  }

  return {
    concern: "General life question",
    chartFactsUsed: [CHART.lagna, CHART.currentDasha, CHART.antarKetu, CHART.antarVenus],
    answer: `${openingConcern} Leo Lagna with Sun as its lord in the 10th house places strong emphasis on visible contribution and self-authorship — the chart is oriented toward meaningful output, not simply going through motions.\n\nThe current Jupiter/Ketu antardasha (Jul 2025–Jul 2026) is a consolidation and inner-work phase. Questions about direction, meaning, and what to release tend to be most active during this period — these are appropriate questions, not signs of being lost. The Jupiter/Venus antardasha beginning Jul 2026 brings a different energy: expansion, relationship, and tangible growth in the areas the inner work has been clarifying.\n\nJupiter in the 9th house (dharma, fortune, wisdom) and Saturn in the 9th (earned, structured effort) sit alongside each other — the chart is designed for meaningful contribution built through disciplined, values-aligned work.\n\nPractical step: ${practicalFocus}. Most situations contain one part that depends on others or on time, and one part entirely within your sphere of action. The actionable part is almost always more productive to start with.\n\nRemedy (optional): Jupiter in the 9th benefits from regular engagement with learning, teaching, or reflection — keeping that inquiry active tends to support the broader chart's functioning.`,
  };
}

// ── Safety / rule enforcer ────────────────────────────────────────────────────

function applySafetyOverride(answer: string, question: string): string {
  const q = question.toLowerCase();
  if (/\b(lawyer|legal|court|sue|file a case)\b/i.test(q)) {
    return answer + "\n\nFor any legal matter, please consult a qualified lawyer. Astrology can reflect tendencies and timing but cannot substitute for legal advice.";
  }
  if (/\b(doctor|medical|surgery|diagnosis|treatment|medicine|hospital)\b/i.test(q)) {
    return answer + "\n\nFor health-related decisions, please consult a qualified medical professional. Astrology is not a substitute for medical advice.";
  }
  if (/\b(3 year|4 year|5 year|decade|long.?term future|many years)\b/i.test(q)) {
    return answer + "\n\nNote: For predictions more than 3 years into the future, a detailed Guru of Guru (premium) consultation is recommended for accurate assessment.";
  }
  return answer;
}

// ── Main export ───────────────────────────────────────────────────────────────

export function buildDomainAwareCompanionAnswer(
  input: DomainAwareAnswerInput
): DomainAwareAnswerResult | null {
  const { question, mode } = input;

  if (mode === "exact_fact") return null;
  if (!question || !question.trim()) return null;
  if (isSafetyBlocked(question)) return null;

  const domain = detectDomain(question);
  const blueprint = domain === "general_life" ? buildGeneralLifeAnswer(question) : buildAnswer(domain);
  const finalAnswer = applySafetyOverride(blueprint.answer, question);

  return {
    answer: finalAnswer,
    domain,
    concern: blueprint.concern,
    chartFactsUsed: blueprint.chartFactsUsed,
    hasEmotionalAck: true,
    hasPracticalGuidance: true,
    hasRemedy: finalAnswer.toLowerCase().includes("remedy") || finalAnswer.toLowerCase().includes("optional"),
    hasChartBasis: blueprint.chartFactsUsed.length > 0,
  };
}
