/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

export type ChartAnchor = {
  key: string
  label: string
  value: string
  domains: string[]
  evidence: string
}

export type ChartDomainProfile = {
  id: number
  domain: string
  topicKeys: string[]
  coreLogic: string
  mustUseAnchors: string[]
  risks: string[]
  safeBoundaries: string[]
}

export const JYOTISHKO_CHART_ANCHORS = {
  identity: {
    name: 'Jyotishko Roy',
    birthData: '14 June 1999, 09:58, Kolkata, India',
    lagna: 'Leo',
    rasi: 'Gemini',
    nakshatra: 'Mrigasira pada 4',
    currentMahadasha: 'Jupiter Mahadasha from 22 Aug 2018 to 22 Aug 2034',
    currentTransition:
      'Around 29 Apr 2026 the chart is near Jupiter-Ketu / moving into Jupiter-Venus depending on dasha table variant',
    varshaphal2026:
      'Varshaphal year beginning 14 Jun 2026 has Muntha in 5th bhava with Mars, Rahu, Jupiter, Saturn, Mercury, Ketu, Venus, Sun and Moon subperiods across 2026-2027',
  },
  placements: {
    sun: 'Sun in Taurus, 10th house',
    moon: 'Moon in Gemini, 11th house',
    mars: 'Mars in Libra, 3rd house',
    mercury: 'Mercury in Gemini, 11th house',
    jupiter: 'Jupiter in Aries, 9th house',
    venus: 'Venus in Cancer, 12th house',
    saturn: 'Saturn in Aries, 9th house',
    rahu: 'Rahu in Cancer, 12th house',
    ketu: 'Ketu in Capricorn, 6th house',
  },
} as const

const DOMAIN_PROFILES: ChartDomainProfile[] = [
  { id: 1, domain: 'Identity, Personality, Core Temperament', topicKeys: ['identity','personality','temperament','self','nature'], coreLogic: 'Leo Lagna gives visibility, pride and leadership while Gemini Rasi and Mrigasira bring curiosity, adaptability and mental restlessness. The reading should describe strengths and contradictions, not flatten the chart into one mood.', mustUseAnchors: ['Leo Lagna', 'Gemini Rasi', 'Mrigasira pada 4'], risks: ['criticism sensitivity', 'scattered effort', 'pride reactions'], safeBoundaries: ['No personality certainty from one line', 'Use tendency language'] },
  { id: 2, domain: 'Physical Health, Vitality', topicKeys: ['health','vitality','sleep','body','physical'], coreLogic: 'Leo Lagna makes vitality important; Rahu and Venus in the 12th can disturb rest, and Ketu in the 6th can make recovery a theme. Give wellness guidance without diagnosis.', mustUseAnchors: ['Leo Lagna', 'Rahu in Cancer 12th', 'Ketu in Capricorn 6th'], risks: ['overwork', 'sleep loss', 'eye strain'], safeBoundaries: ['No medical diagnosis', 'Encourage doctor for symptoms'] },
  { id: 3, domain: 'Mental Health, Stress', topicKeys: ['mental', 'stress', 'anxiety', 'mind', 'overthinking'], coreLogic: 'Moon and Mercury in Gemini create a very active mind. Stress rises when the mind is scattered or sleep is weak; routine and grounding help.', mustUseAnchors: ['Moon in Gemini 11th', 'Mercury in Gemini 11th', 'Rahu in Cancer 12th'], risks: ['overthinking', 'sleep disturbance', 'mental overload'], safeBoundaries: ['No diagnosis', 'No fear language'] },
  { id: 4, domain: 'Education, Study, Knowledge', topicKeys: ['education','study','exam','course','college','research'], coreLogic: 'Mercury in Gemini with Moon in the 11th supports learning, communication and research, but the chart needs structure to avoid boredom.', mustUseAnchors: ['Mercury in Gemini 11th', 'Moon in Gemini 11th', 'Mrigasira pada 4'], risks: ['boredom', 'inconsistency', 'too many interests'], safeBoundaries: ['No exam guarantees'] },
  { id: 5, domain: 'Career, Work, Profession', topicKeys: ['career','job','work','promotion','boss','authority','profession','office','business','naukri','kaam','কাজ'], coreLogic: 'Sun in Taurus in the 10th supports visibility, authority and public credibility. Moon and Mercury in the 11th support gains through networks and communication. Jupiter Mahadasha favors growth through guidance and reputation.', mustUseAnchors: ['Sun in Taurus 10th', 'Moon in Gemini 11th', 'Mercury in Gemini 11th', 'Jupiter Mahadasha'], risks: ['pride reactions', 'over-analysis', 'inconsistent execution'], safeBoundaries: ['No guaranteed promotion date', 'Use tendency language'] },
  { id: 6, domain: 'Business, Contracts, Legal', topicKeys: ['business','contract','agreement','partner','partnership','legal','court','case','lawsuit','dispute'], coreLogic: 'Mercury and the 11th-house pattern help deal-making and network-based work, while Ketu in the 6th and Saturn/Jupiter in the 9th call for caution and documentation.', mustUseAnchors: ['Mercury in Gemini 11th', 'Ketu in Capricorn 6th', 'Jupiter in Aries 9th'], risks: ['vague agreements', 'trusting too fast', 'unforced conflict'], safeBoundaries: ['No legal certainty', 'No court outcome guarantee'] },
  { id: 7, domain: 'Money, Income, Wealth', topicKeys: ['money','finance','income','salary','wealth','debt','loan','investment','profit','loss','paisa','টাকা'], coreLogic: 'Moon and Mercury in the 11th support gains and income flow. Venus and Rahu in the 12th can create expense swings, so finance advice should focus on discipline.', mustUseAnchors: ['Moon in Gemini 11th', 'Mercury in Gemini 11th', 'Venus in Cancer 12th', 'Rahu in Cancer 12th'], risks: ['overspending', 'speculation', 'wishful thinking'], safeBoundaries: ['No wealth guarantee', 'No investment advice as certainty'] },
  { id: 8, domain: 'Love, Dating, Romance', topicKeys: ['love','dating','romance','crush','relationship','ex','girlfriend','boyfriend'], coreLogic: 'Venus in the 12th makes love private, longing-based and sometimes idealized. Moon/Mercury in the 11th adds social contact and conversation.', mustUseAnchors: ['Venus in Cancer 12th', 'Moon in Gemini 11th', 'Mercury in Gemini 11th'], risks: ['idealization', 'privacy issues', 'mixed signals'], safeBoundaries: ['No exact reunion promise'] },
  { id: 9, domain: 'Marriage, Partnership', topicKeys: ['marriage','married','shaadi','shadi','spouse','husband','wife','wedding','proposal','rishta'], coreLogic: 'Marriage should be read as readiness, timing and conduct. Venus 12th can support intimacy but also secrecy or over-indulgence; the report does not emphasize a permanent affliction pattern.', mustUseAnchors: ['Venus in Cancer 12th', 'Leo Lagna', 'Jupiter Mahadasha'], risks: ['suspicion', 'privacy imbalance', 'delay anxiety'], safeBoundaries: ['No exact marriage date', 'No guarantee claim'] },
  { id: 10, domain: 'Family, Parents, Siblings', topicKeys: ['family','parents','mother','father','sibling','brother','sister','home','ghar','child'], coreLogic: 'Mars in the 3rd can make siblings and communication more direct. Jupiter and Saturn in the 9th highlight father, guidance and family values.', mustUseAnchors: ['Mars in Libra 3rd', 'Jupiter in Aries 9th', 'Saturn in Aries 9th'], risks: ['argumentative tone', 'family pressure', 'distance'], safeBoundaries: ['No fixed family outcome'] },
  { id: 11, domain: 'Children, Parenting', topicKeys: ['children','child','kids','parenting','fertility','pregnancy'], coreLogic: 'Jupiter and the 5th-house pattern are supportive of children and teaching-like parenting themes, but exact counts and medical fertility claims are not appropriate.', mustUseAnchors: ['Jupiter in Aries 9th', 'Jupiter Mahadasha', '2026-2027 Varshaphal'], risks: ['overthinking', 'pressure', 'false certainty'], safeBoundaries: ['No exact number of children', 'No fertility diagnosis'] },
  { id: 12, domain: 'Friends, Networks, Community', topicKeys: ['friends','network','community','audience','social','followers','contacts'], coreLogic: 'Moon and Mercury in the 11th make networks, audiences and gains through communication a strong theme. Trust should be selective because Mrigasira can be curious yet uneven with trust.', mustUseAnchors: ['Moon in Gemini 11th', 'Mercury in Gemini 11th', 'Mrigasira pada 4'], risks: ['over-trusting', 'too many contacts', 'social fatigue'], safeBoundaries: ['No popularity guarantee'] },
  { id: 13, domain: 'Home, Property, Vehicles', topicKeys: ['home','property','vehicle','car','house','flat','apartment','domestic'], coreLogic: 'The 4th-house matters are influenced by Mars in the 3rd and Venus/Rahu in the 12th, so movement and expense can affect domestic comfort.', mustUseAnchors: ['Mars in Libra 3rd', 'Venus in Cancer 12th', 'Rahu in Cancer 12th'], risks: ['quick purchase', 'expense spikes', 'restlessness'], safeBoundaries: ['No property certainty'] },
  { id: 14, domain: 'Relocation, Foreign Travel', topicKeys: ['foreign','abroad','relocation','travel','move','visa','immigration'], coreLogic: 'Rahu and Venus in the 12th plus Jupiter in the 9th support foreign links and long-distance movement, but the reading should still weigh cost and adjustment.', mustUseAnchors: ['Rahu in Cancer 12th', 'Venus in Cancer 12th', 'Jupiter in Aries 9th'], risks: ['expense', 'emotional strain', 'unclear paperwork'], safeBoundaries: ['No visa guarantee'] },
  { id: 15, domain: 'Spirituality, Dharma', topicKeys: ['spirituality','spiritual','guru','dharma','religion','meditation','mantra','charity'], coreLogic: 'Jupiter and Saturn in the 9th make dharma, teaching and disciplined belief important. Keep the advice grounded, not dramatic.', mustUseAnchors: ['Jupiter in Aries 9th', 'Saturn in Aries 9th', 'Jupiter Mahadasha'], risks: ['dogmatism', 'fear-based ritualism'], safeBoundaries: ['No miracle claims'] },
  { id: 16, domain: 'Reputation, Public Authority', topicKeys: ['reputation','public','authority','fame','famous','politics','leader','recognition'], coreLogic: 'Sun in the 10th and Moon/Mercury in the 11th support public visibility, voice and influence. The reading should focus on credibility built over time.', mustUseAnchors: ['Sun in Taurus 10th', 'Moon in Gemini 11th', 'Mercury in Gemini 11th'], risks: ['ego', 'controversy', 'overexposure'], safeBoundaries: ['No fame guarantee'] },
  { id: 17, domain: 'Law, Conflict, Competitors', topicKeys: ['law','court','case','competitor','enemy','dispute','conflict','legal'], coreLogic: 'Ketu in the 6th can help defeat competition, but this is not a promise about legal outcome. Advice should focus on evidence, documentation and calm strategy.', mustUseAnchors: ['Ketu in Capricorn 6th', 'Mars in Libra 3rd', 'Jupiter in Aries 9th'], risks: ['impulsiveness', 'escalation', 'overconfidence'], safeBoundaries: ['No court guarantee', 'No defeat guarantee'] },
  { id: 18, domain: 'Hidden Matters, Losses', topicKeys: ['hidden','loss','secret','expense','isolation','sleep','private'], coreLogic: 'Venus and Rahu in the 12th create hidden expenditure, private longing and sleep-related sensitivity. The answer should be careful and concrete.', mustUseAnchors: ['Venus in Cancer 12th', 'Rahu in Cancer 12th', 'Ketu in Capricorn 6th'], risks: ['leakage', 'secrecy', 'escapism'], safeBoundaries: ['No paranoia'] },
  { id: 19, domain: 'Travel, Movement', topicKeys: ['travel','movement','journey','trip','commute','explore'], coreLogic: 'Mrigasira is exploratory and Jupiter 9th supports journeys, but Rahu/Venus 12th can make travel costly or emotionally loaded.', mustUseAnchors: ['Mrigasira pada 4', 'Jupiter in Aries 9th', 'Rahu in Cancer 12th'], risks: ['expense', 'impulsiveness', 'fatigue'], safeBoundaries: ['No trip guarantee'] },
  { id: 20, domain: 'Creativity, Writing, Media', topicKeys: ['writing','media','content','creative','creative work','publish','speech','poetry'], coreLogic: 'Moon and Mercury in Gemini strongly support speech, writing, content and audience-facing work. The style should be specific and practical.', mustUseAnchors: ['Moon in Gemini 11th', 'Mercury in Gemini 11th', 'Mrigasira pada 4'], risks: ['too many ideas', 'inconsistent output'], safeBoundaries: ['No virality guarantee'] },
  { id: 21, domain: 'Daily Habits, Lifestyle', topicKeys: ['habit','routine','lifestyle','daily','sleep cycle','schedule','discipline'], coreLogic: 'The chart needs routines that steady a quick mind and protect sleep. Practical habit advice is more useful than metaphysical generality.', mustUseAnchors: ['Rahu in Cancer 12th', 'Moon in Gemini 11th', 'Leo Lagna'], risks: ['irregular sleep', 'overwork', 'scatter'], safeBoundaries: ['No one-size-fits-all habit promise'] },
  { id: 22, domain: 'Decision-making, Risk', topicKeys: ['decision','risk','choose','should i','should i do','quickly','wait'], coreLogic: 'Jupiter in the 9th supports judgment and ethics while Leo Lagna can react from pride. The answer should compare options rather than force certainty.', mustUseAnchors: ['Jupiter in Aries 9th', 'Leo Lagna', 'Mercury in Gemini 11th'], risks: ['impulse', 'pride', 'analysis paralysis'], safeBoundaries: ['No guaranteed best choice'] },
  { id: 23, domain: 'Service, Charity, Ethics', topicKeys: ['service','charity','ethics','help','volunteer','kindness'], coreLogic: 'Jupiter 9th and Ketu 6th are useful for service, humility and helping behavior, but the answer must stay grounded and non-preachy.', mustUseAnchors: ['Jupiter in Aries 9th', 'Ketu in Capricorn 6th', 'Jupiter Mahadasha'], risks: ['moral grandstanding', 'self-neglect'], safeBoundaries: ['No spiritual superiority claims'] },
  { id: 24, domain: 'Aging, Life Phases', topicKeys: ['aging','age','life phase','after 32','after 35','future self'], coreLogic: 'Jupiter Mahadasha runs to 2034, so the long arc matters more than one day. The chart becomes steadier when experience is paired with discipline.', mustUseAnchors: ['Jupiter Mahadasha', 'currentTransition', 'varshaphal2026'], risks: ['premature conclusions', 'fixed fate thinking'], safeBoundaries: ['No lifespan claim'] },
  { id: 25, domain: '2026-2027 Specific Timing', topicKeys: ['2026','2027','varshaphal','tomorrow','today','date','when','timing','month','november','october','april'], coreLogic: 'Timing answers should reference dasha and annual windows. The 2026-2027 Varshaphal is mixed: some career momentum, some caution windows, and later support from Venus/Sun/Moon style subperiods.', mustUseAnchors: ['Jupiter Mahadasha', 'Jupiter-Ketu/Jupiter-Venus 2026 transition', '2026-2027 Varshaphal'], risks: ['false certainty', 'date guarantee', 'generic monthly blocks'], safeBoundaries: ['No exact guaranteed event', 'Explain as tendency'] },
  { id: 26, domain: 'Astrology Accuracy, Ethics, Method Limits', topicKeys: ['accuracy','ethics','limit','certainty','totally accurate','diagnose','guarantee','method'], coreLogic: 'Chart facts can be exact if the data is right, but predictions are tendencies. The answer should be explicit about uncertainty, safety and ethical limits.', mustUseAnchors: ['birth data', 'Leo Lagna', 'Jupiter Mahadasha'], risks: ['overclaiming', 'fatalism', 'method confusion'], safeBoundaries: ['No certainty claims about health, law or death'] },
]

export const CHART_DOMAIN_PROFILES = DOMAIN_PROFILES

export function getChartDomainProfiles() {
  return CHART_DOMAIN_PROFILES
}

export function getChartProfileForTopic(topic: string) {
  const lower = topic.toLowerCase()
  return CHART_DOMAIN_PROFILES.find((profile) =>
    profile.topicKeys.some((key) => lower.includes(key.toLowerCase())),
  )
}

