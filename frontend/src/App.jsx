import { useState, useEffect } from 'react'
import styled from 'styled-components'
import axios from 'axios'
import './App.css'

// mock data — remove when API is live
const mockChampions = ['Hecarim','Vi','Graves','Viego','Nidalee','Kindred',"Kha'Zix",'Elise','Rek\'Sai','Warwick','Amumu','Jarvan IV','Lee Sin','Diana']
const mockDates = ['2026-05-14','2026-05-15','2026-05-16','2026-05-17','2026-05-18','2026-05-19','2026-05-20','2026-05-21','2026-05-22','2026-05-23','2026-05-24','2026-05-25','2026-05-26','2026-05-27','2026-05-28','2026-05-29','2026-05-30','2026-05-31','2026-06-01','2026-06-02']
function seededRandInt(seed,a,b){let x=Math.sin(seed)*10000;x=x-Math.floor(x);return Math.floor(x*(b-a+1))+a}
function seededPick(seed,arr){return arr[seededRandInt(seed,0,arr.length-1)]}
function calcEarlyTempo(gd,xd,cd,kad){return (0.35*(gd/800))+(0.3*(xd/750))+(0.2*(cd/15))+(0.15*(kad/3))}
const mockNotesPool = [
  'Lost tempo trying to contest scuttle at level 3.',
  'Ganked mid twice but lane was already pushed — wasted time.',
  'Good dragon steal secured two consecutive objectives.',
  'Over-committed to a losing skirmish near Baron.',
  'First item timing was on point — dictated early jungle pressure.',
  'Pathed inefficiently; fell 600 gold behind by 10 minutes.',
  'Converted Herald into two plates — strong macro game.',
  'Poor ward placement left enemy jungler free to counter-jungle.',
  'Calm and focused throughout — made the right concession plays.',
  'Tilt spiral after two early deaths led to overforced plays.',
]
const gpOpts = ['Good','Okay','Bad']
const mmOpts = ['Positioning','Late Reset','Emotional Play','Farm Path Error','Objective Fumble']
const mtOpts = ['Calm','Frustrated','Tilted']
const frOpts = ['Good','Okay','Bad']

// each tier = 4 divisions × 100 LP; Gold starts at abs 1200, Platinum at 1600
const TIER_ORDER = ['Iron','Bronze','Silver','Gold','Platinum','Emerald','Diamond']
const DIVS = ['IV','III','II','I']

function absoluteToRankLabel(abs) {
  const tier = Math.floor(abs / 400)
  const lpInTier = abs % 400
  const div = Math.floor(lpInTier / 100)
  const lp = lpInTier % 100
  return {
    rank: `${TIER_ORDER[Math.min(tier, TIER_ORDER.length - 1)]} ${DIVS[Math.min(div, 3)]}`,
    lp,
  }
}

const MOCK_STATS = (() => {
  let absLp = 1620 // Platinum IV ~20 LP — straddles the Gold/Plat border
  return Array.from({ length: 20 }, (_, i) => {
    const s = i * 7 + 13
    const result = seededRandInt(s + 1, 0, 9) > 4 ? 'Win' : 'Loss'
    const swing = result === 'Win' ? seededRandInt(s + 21, 18, 21) : -seededRandInt(s + 21, 18, 21)
    absLp = Math.max(1200, Math.min(1999, absLp + swing))
    const { rank, lp } = absoluteToRankLabel(absLp)

    const kills   = seededRandInt(s + 2, 1, 10), deaths = seededRandInt(s + 3, 1, 8), assists = seededRandInt(s + 4, 3, 16)
    const teamKills = kills + seededRandInt(s + 5, 4, 16)
    const kp = (kills + assists) / Math.max(teamKills, 1)
    const gold10 = seededRandInt(s + 6, 3100, 4400), enemyGold10 = seededRandInt(s + 7, 3000, 4300)
    const xp10   = seededRandInt(s + 8, 3800, 5100), enemyXp10   = seededRandInt(s + 9, 3700, 5000)
    const cs10   = seededRandInt(s + 10, 38, 72),    enemyCs10   = seededRandInt(s + 11, 36, 70)
    const ka10   = seededRandInt(s + 12, 1, 6),      enemyKa10   = seededRandInt(s + 13, 1, 6)
    const cs = seededRandInt(s + 14, 140, 260), vision = seededRandInt(s + 15, 18, 52), dmg = seededRandInt(s + 16, 14000, 38000)
    const totalMins = seededRandInt(s + 17, 22, 47), secs = seededRandInt(s + 18, 0, 59)
    const gd = gold10 - enemyGold10, xd = xp10 - enemyXp10, cd = cs10 - enemyCs10, kad = ka10 - enemyKa10

    return {
      match: i + 1, date: mockDates[i], patch: i < 10 ? '26.10' : '26.11', rank,
      lp, lp_change: swing, champion: seededPick(s + 23, mockChampions),
      result, length: `${totalMins}:${String(secs).padStart(2, '0')}`,
      team_kills: teamKills, kills, deaths, assists, cs,
      damage_dealt: dmg, vision_score: vision, kill_participation: kp,
      obj_secured: seededRandInt(s + 24, 0, 7),
      first_item_timing: `${seededRandInt(s + 25, 9, 17)}:${String(seededRandInt(s + 26, 0, 59)).padStart(2, '0')}`,
      gold_delta_10: gd, xp_delta_10: xd, cs_delta_10: cd, ka_delta_10: kad,
      early_tempo: calcEarlyTempo(gd, xd, cd, kad),
      cs_per_min: (cs / totalMins).toFixed(2),
      vision_per_min: (vision / totalMins).toFixed(2),
      damage_per_min: Math.floor(dmg / totalMins),
      gold_10: gold10, enemy_gold_10: enemyGold10,
      xp_10: xp10, enemy_xp_10: enemyXp10,
      cs_10: cs10, enemy_cs_10: enemyCs10,
      ka_10: ka10, enemy_ka_10: enemyKa10,
      gameplan_adherence: seededPick(s + 27, gpOpts),
      major_mistake: seededPick(s + 28, mmOpts),
      mental: seededPick(s + 29, mtOpts),
      focus_rating: seededPick(s + 30, frOpts),
      notes: mockNotesPool[seededRandInt(s + 31, 0, mockNotesPool.length - 1)],
    }
  })
})()

const MOCK_FOCUS_CYCLES = [
  { startdate:'2026-04-26', focus:'Reduce Deaths',    description:'Die fewer than 5 times per game on average. Prioritize safe pathing over contested objectives when behind.' },
  { startdate:'2026-05-10', focus:'First Item Timing',description:'Complete first item before 13:00 in every game. Improve clear efficiency and skip unnecessary early ganks.' },
  { startdate:'2026-05-24', focus:'Objective Control',description:'Secure at least 3 objectives (Dragon/Herald/Baron) per game. Pre-stack camps near objectives before timers.' },
  { startdate:'2026-06-07', focus:'— Not Set —',      description:'Current cycle — improvement focus not yet selected.' },
]
const MOCK_FOCUS_STATS = [
  { concept:'Reduce Deaths',     winRate:'54%', veryGood:'22%', good:'35%', okay:'28%', bad:'15%' },
  { concept:'First Item Timing', winRate:'61%', veryGood:'30%', good:'38%', okay:'22%', bad:'10%' },
  { concept:'Objective Control', winRate:'58%', veryGood:'25%', good:'40%', okay:'25%', bad:'10%' },
  { concept:'— Not Set —',       winRate:'44%', veryGood:'12%', good:'22%', okay:'28%', bad:'38%' },
]

/* tour step definitions */
const TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome — Reviewer Guide',
    text: "Hi! This is an interactive walkthrough of the Jungle Improvement Log. It'll take you through every feature automatically — including rendered mock data. Use Next / Back to navigate, or click anywhere outside the bubble to exit.",
    anchor: null, side: 'center', tab: null,
  },
  {
    id: 'search-btn',
    title: 'Search Summoner',
    text: "Searches a summoner's past 20 ranked matches via Riot's Match-v5 API and loads them into the log. This is a personal tool — intended for the developer's own account or a small private group. No real API call is made in this mockup.",
    anchor: '[data-tour="search-summoner-btn"]', side: 'below-center', tab: null,
  },
  {
    id: 'auth-btn',
    title: 'Sign Up / Log In',
    text: "Intended for personal use — the developer's own account or a small private group, consistent with a personal API key. An account unlocks stored match history and the ability to save Review notes between sessions. Authentication is not currently functional — this is a mockup only.",
    anchor: '[data-tour="auth-btn"]', side: 'below-center', tab: null,
  },
  {
    id: 'do-search',
    title: 'Searching now…',
    text: "Loading mock match data for 'JungleMain#NA1' — this simulates what happens when a summoner is searched. Planned functionality for this is to call Riot's API and return the past 20 matches.",
    anchor: '[data-tour="search-summoner-btn"]', side: 'below-center', tab: null,
  },
  {
    id: 'header-stats',
    title: 'Summoner & rank header',
    text: 'After a search, this bar shows the Riot ID, region, current rank, LP, and the active bi-weekly improvement focus with a days-remaining countdown. It stays hidden until a summoner is loaded.',
    anchor: '[data-tour="header-stats"]', side: 'below-center', tab: null,
  },
  {
    id: 'update-btn',
    title: 'Update Match History',
    text: "Fetches and appends any new matches played since the last update. Disabled for guest searches — only signed-in users with stored match history can use this. Guests would need to re-search from scratch to refresh their data.",
    anchor: '[data-tour="update-btn"]', side: 'below-right', tab: null,
  },
  {
    id: 'density',
    title: 'Density control',
    text: 'Compact / Default / Cozy adjusts row padding and font size across all tabs simultaneously — useful for fitting more games on screen or improving readability.',
    anchor: '[data-tour="density-toggle"]', side: 'below-right', tab: null,
  },
  {
    id: 'tab-overview',
    title: 'Overview tab',
    text: 'A high-level match log: date, patch, rank, LP change, champion, win/loss, and game length. Win rows are tinted green, losses red. Rank cells reflect their tier color.',
    anchor: '[data-tour="tab-Overview"]', side: 'below-center', tab: 'Overview',
  },
  {
    id: 'tab-details',
    title: 'Details tab',
    text: 'Per-match combat stats: KDA, team kill count, CS, damage dealt, vision score, kill participation %, objectives secured, first item timing, and the Early Tempo score.',
    anchor: '[data-tour="tab-Details"]', side: 'below-center', tab: 'Details',
  },
  {
    id: 'early-tempo',
    title: 'Early Tempo score',
    text: 'A composite 10-min lead/deficit score: (0.35 × Gold Δ/800) + (0.3 × XP Δ/750) + (0.2 × CS Δ/15) + (0.15 × K+A Δ/3). Positive = ahead at 10 min. Color-coded cyan → green → yellow → red. This is one custom metric in a series of metrics that are planned for development to highlight fundamental aspects of gameplay, signaling strengths, weaknesses, and improvement priorities.',
    anchor: '[data-tour="col-early-tempo"]', side: 'below-center', tab: 'Details',
  },
  {
    id: 'tab-metrics',
    title: 'Metrics tab',
    text: 'Rate and differential metrics: CS/min, Vision/min, Damage/min, and 10-min gold, XP, CS, and K+A deltas vs the enemy jungler. Positive deltas green, negative red.',
    anchor: '[data-tour="tab-Metrics"]', side: 'below-center', tab: 'Metrics',
  },
  {
    id: 'tab-tempo',
    title: 'Tempo tab',
    text: 'Raw 10-minute snapshot values side by side — player vs enemy jungler — for Gold, XP, CS, and K+A. These are the direct inputs to the Early Tempo formula.',
    anchor: '[data-tour="tab-Tempo"]', side: 'below-center', tab: 'Tempo',
  },
  {
    id: 'tab-review',
    title: 'Review tab',
    text: 'Per-game review: Gameplan Adherence, Major Mistake, Mental State, Focus Rating, and free-text notes — all logged via color-coded dropdowns. Entries are tied to a user account, so guests who have not signed up cannot save anything here.',
    anchor: '[data-tour="tab-Review"]', side: 'below-center', tab: 'Review',
  },
  {
    id: 'tab-weekly',
    title: 'Weekly Summary tab',
    text: 'KPI cards color-coded against benchmarks, plus a per-week table covering games played, win rate, average deaths, objectives, good/bad tempo rates, tilt frequency, and LP progression.',
    anchor: '[data-tour="tab-Weekly Summary"]', side: 'below-center', tab: 'Weekly Summary',
  },
  {
    id: 'tab-focus',
    title: 'Focus Cycles tab',
    text: 'Every two weeks the player sets one improvement focus (e.g. "Reduce Deaths"). The stats table measures win rate and focus-rating distribution per concept — making it quantifiable whether the focus is helping.',
    anchor: '[data-tour="tab-Focus Cycles"]', side: 'below-center', tab: 'Focus Cycles',
  },
  {
    id: 'api-note',
    title: 'How the API would be used',
    text: "All API calls would happen server-side — the key would never be exposed to the frontend. Endpoint usage: riot/account/v1 (summoner lookup), lol/summoner/v4 (summoner data), lol/league/v4 (current rank), lol/match/v5/matches (match data + timeline). Note: Riot's API does not expose per-game LP history, so the LP column is manually tracked. All metric calculations are computed server-side before the frontend receives any data.",
    anchor: null, side: 'center', tab: null,
  },
]

const DENSITY = {
  compact: {
    rowPadding: '4px 8px',
    fontSize: '0.75rem',
    inputPadding: '0.3rem 0.6rem',
    inputFontSize: '0.75rem',
    cardHeaderFontSize: '14px',
    cardPadding: '0px',
    cardWidth: '280px',
    cardFontSize: '1rem',
    kpiFontSize: '0.65rem',
    improvementSelectPadding: '0.25rem 0.25rem',
  },
  default: {
    rowPadding: '8px 12px',
    fontSize: '0.85rem',
    inputPadding: '0.45rem 0.8rem',
    inputFontSize: '0.82rem',
    cardHeaderFontSize: '16px',
    cardPadding: '2px',
    cardWidth: '300px',
    cardFontSize: '1.25rem',
    kpiFontSize: '0.75rem',
    improvementSelectPadding: '0.5rem 0.5rem',
  },
  comfortable: {
    rowPadding: '14px 16px',
    fontSize: '0.95rem',
    inputPadding: '0.65rem 1rem',
    inputFontSize: '0.9rem',
    cardHeaderFontSize: '20px',
    cardPadding: '10px',
    cardWidth: '340px',
    cardFontSize: '1.5rem',
    kpiFontSize: '1rem',
    improvementSelectPadding: '0.75rem 0.75rem',
  },
}

const RANKS = {
  Iron:        { r: '97, 102, 106' , rt: '148, 137, 125' },
  Bronze:      { r: '165, 90, 40'  , rt: '220, 150, 95'  },
  Silver:      { r: '120, 128, 145', rt: '180, 188, 205' },
  Gold:        { r: '195, 158, 28' , rt: '230, 195, 80'  },
  Platinum:    { r: '22, 138, 148' , rt: '60, 190, 200'  },
  Emerald:     { r: '44, 155, 60'  , rt: '90, 200, 105'  },
  Diamond:     { r: '45, 100, 185' , rt: '100, 155, 230' },
  Master:      { r: '140, 55, 195' , rt: '190, 110, 240' },
  Grandmaster: { r: '185, 55, 55'  , rt: '235, 110, 110' },
  Challenger:  { r: '246, 230, 142', rt: '246, 230, 142' },
}

const GlobalLayout = styled.div`
  --header-h: 56px;
  --tabbar-h: 48px;
  --section-top: calc(var(--header-h) + var(--tabbar-h) + 8px);
  --table-body-max: calc(100vh - var(--section-top) - 6rem);
`

const Container = styled.div`
  position: relative;
  min-height: 100vh;
  width: 100vw;
  box-sizing: border-box;
  margin: 0;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
  padding: 1.5rem 1rem;
  overflow: hidden;
  background:
    radial-gradient(ellipse 60% 40% at 50% 30%, rgba(242, 201, 107, 0.07) 0%, transparent 70%),
    radial-gradient(circle at top, rgba(255, 70, 70, 0.14), transparent 38%),
    linear-gradient(180deg, #1b0f0e 0%, #221312 45%, #181818 100%);
  color: #f8fafc;
`

/* Header: three-column grid keeps center stats viewport-centered */
const Header = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: var(--header-h);
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 0 16px;
  background: rgba(28, 11, 10, 0.92);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(18px);
  box-sizing: border-box;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.45s ease;
  z-index: 20;
  overflow: hidden;

  ${(p) => p.$searched && `
    opacity: 1;
    pointer-events: auto;
  `}
`

/* Left zone: brand + update button */
const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: flex-start;
`

/* Center zone: all the stat pills */
const HeaderCenter = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
  min-width: 0;
  overflow: hidden;

  @media (max-width: 900px) {
    .hide-narrow { display: none; }
  }
`

/* Right zone: density + auth */
const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: flex-end;
`

const HeaderBrand = styled.div`
  font-family: 'Josefin Sans', sans-serif;
  font-weight: 700;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: linear-gradient(135deg, #f2c96b 0%, #f07a5b 45%, #9fc7c7 100%);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: titleShimmer 8s ease-in-out infinite;
  flex-shrink: 0;
  white-space: nowrap;
`

const HeaderDivider = styled.div`
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
`

const HeaderStat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex-shrink: 0;
`

const HeaderStatVal = styled.span`
  font-size: 0.75rem;
  font-weight: 700;
  color: #f2c96b;
  white-space: nowrap;
`

const HeaderStatLbl = styled.span`
  font-size: 0.6rem;
  color: rgba(248, 250, 252, 0.32);
  letter-spacing: 0.07em;
  text-transform: uppercase;
  white-space: nowrap;
`

const ImprovementFocusCD = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(242,201,107,0.07);
  border: 1px solid rgba(242,201,107,0.18);
  border-radius: 999px;
  padding: 3px 10px 3px 8px;
  flex-shrink: 0;
  white-space: nowrap;
`

const Legend = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;

  @media (max-width: 1200px) { display: none; }
`

const TabBar = styled.nav`
  position: fixed;
  top: var(--header-h);
  left: 0;
  width: 100%;
  height: var(--tabbar-h);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 20px;
  box-sizing: border-box;
  background: rgba(28, 11, 10, 0.88);
  border-bottom: 1px solid rgba(248, 149, 56, 0.18);
  box-shadow: 0 4px 24px rgba(248, 100, 0, 0.10);
  backdrop-filter: blur(18px);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.55s ease 0.1s;
  z-index: 19;

  ${(p) => p.$searched && `
    opacity: 1;
    pointer-events: auto;
  `}
`

const TabLinks = styled.div`
  display: flex;
  align-items: center;
  gap: clamp(0.6rem, 1.4vw, 1.6rem);
  white-space: nowrap;
  flex: 1 1 auto;
  justify-content: center;
  padding-left: 0;

  a {
    color: rgba(248, 250, 252, 0.6);
    font-size: clamp(0.72rem, 1vw, 0.95rem);
    text-decoration: none;
    white-space: nowrap;
    transition: color 0.25s ease, transform 180ms ease, padding 180ms ease;
  }

  a:hover { color: #ffffff; }

  a[data-active="true"] {
    position: relative;
    background: linear-gradient(135deg, #f2c96b 0%, #f07a5b 45%, #9fc7c7 100%);
    background-size: 200% 200%;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    -webkit-text-fill-color: transparent;
    animation: gradientMove 5s ease-in-out infinite;
    display: inline-flex;
    align-items: center;
    padding: 0.28rem 0.72rem;
    border-radius: 999px;
    font-weight: 700;
    transform: translateY(-1px) scale(1.01);
    box-shadow:
      0 0 0 1.5px rgba(248, 149, 56, 0.45),
      0 0 8px rgba(248, 100, 0, 0.18);

    &::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 999px;
      background: rgba(248, 149, 56, 0.10);
      pointer-events: none;
    }
    z-index: 30;
  }

  @keyframes gradientMove {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
`

const DensityToggle = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  padding: 3px;
  flex-shrink: 0;
`

const DensityBtn = styled.button`
  border: none;
  border-radius: 999px;
  cursor: pointer;
  padding: 3px 8px;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  transition: background 0.2s ease, color 0.2s ease;
  background: ${(p) => p.$active ? 'rgba(248, 149, 56, 0.22)' : 'transparent'};
  color: ${(p) => p.$active ? '#f2c96b' : 'rgba(248, 250, 252, 0.45)'};
  border: 1px solid ${(p) => p.$active ? 'rgba(248, 149, 56, 0.35)' : 'transparent'};
  white-space: nowrap;

  &:hover { color: rgba(248, 250, 252, 0.8); }
`

const Banner = styled.section`
  position: absolute;
  top: 50%;
  left: 50%;
  width: min(980px, calc(100% - 2rem));
  padding: clamp(2rem, 3vw, 4rem) clamp(1.25rem, 4vw, 2rem);
  box-sizing: border-box;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  transform: translate(-50%, -50%);
  transition: transform 0.85s ease, opacity 0.45s ease;

  ${(p) => p.$searched && `
    transform: translate(-50%, -120vh);
    opacity: 0;
    pointer-events: none;
  `}
`

const HeaderAuth = styled.button`
  border: 1px solid rgba(159, 199, 199, 0.35);
  cursor: pointer;
  outline: none;
  padding: 0.45rem 1rem;
  border-radius: 999px;
  font-size: 0.86rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: rgba(159, 199, 199, 0.95);
  background: rgba(159, 199, 199, 0.06);
  flex-shrink: 0;
  &:hover { background: rgba(159,199,199,0.12); }
`

const BannerEyebrow = styled.p`
  margin: 0;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(248, 149, 56, 0.75);
  display: flex;
  align-items: center;
  gap: 0.6rem;

  &::before, &::after {
    content: '';
    display: inline-block;
    width: 28px;
    height: 1px;
    background: rgba(248, 149, 56, 0.4);
  }
`

const BannerTitle = styled.h1`
  margin: 0;
  font-size: clamp(2.8rem, 5vw, 5.2rem);
  line-height: 1.02;
  letter-spacing: -0.05em;
  max-width: 900px;
  font-family: 'Josefin Sans', sans-serif;
  background: linear-gradient(135deg, #f2c96b 0%, #f07a5b 45%, #9fc7c7 100%);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: titleShimmer 8s ease-in-out infinite;

  @keyframes titleShimmer {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  span { display: block; }

  @media (max-width: 640px) {
    font-size: clamp(2.2rem, 9vw, 3.2rem);
    letter-spacing: -0.03em;
  }
`

const BannerTagline = styled.p`
  margin: 0;
  font-size: clamp(0.95rem, 1.5vw, 1.1rem);
  color: rgba(248, 250, 252, 0.5);
  max-width: 440px;
  line-height: 1.6;
  letter-spacing: 0.01em;
`

const BannerDivider = styled.div`
  width: 48px;
  height: 2px;
  border-radius: 99px;
  background: linear-gradient(90deg, #f2c96b, #f07a5b);
  opacity: 0.6;
`

const ActionButton = styled.button`
  border: 1px solid rgba(248, 149, 56, 0.35);
  cursor: pointer;
  outline: none;
  padding: 0.9rem 2.4rem;
  border-radius: 999px;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #fef3e2;
  background: rgba(248, 149, 56, 0.12);
  backdrop-filter: blur(10px);
  transition: transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease, border-color 0.25s ease;
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 999px;
    background: linear-gradient(135deg, rgba(242,201,107,0.18), rgba(240,122,91,0.18));
    opacity: 0;
    transition: opacity 0.25s ease;
  }

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(248, 149, 56, 0.65);
    box-shadow: 0 0 28px rgba(248, 149, 56, 0.28), 0 8px 32px rgba(0,0,0,0.3);
    background: rgba(248, 149, 56, 0.18);
  }

  &:hover::after { opacity: 1; }
  &:active { transform: translateY(0); }
`

const BannerButtonRow = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
`

const AuthButton = styled.button`
  border: 1px solid rgba(159, 199, 199, 0.35);
  cursor: pointer;
  outline: none;
  padding: 0.9rem 2.4rem;
  border-radius: 999px;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: rgba(159, 199, 199, 0.9);
  background: rgba(159, 199, 199, 0.08);
  backdrop-filter: blur(10px);
  transition: transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease, border-color 0.25s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(159, 199, 199, 0.6);
    box-shadow: 0 0 24px rgba(159, 199, 199, 0.2), 0 8px 32px rgba(0,0,0,0.3);
    background: rgba(159, 199, 199, 0.14);
  }
  &:active { transform: translateY(0); }
`

const UpdateBtn = styled.button`
  border: 1px solid rgba(248, 149, 56, 0.2);
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  background: transparent;
  color: #f2c96b;
  background: rgba(248, 149, 56, 0.06);
  cursor: not-allowed;
  flex-shrink: 0;
  white-space: nowrap;
  opacity: 1;

  &:disabled {
    cursor: not-allowed;
    color: #f2c96b;
    background: rgba(248, 149, 56, 0.06);
    border-color: rgba(248, 149, 56, 0.22);
    opacity: 1;
  }
`

const FormPanel = styled.div`
  width: 100%;
  display: flex;
  gap: 1rem;
  justify-content: center;
  align-items: flex-start;
  margin-top: 0.5rem;
  opacity: ${(p) => (p.$visible ? 1 : 0)};
  transform: translateY(${(p) => (p.$visible ? '0' : '20px')});
  pointer-events: ${(p) => (p.$visible ? 'auto' : 'none')};
  transition: opacity 0.35s ease, transform 0.35s ease;
`

const CombinedForm = styled.div`
  display: flex;
  width: 100%;
  max-width: 920px;
  background: rgba(6, 8, 14, 0.7);
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 14px;
  padding: 0.5rem;
  gap: 0.5rem;
  align-items: stretch;
  box-shadow: 0 6px 30px rgba(2,6,23,0.45);
  transition: opacity 0.18s ease, transform 0.18s ease;
  opacity: ${(p) => (p.$visible ? 1 : 0)};
  transform: translateY(${(p) => (p.$visible ? '0' : '12px')});

  @media (max-width: 700px) { flex-direction: column; }
`

const Unit = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  min-width: 0;
  padding: 0.5rem;
`
const RegionUnit = styled(Unit)` flex: 0.6; `
const SearchUnit = styled(Unit)` flex: 1.4; `
const SearchButtonUnit = styled(Unit)` flex: 0.3; `

const Divider = styled.div`
  width: 1px;
  background: rgba(255,255,255,0.06);
  margin: 6px 0;
  border-radius: 1px;
  align-self: stretch;
  @media (max-width: 700px) { display: none; }
`

const StyledSelect = styled.select`
  width: 100%;
  appearance: none;
  -webkit-appearance: none;
  background: rgba(20, 26, 48, 0.8);
  color: #f8fafc;
  border: 1px solid rgba(255,255,255,0.04);
  padding: 1rem;
  border-radius: 10px;
  transition: all 0.28s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover { background: rgba(25, 32, 56, 0.9); cursor: pointer; }
  &:focus {
    outline: none;
    border-color: #f85538;
    box-shadow: 0 6px 18px rgba(56,189,248,0.08);
    transform: translateY(-1px);
    background: rgba(25, 32, 56, 0.95);
  }
`

const ReviewSelect = styled.select`
  width: 100%;
  appearance: none;
  -webkit-appearance: none;
  text-align: center;
  background: ${(p) => {
    if (p.$val === 'Good' || p.$val === 'Calm') return 'rgba(34, 197, 94, 0.8)'
    if (p.$val === 'Okay' || p.$val === 'Frustrated') return 'rgba(234, 179, 8, 0.8)'
    if (p.$val === 'Bad'  || p.$val === 'Tilted') return 'rgba(239, 68, 68, 0.8)'
    return 'rgba(20, 26, 48, 0.8)'
  }};
  color: #f8fafc;
  border: 1px solid rgba(255,255,255,0.08);
  padding: ${(p) => p.$d?.inputPadding || '0.45rem 0.8rem'};
  font-size: ${(p) => p.$d?.inputFontSize || '0.82rem'};
  border-radius: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: background 0.18s ease;

  &:hover { filter: brightness(0.85); border-color: rgba(255,255,255,0.18); }
  &:focus {
    outline: none;
    filter: brightness(0.85);
    box-shadow: 0 0 0 3px ${(p) => {
      if (p.$val === 'Good' || p.$val === 'Calm') return 'rgba(34, 197, 94, 0.35)'
      if (p.$val === 'Okay' || p.$val === 'Frustrated') return 'rgba(234, 179, 8, 0.35)'
      if (p.$val === 'Bad'  || p.$val === 'Tilted') return 'rgba(239, 68, 68, 0.35)'
      return 'rgba(248, 85, 56, 0.35)'
    }};
  }

  option { background: #1a1a2e; color: #f8fafc; }
`

const ReviewNotes = styled.div`
  width: 100%;
  .form-control {
    background: rgba(20, 26, 48, 0.8) !important;
    color: #f8fafc !important;
    border: 1px solid rgba(255,255,255,0.04) !important;
    padding: ${(p) => p.$d?.inputPadding || '0.45rem 0.8rem'} !important;
    font-size: ${(p) => p.$d?.inputFontSize || '0.82rem'} !important;
    height: auto !important;
    border-radius: 10px !important;
    transition: border-color 0.22s ease, box-shadow 0.22s ease !important;
  }
  .form-control::placeholder { color: transparent !important; }
  .form-control:focus {
    border-color: #f85538 !important;
    box-shadow: 0 6px 18px rgba(56,189,248,0.08) !important;
  }
`

const FloatingWrapper = styled.div`
  width: 100%;
  .form-control {
    background: rgba(20, 26, 48, 0.8) !important;
    color: #f8fafc !important;
    border: 1px solid rgba(255,255,255,0.04) !important;
    padding: 1rem 1rem 0.5rem !important;
    height: auto !important;
    border-radius: 10px !important;
    transition: border-color 0.22s ease, box-shadow 0.22s ease !important;
  }
  .form-control::placeholder { color: transparent !important; }
  label {
    color: rgba(248, 250, 252, 0.6) !important;
    padding: 1rem 1rem !important;
    transform-origin: left top !important;
  }
  .form-control:focus {
    border-color: #f85538 !important;
    box-shadow: 0 6px 18px rgba(56,189,248,0.08) !important;
  }
  .form-control:focus ~ label,
  .form-control:not(:placeholder-shown) ~ label {
    color: rgba(248, 250, 252, 0.9) !important;
    padding: 0.5rem 1rem !important;
  }
`

const SearchButton = styled.button`
  width: 100%;
  height: 100%;
  min-height: 44px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #eda53a, #f83852);
  color: #2a0f0f;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 20px 50px rgba(248, 149, 56, 0.32);
    background: linear-gradient(135deg, #a87221, #e90e50);
  }
  &:active {
    transform: translateY(0);
    background: linear-gradient(135deg, #a87221, #e90e50);
  }
`

const Table = styled.div`
  width: 100%;
  background: rgba(6, 8, 14, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 14px;
  padding: 0.5rem;
  box-shadow: rgba(2, 6, 23, 0.45) 0px 6px 30px;
`

const TableBodyWrapper = styled.div`
  max-height: var(--table-body-max, calc(100vh - 260px));
  overflow-y: auto;
  overflow-x: hidden;
  -ms-overflow-style: none;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`

const sharedHeaderTh = `
  padding: 0.75rem 0.5rem;
  text-align: center;
  font-weight: 700;
  color: #9fc7c7;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  font-size: 0.72rem;
  background: #210e0b;
  border-bottom: 2px solid rgba(255,255,255,0.12);
  border-right: none;
  border-left: none;
  background-clip: padding-box;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const sharedBodyTd = (d) => `
  padding: ${d?.rowPadding || '8px 12px'};
  font-size: ${d?.fontSize || '0.85rem'};
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  border-right: none;
  border-left: none;
  word-break: break-word;
  white-space: normal;
  transition: padding 0.25s ease, font-size 0.25s ease;
`

const ResultRow = styled.tr`
  border-radius: 10px;
  td:first-child {
    border-left: 3px solid ${p =>
      p.$result === 'Win' ? 'rgba(20, 180, 90, 0.6)' :
      p.$result === 'Loss' ? 'rgba(200, 50, 50, 0.6)' :
      'transparent'
    };
  }
  background: ${(p) =>
    p.$result === 'Win'  ? 'rgba(20, 120, 70, 0.18)'  :
    p.$result === 'Loss' ? 'rgba(140, 40, 40, 0.18)'  :
    'transparent'
  };
  &:hover {
    background: ${(p) =>
      p.$result === 'Win'  ? 'rgba(20, 120, 70, 0.23)'  :
      p.$result === 'Loss' ? 'rgba(140, 40, 40, 0.23)'  :
      'rgba(255,255,255,0.04)'
    } !important;
  }
`

const TAB_ORDER = ['Overview','Details','Metrics','Tempo','Review','Weekly Summary','Focus Cycles']

function slideCSS(myName, active, searched) {
  if (!searched) return 'transform: translate(-50%, 100vh);'
  if (myName === active) return 'transform: translate(-50%, 0); opacity: 1; pointer-events: auto;'
  const myIdx = TAB_ORDER.indexOf(myName)
  const activeIdx = TAB_ORDER.indexOf(active)
  if (myIdx < activeIdx) return 'transform: translate(calc(-50% - 100vw), 0);'
  return 'transform: translate(calc(-50% + 100vw), 0);'
}

const LPChange = styled.span`
  display: inline-block;
  margin-left: 0.35rem;
  color: ${p =>
    p.$lpChange > 0 ? 'rgba(114, 255, 86, 0.7)' :
    p.$lpChange < 0 ? 'rgba(253, 57, 57, 0.7)' :
    'rgba(138, 138, 138, 0.7)'
  }
`

const MatchResult = styled.span`
  font-size: ${p => p.$d?.fontSize || '0.85rem'};
  color: ${p =>
    p.$result === 'Win' ? 'rgba(114, 255, 86, 0.7)' :
    p.$result === 'Loss' ? 'rgba(253, 57, 57, 0.7)' :
    'rgba(138, 138, 138, 0.7)'
  }
`

const Rank = styled.td`
  ${p => {
    const entry = Object.entries(RANKS).find(([k]) => p.$rank.includes(k))
    if (!entry) return ''
    const { r } = entry[1]
    const { rt } = entry[1]
    return `
      border-left: 3px solid rgba(${r}, 0.6)!important;
      background: rgba(${r}, 0.40);
      color: rgba(${rt}, 1);
      font-weight: 600;
    `
  }};
`

/* Overview section */
const overviewCols = [
  { w: '8%' }, { w: '14%' }, { w: '10%' }, { w: '16%' },
  { w: '8%' }, { w: '14%' }, { w: '10%' }, { w: '10%' },
]

const Overview = styled.section`
  position: absolute;
  top: var(--section-top, 112px);
  left: 50%;
  bottom: 1rem;
  width: calc(100vw - 2rem);
  max-width: calc(100vw - 2rem);
  padding: 1.5rem clamp(0.75rem, 2vw, 2rem);
  box-sizing: border-box;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  overflow: visible;
  opacity: 0;
  pointer-events: none;
  transition: transform 0.65s ease, opacity 0.85s ease;
  ${(p) => slideCSS('Overview', p.$active, p.$searched)}
`

const OverviewTableHeader = styled.table`
  width: 100%; border-collapse: collapse; table-layout: fixed;
  border-radius: 12px 12px 0 0; overflow: hidden;
  position: sticky; top: 0; z-index: 30;
  th { ${sharedHeaderTh} }
  ${overviewCols.map((c,i) => `th:nth-child(${i+1}) { width: ${c.w}; min-width: 60px; }`).join('\n')}
  th:first-child { border-top-left-radius: 12px; }
  th:last-child  { border-top-right-radius: 12px; }
`

const OverviewBodyTable = styled.table`
  width: 100%; border-collapse: collapse; table-layout: fixed;
  td { ${(p) => sharedBodyTd(p.$d)} }
  ${overviewCols.map((c,i) => `td:nth-child(${i+1}) { width: ${c.w}; min-width: 60px; }`).join('\n')}
  tbody tr:hover { background: rgba(255,255,255,0.04); }
`

/* Details section */
const detailsCols = [
  { w: '5%' }, { w: '9%' }, { w: '9%' }, { w: '5%' }, { w: '6%' },
  { w: '6%' }, { w: '5%' }, { w: '8%' }, { w: '7%' }, { w: '9%' },
  { w: '9%' }, { w: '9%' }, { w: '8%' },
]

const Details = styled.section`
  position: absolute;
  top: var(--section-top, 112px);
  left: 50%;
  bottom: 1rem;
  width: calc(100vw - 2rem);
  max-width: calc(100vw - 2rem);
  padding: 1.5rem clamp(0.75rem, 2vw, 2rem);
  box-sizing: border-box;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  overflow: visible;
  opacity: 0;
  pointer-events: none;
  transition: transform 0.65s ease, opacity 0.85s ease;
  ${(p) => slideCSS('Details', p.$active, p.$searched)}
`

const DetailsTableHeader = styled.table`
  width: 100%; border-collapse: collapse; table-layout: fixed;
  border-radius: 12px 12px 0 0; overflow: hidden;
  position: sticky; top: 0; z-index: 30;
  th { ${sharedHeaderTh} }
  ${detailsCols.map((c,i) => `th:nth-child(${i+1}) { width: ${c.w}; min-width: 48px; }`).join('\n')}
  th:first-child { border-top-left-radius: 12px; }
  th:last-child  { border-top-right-radius: 12px; }
`

const DetailsBodyTable = styled.table`
  width: 100%; border-collapse: collapse; table-layout: fixed;
  td { ${(p) => sharedBodyTd(p.$d)} }
  ${detailsCols.map((c,i) => `td:nth-child(${i+1}) { width: ${c.w}; min-width: 48px; }`).join('\n')}
  tbody tr:hover { background: rgba(255,255,255,0.04); }
`

/* Metrics section */
const metricsCols = [
  { w: '10%' }, { w: '12%' }, { w: '10%' }, { w: '11%' }, { w: '11%' },
  { w: '11%' }, { w: '11%' }, { w: '11%' }, { w: '13%' },
]

const Metrics = styled.section`
  position: absolute;
  top: var(--section-top, 112px);
  left: 50%;
  bottom: 1rem;
  width: calc(100vw - 2rem);
  max-width: calc(100vw - 2rem);
  padding: 1.5rem clamp(0.75rem, 2vw, 2rem);
  box-sizing: border-box;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  overflow: visible;
  opacity: 0;
  pointer-events: none;
  transition: transform 0.65s ease, opacity 0.85s ease;
  ${(p) => slideCSS('Metrics', p.$active, p.$searched)}
`

const MetricsTableHeader = styled.table`
  width: 100%; border-collapse: collapse; table-layout: fixed;
  border-radius: 12px 12px 0 0; overflow: hidden;
  position: sticky; top: 0; z-index: 30;
  th { ${sharedHeaderTh} }
  ${metricsCols.map((c,i) => `th:nth-child(${i+1}) { width: ${c.w}; min-width: 60px; }`).join('\n')}
  th:first-child { border-top-left-radius: 12px; }
  th:last-child  { border-top-right-radius: 12px; }
`

const MetricsBodyTable = styled.table`
  width: 100%; border-collapse: collapse; table-layout: fixed;
  td { ${(p) => sharedBodyTd(p.$d)} }
  ${metricsCols.map((c,i) => `td:nth-child(${i+1}) { width: ${c.w}; min-width: 60px; }`).join('\n')}
  tbody tr:hover { background: rgba(255,255,255,0.04); }
`

/* Tempo section */
const tempoCols = [
  { w: '6%' }, { w: '9%' }, { w: '9%' }, { w: '11%' }, { w: '9%' },
  { w: '10%' }, { w: '9%' }, { w: '10%' }, { w: '10%' }, { w: '12%' },
]

const Tempo = styled.section`
  position: absolute;
  top: var(--section-top, 112px);
  left: 50%;
  bottom: 1rem;
  width: calc(100vw - 2rem);
  max-width: calc(100vw - 2rem);
  padding: 1.5rem clamp(0.75rem, 2vw, 2rem);
  box-sizing: border-box;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  overflow: visible;
  opacity: 0;
  pointer-events: none;
  transition: transform 0.65s ease, opacity 0.85s ease;
  ${(p) => slideCSS('Tempo', p.$active, p.$searched)}
`

const TempoTableHeader = styled.table`
  width: 100%; border-collapse: collapse; table-layout: fixed;
  border-radius: 12px 12px 0 0; overflow: hidden;
  position: sticky; top: 0; z-index: 30;
  th { ${sharedHeaderTh} }
  ${tempoCols.map((c,i) => `th:nth-child(${i+1}) { width: ${c.w}; min-width: 60px; }`).join('\n')}
  th:first-child { border-top-left-radius: 12px; }
  th:last-child  { border-top-right-radius: 12px; }
`

const TempoBodyTable = styled.table`
  width: 100%; border-collapse: collapse; table-layout: fixed;
  td { ${(p) => sharedBodyTd(p.$d)} }
  ${tempoCols.map((c,i) => `td:nth-child(${i+1}) { width: ${c.w}; min-width: 60px; }`).join('\n')}
  tbody tr:hover { background: rgba(255,255,255,0.04); }
`

/* Review section */
const reviewCols = [
  { w: '5%' }, { w: '10%' }, { w: '12%' }, { w: '12%' },
  { w: '10%' }, { w: '14%' }, { w: '37%' },
]

const Review = styled.section`
  position: absolute;
  top: var(--section-top, 112px);
  left: 50%;
  bottom: 1rem;
  width: calc(100vw - 2rem);
  max-width: calc(100vw - 2rem);
  padding: 1.5rem clamp(0.75rem, 2vw, 2rem);
  box-sizing: border-box;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  overflow: visible;
  opacity: 0;
  pointer-events: none;
  transition: transform 0.65s ease, opacity 0.85s ease;
  ${(p) => slideCSS('Review', p.$active, p.$searched)}
`

const ReviewTableHeader = styled.table`
  width: 100%; border-collapse: collapse; table-layout: fixed;
  border-radius: 12px 12px 0 0; overflow: hidden;
  position: sticky; top: 0; z-index: 30;
  th { ${sharedHeaderTh} }
  ${reviewCols.map((c,i) => `th:nth-child(${i+1}) { width: ${c.w}; min-width: 48px; }`).join('\n')}
  th:first-child { border-top-left-radius: 12px; }
  th:last-child  { border-top-right-radius: 12px; }
`

const ReviewBodyTable = styled.table`
  width: 100%; border-collapse: collapse; table-layout: fixed;
  td { ${(p) => sharedBodyTd(p.$d)} }
  ${reviewCols.map((c,i) => `td:nth-child(${i+1}) { width: ${c.w}; min-width: 48px; }`).join('\n')}
  tbody tr:hover { background: rgba(255,255,255,0.04); }
`

/* Weekly Summary section */
const weeklyCols = Array(13).fill({ w: '7.69%' })

const WeeklySummary = styled.section`
  position: absolute;
  top: var(--section-top, 112px);
  left: 50%;
  bottom: 1rem;
  width: calc(100vw - 2rem);
  max-width: calc(100vw - 2rem);
  padding: 1.5rem clamp(0.75rem, 2vw, 2rem);
  box-sizing: border-box;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 1.5rem;
  overflow: visible;
  opacity: 0;
  pointer-events: none;
  transition: transform 0.65s ease, opacity 0.85s ease;
  ${(p) => slideCSS('Weekly Summary', p.$active, p.$searched)}
`

const WeeklySummaryTableHeader = styled.table`
  width: 100%; border-collapse: collapse; table-layout: fixed;
  border-radius: 12px 12px 0 0; overflow: hidden;
  position: sticky; top: 0; z-index: 30;
  th { ${sharedHeaderTh} font-size: 0.62rem; }
  ${weeklyCols.map((c,i) => `th:nth-child(${i+1}) { width: ${c.w}; min-width: 52px; }`).join('\n')}
  th:first-child { border-top-left-radius: 12px; }
  th:last-child  { border-top-right-radius: 12px; }
`

const WeeklySummaryBodyTable = styled.table`
  width: 100%; border-collapse: collapse; table-layout: fixed;
  td { ${(p) => sharedBodyTd(p.$d)} }
  ${weeklyCols.map((c,i) => `td:nth-child(${i+1}) { width: ${c.w}; min-width: 52px; }`).join('\n')}
  tbody tr:hover { background: rgba(255,255,255,0.04); }
`

const KpiRow = styled.div`
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
`

const CardHeader = styled.div`
  font-size: ${(p) => p.$d?.cardHeaderFontSize || '16px'};
  font-weight: 700;
  transition: font-size 0.25s ease;
`

function makeKpiCard(getBg, getShadow, getBorder) {
  const Outer = styled.div`
    flex: 1 1 130px;
    max-width: ${(p) => p.$d?.cardWidth || '300px'};
    background: ${(p) => getBg(p.value)};
    border: 1px solid rgba(255, 102, 0, 0);
    border-radius: 999px;
    padding: clamp(0.25rem, 0.15vw, 0.375rem);
    box-shadow: ${(p) => getShadow(p.value)};
    transition: padding 0.25s ease, font-size 0.25s ease, max-width 0.25s ease;
  `
  const Inner = styled.div`
    width: 100%;
    background: ${(p) => getBg(p.value)};
    border: ${(p) => getBorder(p.value)};
    border-radius: 999px;
    padding: ${(p) => p.$d?.cardPadding || '16px'} !important;
    box-shadow: inset rgba(0, 0, 0, 0.27) 0px 6px 30px;
    transition: padding 0.25s ease, font-size 0.25s ease;
  `
  const Kpi = styled.div`
    position: relative;
    left: 50%;
    transform: translateX(-50%);
    color: rgba(255, 255, 255, 0.7);
    padding: 0;
    font-size: ${(p) => p.$d?.kpiFontSize || '0.75rem'};
    font-weight: 600;
    white-space: nowrap;
    transition: font-size 0.25s ease;
  `
  return { Outer, Inner, Kpi }
}

const colorRed    = 'rgba(255, 0, 0, 0.22)'
const colorYellow = 'rgba(255, 217, 0, 0.22)'
const colorGreen  = 'rgba(0, 255, 0, 0.22)'
const colorCyan   = 'rgba(0, 255, 255, 0.22)'
const shadowRed    = 'rgba(97, 1, 1, 0.45) 0px 6px 30px'
const shadowYellow = 'rgba(161, 98, 7, 0.45) 0px 6px 30px'
const shadowGreen  = 'rgba(0, 97, 0, 0.45) 0px 6px 30px'
const shadowCyan   = 'rgba(0, 97, 97, 0.45) 0px 6px 30px'
const borderFor = (color) => `3px solid ${color}`

const GamesPlayed = makeKpiCard(
  v => v < 10 ? colorRed : v <= 15 ? colorYellow : v < 25 ? colorGreen : colorCyan,
  v => v < 10 ? shadowRed : v <= 15 ? shadowYellow : v < 25 ? shadowGreen : shadowCyan,
  v => borderFor(v < 10 ? colorRed : v <= 15 ? colorYellow : v < 25 ? colorGreen : colorCyan)
)
const WinRate = makeKpiCard(
  v => v < 0.5 ? colorRed : v <= 0.529 ? colorYellow : v < 0.6 ? colorGreen : colorCyan,
  v => v < 0.5 ? shadowRed : v <= 0.529 ? shadowYellow : v < 0.6 ? shadowGreen : shadowCyan,
  v => borderFor(v < 0.5 ? colorRed : v <= 0.529 ? colorYellow : v < 0.6 ? colorGreen : colorCyan)
)
const AvgDeaths = makeKpiCard(
  v => v >= 6 ? colorRed : v >= 5 ? colorYellow : v >= 3 ? colorGreen : colorCyan,
  v => v >= 6 ? shadowRed : v >= 5 ? shadowYellow : v >= 3 ? shadowGreen : shadowCyan,
  v => borderFor(v >= 6 ? colorRed : v >= 5 ? colorYellow : v >= 3 ? colorGreen : colorCyan)
)
const AvgObj = makeKpiCard(
  v => v < 2 ? colorRed : v < 3 ? colorYellow : v < 5 ? colorGreen : colorCyan,
  v => v < 2 ? shadowRed : v < 3 ? shadowYellow : v < 5 ? shadowGreen : shadowCyan,
  v => borderFor(v < 2 ? colorRed : v < 3 ? colorYellow : v < 5 ? colorGreen : colorCyan)
)
const GoodTempo = makeKpiCard(
  v => v < 0.35 ? colorRed : v < 0.5 ? colorYellow : v < 0.55 ? colorGreen : colorCyan,
  v => v < 0.35 ? shadowRed : v < 0.5 ? shadowYellow : v < 0.55 ? shadowGreen : shadowCyan,
  v => borderFor(v < 0.35 ? colorRed : v < 0.5 ? colorYellow : v < 0.55 ? colorGreen : colorCyan)
)
const BadTempo = makeKpiCard(
  v => v >= 0.2 ? colorRed : v >= 0.15 ? colorYellow : v >= 0.05 ? colorGreen : colorCyan,
  v => v >= 0.2 ? shadowRed : v >= 0.15 ? shadowYellow : v >= 0.05 ? shadowGreen : shadowCyan,
  v => borderFor(v >= 0.2 ? colorRed : v >= 0.15 ? colorYellow : v >= 0.05 ? colorGreen : colorCyan)
)
const TiltGames = makeKpiCard(
  v => v >= 0.15 ? colorRed : v >= 0.13 ? colorYellow : v >= 0.1 ? colorGreen : colorCyan,
  v => v >= 0.15 ? shadowRed : v >= 0.13 ? shadowYellow : v >= 0.1 ? shadowGreen : shadowCyan,
  v => borderFor(v >= 0.15 ? colorRed : v >= 0.13 ? colorYellow : v >= 0.1 ? colorGreen : colorCyan)
)

/* Focus Cycles section */
const FocusCyclesSection = styled.section`
  position: absolute;
  top: var(--section-top, 112px);
  left: 50%;
  bottom: 1rem;
  width: calc(100vw - 2rem);
  max-width: calc(100vw - 2rem);
  padding: 1.5rem clamp(0.75rem, 2vw, 2rem);
  box-sizing: border-box;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  overflow: visible;
  opacity: 0;
  pointer-events: none;
  transition: transform 0.65s ease, opacity 0.85s ease;
  ${(p) => slideCSS('Focus Cycles', p.$active, p.$searched)}
`

const FocusCyclesRow = styled.div`
  width: 100%;
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  @media (max-width: 760px) { flex-direction: column; }
`

const FocusCyclesHalf = styled.div`
  flex: 1;
  min-width: 0;
`

const focusCyclesCols = [{ w: '50%' }, { w: '50%' }]

const FocusCyclesTableHeader = styled.table`
  width: 100%; border-collapse: collapse; table-layout: fixed;
  border-radius: 12px 12px 0 0; overflow: hidden;
  position: sticky; top: 0; z-index: 30;
  th { ${sharedHeaderTh} }
  ${focusCyclesCols.map((c,i) => `th:nth-child(${i+1}) { width: ${c.w}; }`).join('\n')}
  th:first-child { border-top-left-radius: 12px; }
  th:last-child  { border-top-right-radius: 12px; }
`

const FocusCyclesBodyTable = styled.table`
  width: 100%; border-collapse: collapse; table-layout: fixed;
  td { ${(p) => sharedBodyTd(p.$d)} }
  ${focusCyclesCols.map((c,i) => `td:nth-child(${i+1}) { width: ${c.w}; }`).join('\n')}
  tbody tr:hover { background: rgba(255,255,255,0.04); }
`

const improvementStatsCols = Array(6).fill({ w: '16.67%' })

const ImprovementFocusStatsTableHeader = styled.table`
  width: 100%; border-collapse: collapse; table-layout: fixed;
  border-radius: 12px 12px 0 0; overflow: hidden;
  position: sticky; top: 0; z-index: 30;
  th { ${sharedHeaderTh} }
  ${improvementStatsCols.map((c,i) => `th:nth-child(${i+1}) { width: ${c.w}; min-width: 70px; }`).join('\n')}
  th:first-child { border-top-left-radius: 12px; }
  th:last-child  { border-top-right-radius: 12px; }
`

const ImprovementFocusStatsBodyTable = styled.table`
  width: 100%; border-collapse: collapse; table-layout: fixed;
  td { ${(p) => sharedBodyTd(p.$d)} }
  ${improvementStatsCols.map((c,i) => `td:nth-child(${i+1}) { width: ${c.w}; min-width: 70px; }`).join('\n')}
  tbody tr:hover { background: rgba(255,255,255,0.04); }
`

const ImprovementFocusSelect = styled.select`
  width: 90%;
  appearance: none;
  -webkit-appearance: none;
  background: rgba(20, 26, 48, 0.8);
  color: #f8fafc;
  border: 1px solid rgba(255,255,255,0.04);
  padding: ${(p) => p.$d?.improvementSelectPadding || '0.5rem'};
  border-radius: 10px;
  text-align: center;
  transition: all 0.28s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover { background: rgba(25, 32, 56, 0.9); cursor: pointer; }
  &:focus {
    outline: none;
    border-color: #f85538;
    box-shadow: 0 6px 18px rgba(56,189,248,0.08);
    background: rgba(25, 32, 56, 0.95);
  }
`

/* Disclaimer */
const Disclaimer = styled.div`
  position: fixed;
  bottom: 0; left: 0; width: 100%;
  text-align: center;
  font-size: 0.6rem;
  color: rgba(248, 250, 252, 0.22);
  padding: 4px 16px 6px;
  background: rgba(24, 12, 12, 0.7);
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  z-index: 100;
  line-height: 1.5;
`

/* Tour overlay */
const TourOverlay = styled.div`
  position: fixed; inset: 0; z-index: 200;
  pointer-events: ${p => p.$active ? 'auto' : 'none'};
`
const TourDimmer = styled.div`
  position: absolute; inset: 0;
  background: rgba(0, 0, 0, 0.62);
  transition: opacity 0.3s;
  opacity: ${p => p.$vis ? 1 : 0};
  pointer-events: ${p => p.$vis ? 'auto' : 'none'};
`
const BubbleSpotlight = styled.div`
  position: fixed;
  border: 2px solid rgba(242, 201, 107, 0.7);
  border-radius: 8px;
  box-shadow: 0 0 0 4000px rgba(0,0,0,0.7), 0 0 32px rgba(242,201,107,0.48);
  border: 3px solid rgba(242, 201, 107, 0.95);
  border-radius: 999px;
  backdrop-filter: brightness(1.18) saturate(1.05);
  pointer-events: none;
  transition: all 0.3s ease;
  z-index: 201;
`
const Bubble = styled.div`
  position: fixed;
  background: rgba(14, 7, 6, 0.98);
  border: 1px solid rgba(242, 201, 107, 0.4);
  border-radius: 16px;
  padding: 1.25rem 1.5rem;
  width: 340px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(242,201,107,0.08);
  pointer-events: auto;
  z-index: 202;
`
const BubbleTail = styled.div`
  position: absolute; width: 0; height: 0;
  ${p => p.$dir === 'up'   && 'top:-10px; left:50%; transform:translateX(-50%); border-left:10px solid transparent; border-right:10px solid transparent; border-bottom:10px solid rgba(242,201,107,0.5);'}
  ${p => p.$dir === 'down' && 'bottom:-10px; left:50%; transform:translateX(-50%); border-left:10px solid transparent; border-right:10px solid transparent; border-top:10px solid rgba(242,201,107,0.5);'}
  ${p => p.$dir === 'up-right' && 'top:-10px; right:24px; border-left:10px solid transparent; border-right:10px solid transparent; border-bottom:10px solid rgba(242,201,107,0.5);'}
  ${p => p.$dir === 'none' && 'display:none;'}
`
const BubbleTitle = styled.div`font-size:0.82rem; font-weight:700; color:#f2c96b; letter-spacing:0.07em; text-transform:uppercase; margin-bottom:0.55rem;`
const BubbleText  = styled.div`font-size:0.88rem; color:rgba(248,250,252,0.85); line-height:1.65;`
const BubbleNav   = styled.div`display:flex; align-items:center; justify-content:space-between; margin-top:1.1rem;`
const BubbleStep  = styled.div`font-size:0.72rem; color:rgba(248,250,252,0.32); letter-spacing:0.06em;`
const BubbleBtnRow = styled.div`display:flex; gap:0.5rem;`
const BubbleBtn   = styled.button`
  border: 1px solid rgba(242,201,107,0.35);
  background: rgba(242,201,107,0.09);
  color: #f2c96b;
  border-radius: 999px;
  padding: 0.38rem 1.1rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  letter-spacing: 0.04em;
  transition: background 0.18s, border-color 0.18s;
  &:hover { background: rgba(242,201,107,0.2); border-color: rgba(242,201,107,0.6); }
`

const LandingTourBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid rgba(242, 201, 107, 0.5);
  background: rgba(14, 7, 6, 0.85);
  color: #f2c96b;
  border-radius: 999px;
  padding: 0.7rem 1.6rem;
  font-size: 0.88rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  cursor: pointer;
  backdrop-filter: blur(14px);
  box-shadow: 0 0 28px rgba(242,201,107,0.18), 0 4px 20px rgba(0,0,0,0.5);
  transition: background 0.22s, transform 0.22s, box-shadow 0.22s;
  animation: tourPulse 2.8s ease-in-out infinite;

  @keyframes tourPulse {
    0%, 100% { box-shadow: 0 0 28px rgba(242,201,107,0.18), 0 4px 20px rgba(0,0,0,0.5); }
    50%       { box-shadow: 0 0 44px rgba(242,201,107,0.42), 0 4px 28px rgba(0,0,0,0.6); }
  }

  &:hover {
    background: rgba(242,201,107,0.14);
    transform: translateY(-2px);
    box-shadow: 0 0 52px rgba(242,201,107,0.5), 0 8px 32px rgba(0,0,0,0.55);
    animation: none;
  }

  .tour-icon {
    width: 28px; height: 28px;
    border-radius: 50%;
    background: rgba(242,201,107,0.15);
    border: 1.5px solid rgba(242,201,107,0.5);
    display: flex; align-items: center; justify-content: center;
    font-size: 0.85rem; flex-shrink: 0;
  }

  .tour-label { display: flex; flex-direction: column; gap: 1px; text-align: left; }
  .tour-label-main { font-size: 0.88rem; font-weight: 700; color: #f2c96b; }
  .tour-label-sub { font-size: 0.68rem; font-weight: 500; color: rgba(248,250,252,0.45); letter-spacing: 0.05em; text-transform: uppercase; }
`

const TourStartBtn = styled.button`
  position: fixed; bottom: 36px; right: 24px; z-index: 150;
  border: 1px solid rgba(242,201,107,0.4);
  background: rgba(14,7,6,0.92);
  color: #f2c96b;
  border-radius: 999px;
  padding: 0.5rem 1.2rem;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  cursor: pointer;
  box-shadow: 0 4px 24px rgba(0,0,0,0.5);
  backdrop-filter: blur(12px);
  transition: background 0.2s, transform 0.2s;
  &:hover { background: rgba(242,201,107,0.12); transform: translateY(-1px); }
`

/* Helpers */
function formatEarlyTempo(val) {
  return `${val >= 0 ? '+' : ''}${(val * 100).toFixed(1)}%`
}
function earlyTempoColor(val) {
  if (val > 0.15)  return 'rgba(0,255,255,0.85)'
  if (val > 0.04)  return 'rgba(114,255,86,0.8)'
  if (val > -0.05) return 'rgba(234,179,8,0.85)'
  return 'rgba(253,57,57,0.8)'
}
function deltaColor(v) {
  return v > 0 ? 'rgba(114,255,86,0.8)' : v < 0 ? 'rgba(253,57,57,0.8)' : 'rgba(248,250,252,0.5)'
}


const App = () => {
  const [showForm, setShowForm] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState('North America')
  const [searchQuery, setSearchQuery] = useState('')
  const [searched, setSearched] = useState(false)
  const [activeTab, setActiveTab] = useState('Overview')
  const [densityKey, setDensityKey] = useState('default')
  const [improvementFocus, setImprovementFocus] = useState({
    '2026-04-26': 'Reduce Deaths',
    '2026-05-10': 'First Item Timing',
    '2026-05-24': 'Objective Control',
    '2026-06-07': '',
  })
  const [existingStats, setExistingStats] = useState([])

  const [review, setReview] = useState(() => {
    const seeded = {}
    MOCK_STATS.forEach((row) => {
      seeded[row.match] = {
        'Gameplan Adherence': row.gameplan_adherence ?? '',
        'Major Mistake':      row.major_mistake      ?? '',
        'Mental':             row.mental             ?? '',
        'Focus Rating':       row.focus_rating       ?? '',
        'Notes':              row.notes              ?? '',
      }
    })
    return seeded
  })

  const d = DENSITY[densityKey]

  const regionCodes = {
    'North America': 'NA1', 'Middle East': 'ME1', 'Europe West': 'EUW',
    'Europe Nordic & East': 'EUNE', 'Oceania': 'OC', 'Korea': 'KR1',
    'Japan': 'JP1', 'Brazil': 'BR1', 'LAS': 'LAS', 'LAN': 'LAN',
    'Russia': 'RU1', 'Turkiye': 'TR1', 'Southeast Asia': 'SG2',
    'Taiwan': 'TW2', 'Vietnam': 'VN2',
  }

  const currentCode = regionCodes[selectedRegion] || 'NA1'
  const placeholderText = `Game Name + #${currentCode}`
  const notesPlaceholderText = 'Example: Lost tempo taking a risky gank.'

  const handleRegionChange = (e) => setSelectedRegion(e.target.value)
  const handleSearchChange = (e) => setSearchQuery(e.target.value)
  const handleTabChange = (tab) => setActiveTab(tab)
  const handleReviewChange = (e, match, column) => {
    setReview(prev => ({ ...prev, [match]: { ...prev[match], [column]: e.target.value } }))
  }
  const handleImprovementFocusChange = (e, startdate) => {
    setImprovementFocus(prev => ({ ...prev, [startdate]: e.target.value }))
  }

  const handleGetExistingStats = () => {
    setExistingStats(MOCK_STATS)
  }

  useEffect(() => {
    if (!existingStats?.length) return
    const seeded = {}
    existingStats.forEach((row) => {
      seeded[row.match] = {
        'Gameplan Adherence': row['gameplan_adherence'] ?? '',
        'Major Mistake':      row['major_mistake']      ?? '',
        'Mental':             row['mental']             ?? '',
        'Focus Rating':       row['focus_rating']       ?? '',
        'Notes':              row['notes']              ?? '',
      }
    })
    setReview(seeded)
  }, [existingStats])

  const activeFocusEntry = Object.entries(improvementFocus).reverse().find(([, v]) => v && v !== '')
  const activeFocusName = activeFocusEntry ? activeFocusEntry[1] : '— None —'

  const [tourActive, setTourActive] = useState(false)
  const [tourStep,   setTourStep]   = useState(0)
  const [bubblePos,  setBubblePos]  = useState({ top: 0, left: 0, tailDir: 'none', spotRect: null })

  const BUBBLE_WIDTH = 340
  const BUBBLE_GAP = 14

  const computePos = (stepIndex) => {
    const s = TOUR_STEPS[stepIndex]
    if (!s.anchor) {
      setBubblePos({ top: null, left: null, tailDir: 'none', spotRect: null })
      return
    }
    const el = document.querySelector(s.anchor)
    if (!el) {
      setBubblePos({ top: null, left: null, tailDir: 'none', spotRect: null })
      return
    }
    const r = el.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    let spotRect = { top: r.top - 4, left: r.left - 4, width: r.width + 8, height: r.height + 8 }

    if (s.anchor.includes('tab-')) {
      spotRect = { top: r.top - 8, left: r.left - 14, width: r.width + 28, height: r.height + 14 }
    }

    let top, left, tailDir

    if (s.side === 'below-center') {
      top = r.bottom + BUBBLE_GAP
      left = r.left + r.width / 2 - BUBBLE_WIDTH / 2
      tailDir = 'up'
    } else if (s.side === 'below-right') {
      top = r.bottom + BUBBLE_GAP
      left = r.right - BUBBLE_WIDTH
      tailDir = 'up-right'
    } else if (s.side === 'above-center') {
      top = r.top - BUBBLE_GAP - 160
      left = r.left + r.width / 2 - BUBBLE_WIDTH / 2
      tailDir = 'down'
    }

    left = Math.max(12, Math.min(left, vw - BUBBLE_WIDTH - 12))
    if (top + 200 > vh) top = r.top - BUBBLE_GAP - 200
    top = Math.max(68, top)

    setBubblePos({ top, left, tailDir, spotRect })
  }

  const startTour = () => {
    setSearched(false)
    setSearchQuery('')
    setShowForm(false)
    setExistingStats([])
    setActiveTab('Overview')
    setTourStep(0)
    setTourActive(true)
    setBubblePos({ top: null, left: null, tailDir: 'none', spotRect: null })
  }

  const tourGo = (nextStep) => {
    const s = TOUR_STEPS[nextStep]

    if (s.id === 'do-search') {
      setShowForm(true)
      setSearchQuery('JungleMain#NA1')
      setTimeout(() => {
        setSearched(true)
        setExistingStats(MOCK_STATS)
        setTourStep(nextStep)
        setTimeout(() => computePos(nextStep), 900)
      }, 120)
      return
    }

    if (s.tab) setActiveTab(s.tab)
    setTourStep(nextStep)
    setTimeout(() => computePos(nextStep), 80)
    setTimeout(() => computePos(nextStep), 260)
  }

  const tourBack = (prevStep) => {
    const s = TOUR_STEPS[prevStep]
    if (s.tab) setActiveTab(s.tab)
    setTourStep(prevStep)
    // Header/tabbar anchors are always in the DOM and can be measured immediately.
    // Banner anchors (search-summoner-btn, auth-btn) fly in over 850ms and need
    // to be measured after that transition settles.
    // In-section anchors (e.g. col-early-tempo) slide in over 650ms.
    const isHeaderAnchor = !s.anchor
      || s.anchor.includes('tab-')
      || s.anchor.includes('update-btn')
      || s.anchor.includes('density-toggle')
      || s.anchor.includes('header-stats')
    const isBannerAnchor = s.anchor?.includes('search-summoner-btn')
      || s.anchor?.includes('auth-btn')
    if (isHeaderAnchor) {
      setTimeout(() => computePos(prevStep), 80)
      setTimeout(() => computePos(prevStep), 260)
    } else if (isBannerAnchor) {
      setTimeout(() => computePos(prevStep), 900)
      setTimeout(() => computePos(prevStep), 1100)
    } else {
      // in-section anchor — wait for 650ms slide transition
      setTimeout(() => computePos(prevStep), 700)
      setTimeout(() => computePos(prevStep), 900)
    }
  }

  const tourNext = () => {
    const nx = tourStep + 1
    if (nx >= TOUR_STEPS.length) { setTourActive(false); return }
    tourGo(nx)
  }

  const tourPrev = () => {
    const pv = tourStep - 1
    if (pv < 0) return
    if (TOUR_STEPS[pv].id === 'do-search' || pv < TOUR_STEPS.findIndex(s => s.id === 'do-search')) {
      setSearched(false)
      setExistingStats([])
      setSearchQuery('')
      setShowForm(pv >= TOUR_STEPS.findIndex(s => s.id === 'search-btn'))
    }
    tourBack(pv)
  }

  const step = TOUR_STEPS[tourStep]
  const isCentered = !step.anchor

  const latestStat = existingStats.length ? existingStats[existingStats.length - 1] : null

  return (
    <GlobalLayout>
      <Container>
        {/* header */}
        <Header $searched={searched}>
          {/* Left zone: brand + update */}
          <HeaderLeft>
            <HeaderBrand>Jungle Improvement Log</HeaderBrand>
            <UpdateBtn data-tour="update-btn" disabled>↻ Update</UpdateBtn>
          </HeaderLeft>

          {/* Center zone: stat pills — grid keeps this truly centered */}
          <HeaderCenter data-tour="header-stats">
            <HeaderStat>
              <HeaderStatVal>{searchQuery || '—'}</HeaderStatVal>
              <HeaderStatLbl>Summoner</HeaderStatLbl>
            </HeaderStat>
            <HeaderDivider />
            <HeaderStat>
              <HeaderStatVal>{selectedRegion || 'Unknown'}</HeaderStatVal>
              <HeaderStatLbl>Region</HeaderStatLbl>
            </HeaderStat>
            <HeaderDivider className="hide-narrow" />
            <HeaderStat className="hide-narrow">
              <HeaderStatVal>{latestStat?.rank ?? 'Platinum IV'}</HeaderStatVal>
              <HeaderStatLbl>Rank</HeaderStatLbl>
            </HeaderStat>
            <HeaderDivider className="hide-narrow" />
            <HeaderStat className="hide-narrow">
              <HeaderStatVal>{latestStat?.lp ?? 50} LP</HeaderStatVal>
              <HeaderStatLbl>LP</HeaderStatLbl>
            </HeaderStat>
            <HeaderDivider className="hide-narrow" />
            <HeaderStat className="hide-narrow">
              <HeaderStatVal>
                <ImprovementFocusCD>
                  <span style={{ fontSize: '12px', color: '#f2c96b', opacity: 0.8 }}>◎</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#f2c96b', letterSpacing: '0.04em' }}>{activeFocusName}</span>
                    <span style={{ fontSize: '0.58rem', color: 'rgba(248,250,252,0.38)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>5 days remaining</span>
                  </div>
                </ImprovementFocusCD>
              </HeaderStatVal>
            </HeaderStat>
            <HeaderDivider />
            <Legend>
              {[['rgba(0,255,255,0.75)', 'Very good'], ['rgba(0,255,0,0.75)', 'Good'], ['rgba(255,217,0,0.75)', 'Okay'], ['rgba(255,0,0,0.75)', 'Bad']].map(([color, label]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: '0.58rem', color: 'rgba(248,250,252,0.38)', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{label}</span>
                </div>
              ))}
            </Legend>
          </HeaderCenter>

          {/* Right zone: density + auth */}
          <HeaderRight>
            <DensityToggle data-tour="density-toggle">
              <DensityBtn $active={densityKey === 'compact'}     onClick={() => setDensityKey('compact')}>Compact</DensityBtn>
              <DensityBtn $active={densityKey === 'default'}     onClick={() => setDensityKey('default')}>Default</DensityBtn>
              <DensityBtn $active={densityKey === 'comfortable'} onClick={() => setDensityKey('comfortable')}>Cozy</DensityBtn>
            </DensityToggle>
            <HeaderAuth data-tour="auth-btn-header">Sign Up / Log In</HeaderAuth>
          </HeaderRight>
        </Header>

        {/* tab bar */}
        <TabBar $searched={searched}>
          <TabLinks>
            {TAB_ORDER.map(tab => (
              <a
                key={tab}
                data-tour={`tab-${tab}`}
                href={`#${tab.toLowerCase().replace(' ', '-')}`}
                onClick={(e) => { e.preventDefault(); handleTabChange(tab) }}
                data-active={activeTab === tab}
                aria-current={activeTab === tab ? 'page' : undefined}
              >
                {tab}
              </a>
            ))}
          </TabLinks>
        </TabBar>

        {/* banner */}
        <Banner $searched={searched}>
          <BannerEyebrow>Jungle</BannerEyebrow>
          <BannerTitle>Improvement Log</BannerTitle>
          <BannerDivider />
          <BannerTagline>
            See exactly where your jungle is winning — and where it isn't. Set an <strong>improvement focus</strong> and track your progress over time with data-driven insights.
          </BannerTagline>
          <BannerButtonRow>
            <ActionButton data-tour="search-summoner-btn" onClick={() => setShowForm(true)}>Search a summoner</ActionButton>
            <AuthButton data-tour="auth-btn" onClick={() => {}}>Sign Up / Log In</AuthButton>
          </BannerButtonRow>
          <LandingTourBtn onClick={startTour}>
            <div className="tour-icon">◎</div>
            <div className="tour-label">
              <span className="tour-label-main">Reviewer Guide</span>
              <span className="tour-label-sub">Interactive walkthrough</span>
            </div>
          </LandingTourBtn>
          <FormPanel $visible={showForm}>
            <CombinedForm $visible={showForm}>
              <RegionUnit>
                <StyledSelect value={selectedRegion} onChange={handleRegionChange} aria-label="Region select">
                  {Object.keys(regionCodes).map(r => <option key={r} value={r}>{r}</option>)}
                </StyledSelect>
              </RegionUnit>
              <Divider />
              <SearchUnit>
                <FloatingWrapper className="form-floating">
                  <input id="search" name="search" type="text" value={searchQuery} onChange={handleSearchChange} className="form-control" placeholder={placeholderText} aria-label={placeholderText} />
                  <label htmlFor="search">{placeholderText}</label>
                </FloatingWrapper>
              </SearchUnit>
              <Divider />
              <SearchButtonUnit>
                <SearchButton onClick={() => { setSearched(true); handleGetExistingStats() }}>Search</SearchButton>
              </SearchButtonUnit>
            </CombinedForm>
          </FormPanel>
        </Banner>

        {/* sections */}
        {searched && <>

          {/* OVERVIEW */}
          <Overview $searched={searched} $active={activeTab}>
            <Table>
              <OverviewTableHeader>
                <thead><tr>
                  <th>Match</th><th>Date</th><th>Patch</th><th>Rank</th>
                  <th title="LP history is not available via Riot's API — manually tracked in production">LP *</th><th>Champion</th><th>Result</th><th>Length</th>
                </tr></thead>
              </OverviewTableHeader>
              <TableBodyWrapper>
                <OverviewBodyTable $d={d}>
                  <tbody>
                    {(existingStats ?? []).map(row => (
                      <ResultRow key={row.match} $result={row.result}>
                        <td>{row.match}</td><td>{row.date}</td><td>{row.patch}</td>
                        <Rank $rank={row.rank}>{row.rank}</Rank>
                        <td>{row.lp} <LPChange $lpChange={row.lp_change}><strong>{row.lp_change !== null ? `(${row.lp_change > 0 ? '+' : ''}${row.lp_change})` : '(0)'}</strong></LPChange></td>
                        <td>{row.champion}</td>
                        <td><MatchResult $d={d} $result={row.result}><strong>{row.result.toUpperCase()}</strong></MatchResult></td>
                        <td>{row.length}</td>
                      </ResultRow>
                    ))}
                  </tbody>
                </OverviewBodyTable>
              </TableBodyWrapper>
            </Table>
            <div style={{ alignSelf: 'flex-start', fontSize: '0.62rem', color: 'rgba(248,250,252,0.28)', letterSpacing: '0.04em' }}>
              * LP history is not available via Riot's API — manually tracked in production
            </div>
          </Overview>

          {/* DETAILS */}
          <Details $searched={searched} $active={activeTab}>
            <Table>
              <DetailsTableHeader>
                <thead><tr>
                  <th>Match</th><th>Date</th><th>Team Kills</th><th>K</th>
                  <th>D</th><th>A</th><th>CS</th><th>Dmg Dealt</th>
                  <th>Vision</th><th>Kill Part%</th><th>Obj Secured</th>
                  <th>1st Item</th><th data-tour="col-early-tempo">Early Tempo</th>
                </tr></thead>
              </DetailsTableHeader>
              <TableBodyWrapper>
                <DetailsBodyTable $d={d}>
                  <tbody>
                    {(existingStats ?? []).map(row => (
                      <ResultRow key={row.match} $result={row.result}>
                        <td>{row.match}</td><td>{row.date}</td><td>{row.team_kills}</td>
                        <td>{row.kills}</td><td>{row.deaths}</td><td>{row.assists}</td>
                        <td>{row.cs}</td><td>{row.damage_dealt.toLocaleString()}</td>
                        <td>{row.vision_score}</td>
                        <td>{(row.kill_participation * 100).toFixed(1)}%</td>
                        <td>{row.obj_secured}</td>
                        <td>{row.first_item_timing}</td>
                        <td style={{ color: earlyTempoColor(row.early_tempo), fontWeight: 600 }}>
                          {formatEarlyTempo(row.early_tempo)}
                        </td>
                      </ResultRow>
                    ))}
                  </tbody>
                </DetailsBodyTable>
              </TableBodyWrapper>
            </Table>
          </Details>

          {/* METRICS */}
          <Metrics $searched={searched} $active={activeTab}>
            <Table>
              <MetricsTableHeader>
                <thead><tr>
                  <th>Match</th><th>Date</th><th>CS/min</th><th>Vis/min</th>
                  <th>Dmg/min</th><th>Gold Δ@10</th><th>XP Δ@10</th>
                  <th>CS Δ@10</th><th>K+A Δ@10</th>
                </tr></thead>
              </MetricsTableHeader>
              <TableBodyWrapper>
                <MetricsBodyTable $d={d}>
                  <tbody>
                    {(existingStats ?? []).map(row => (
                      <ResultRow key={row.match} $result={row.result}>
                        <td>{row.match}</td><td>{row.date}</td>
                        <td>{row.cs_per_min}</td><td>{row.vision_per_min}</td>
                        <td>{row.damage_per_min.toLocaleString()}</td>
                        <td style={{ color: deltaColor(row.gold_delta_10) }}>{row.gold_delta_10 > 0 ? '+' : ''}{row.gold_delta_10}</td>
                        <td style={{ color: deltaColor(row.xp_delta_10) }}>{row.xp_delta_10 > 0 ? '+' : ''}{row.xp_delta_10}</td>
                        <td style={{ color: deltaColor(row.cs_delta_10) }}>{row.cs_delta_10 > 0 ? '+' : ''}{row.cs_delta_10}</td>
                        <td style={{ color: deltaColor(row.ka_delta_10) }}>{row.ka_delta_10 > 0 ? '+' : ''}{row.ka_delta_10}</td>
                      </ResultRow>
                    ))}
                  </tbody>
                </MetricsBodyTable>
              </TableBodyWrapper>
            </Table>
          </Metrics>

          {/* TEMPO */}
          <Tempo $searched={searched} $active={activeTab}>
            <Table>
              <TempoTableHeader>
                <thead><tr>
                  <th>Match</th><th>Date</th><th>Gold@10</th><th>Enemy Gold@10</th>
                  <th>EXP@10</th><th>Enemy EXP@10</th><th>CS@10</th>
                  <th>Enemy CS@10</th><th>K+A@10</th><th>Enemy K+A@10</th>
                </tr></thead>
              </TempoTableHeader>
              <TableBodyWrapper>
                <TempoBodyTable $d={d}>
                  <tbody>
                    {(existingStats ?? []).map(row => (
                      <ResultRow key={row.match} $result={row.result}>
                        <td>{row.match}</td><td>{row.date}</td>
                        <td>{row.gold_10}</td><td>{row.enemy_gold_10}</td>
                        <td>{row.xp_10}</td><td>{row.enemy_xp_10}</td>
                        <td>{row.cs_10}</td><td>{row.enemy_cs_10}</td>
                        <td>{row.ka_10}</td><td>{row.enemy_ka_10}</td>
                      </ResultRow>
                    ))}
                  </tbody>
                </TempoBodyTable>
              </TableBodyWrapper>
            </Table>
          </Tempo>

          {/* REVIEW */}
          <Review $searched={searched} $active={activeTab}>
            <Table>
              <ReviewTableHeader>
                <thead><tr>
                  <th>Match</th><th>Date</th><th>Gameplan Adherence</th><th>Major Mistake</th>
                  <th>Mental</th><th>Focus Rating</th><th>Notes</th>
                </tr></thead>
              </ReviewTableHeader>
              <TableBodyWrapper>
                <ReviewBodyTable $d={d}>
                  <tbody>
                    {(existingStats ?? []).map(row => (
                      <ResultRow key={row.match} $result={row.result}>
                        <td>{row.match}</td>
                        <td>{row.date}</td>
                        <td>
                          <ReviewSelect $d={d} $val={review[row.match]?.['Gameplan Adherence'] || ''} aria-label="Gameplan Adherence"
                            value={review[row.match]?.['Gameplan Adherence'] || ''}
                            onChange={(e) => handleReviewChange(e, row.match, 'Gameplan Adherence')}>
                            <option value="" disabled hidden>--</option>
                            <option value="Good">Good</option><option value="Okay">Okay</option><option value="Bad">Bad</option>
                          </ReviewSelect>
                        </td>
                        <td>
                          <ReviewSelect $d={d} $val="neutral" aria-label="Major Mistake"
                            value={review[row.match]?.['Major Mistake'] || ''}
                            onChange={(e) => handleReviewChange(e, row.match, 'Major Mistake')}>
                            <option value="" disabled hidden>--</option>
                            <option value="Positioning">Positioning</option>
                            <option value="Late Reset">Late Reset</option>
                            <option value="Emotional Play">Emotional Play</option>
                            <option value="Farm Path Error">Farm Path Error</option>
                            <option value="Objective Fumble">Objective Fumble</option>
                          </ReviewSelect>
                        </td>
                        <td>
                          <ReviewSelect $d={d} $val={review[row.match]?.['Mental'] || ''} aria-label="Mental"
                            value={review[row.match]?.['Mental'] || ''}
                            onChange={(e) => handleReviewChange(e, row.match, 'Mental')}>
                            <option value="" disabled hidden>--</option>
                            <option value="Calm">Calm</option><option value="Frustrated">Frustrated</option><option value="Tilted">Tilted</option>
                          </ReviewSelect>
                        </td>
                        <td>
                          <ReviewSelect $d={d} $val={review[row.match]?.['Focus Rating'] || ''} aria-label="Focus Rating"
                            value={review[row.match]?.['Focus Rating'] || ''}
                            onChange={(e) => handleReviewChange(e, row.match, 'Focus Rating')}>
                            <option value="" disabled hidden>--</option>
                            <option value="Good">Good</option><option value="Okay">Okay</option><option value="Bad">Bad</option>
                          </ReviewSelect>
                        </td>
                        <td>
                          <ReviewNotes $d={d}>
                            <textarea className="form-control" placeholder={notesPlaceholderText} aria-label={notesPlaceholderText}
                              value={review[row.match]?.['Notes'] ?? ''}
                              onChange={(e) => handleReviewChange(e, row.match, 'Notes')} />
                          </ReviewNotes>
                        </td>
                      </ResultRow>
                    ))}
                  </tbody>
                </ReviewBodyTable>
              </TableBodyWrapper>
            </Table>
          </Review>

          {/* WEEKLY SUMMARY */}
          <WeeklySummary $searched={searched} $active={activeTab}>
            <KpiRow>
              <GamesPlayed.Outer value={9} $d={d}>
                <GamesPlayed.Inner value={9} $d={d}>
                  <CardHeader $d={d}>Games Played</CardHeader>
                  <p style={{ margin: '4px 0', fontSize: d?.cardFontSize }}>9</p>
                  <GamesPlayed.Kpi $d={d}>Between 15–25</GamesPlayed.Kpi>
                </GamesPlayed.Inner>
              </GamesPlayed.Outer>
              <WinRate.Outer value={0.52} $d={d}>
                <WinRate.Inner value={0.52} $d={d}>
                  <CardHeader $d={d}>Win Rate</CardHeader>
                  <p style={{ margin: '4px 0', fontSize: d?.cardFontSize }}>52%</p>
                  <WinRate.Kpi $d={d}>&gt; 52%</WinRate.Kpi>
                </WinRate.Inner>
              </WinRate.Outer>
              <AvgDeaths.Outer value={4} $d={d}>
                <AvgDeaths.Inner value={4} $d={d}>
                  <CardHeader $d={d}>Avg Deaths</CardHeader>
                  <p style={{ margin: '4px 0', fontSize: d?.cardFontSize }}>4</p>
                  <AvgDeaths.Kpi $d={d}>&lt; 5</AvgDeaths.Kpi>
                </AvgDeaths.Inner>
              </AvgDeaths.Outer>
              <AvgObj.Outer value={5} $d={d}>
                <AvgObj.Inner value={5} $d={d}>
                  <CardHeader $d={d}>Avg Objectives</CardHeader>
                  <p style={{ margin: '4px 0', fontSize: d?.cardFontSize }}>5</p>
                  <AvgObj.Kpi $d={d}>3 or more</AvgObj.Kpi>
                </AvgObj.Inner>
              </AvgObj.Outer>
              <GoodTempo.Outer value={0.45} $d={d}>
                <GoodTempo.Inner value={0.45} $d={d}>
                  <CardHeader $d={d}>Good Tempo</CardHeader>
                  <p style={{ margin: '4px 0', fontSize: d?.cardFontSize }}>45%</p>
                  <GoodTempo.Kpi $d={d}>&gt; 50%</GoodTempo.Kpi>
                </GoodTempo.Inner>
              </GoodTempo.Outer>
              <BadTempo.Outer value={0.04} $d={d}>
                <BadTempo.Inner value={0.04} $d={d}>
                  <CardHeader $d={d}>Bad Tempo</CardHeader>
                  <p style={{ margin: '4px 0', fontSize: d?.cardFontSize }}>4%</p>
                  <BadTempo.Kpi $d={d}>&lt; 20%</BadTempo.Kpi>
                </BadTempo.Inner>
              </BadTempo.Outer>
              <TiltGames.Outer value={0.04} $d={d}>
                <TiltGames.Inner value={0.04} $d={d}>
                  <CardHeader $d={d}>Tilt Games</CardHeader>
                  <p style={{ margin: '4px 0', fontSize: d?.cardFontSize }}>4%</p>
                  <TiltGames.Kpi $d={d}>&lt; 15%</TiltGames.Kpi>
                </TiltGames.Inner>
              </TiltGames.Outer>
            </KpiRow>

            <Table>
              <WeeklySummaryTableHeader>
                <thead><tr>
                  <th>Week</th><th>Games</th><th>Win%</th>
                  <th>Avg Deaths</th><th>Avg Obj</th><th>Good Tempo</th>
                  <th>Bad Tempo</th><th>Tilt%</th><th>Start Rank</th><th>Start LP</th>
                  <th>End Rank</th><th>End LP</th><th>LP Δ</th>
                </tr></thead>
              </WeeklySummaryTableHeader>
              <TableBodyWrapper>
                <WeeklySummaryBodyTable $d={d}>
                  <tbody>
                    <tr><td>1</td><td>38</td><td>57.89%</td><td>4.95</td><td>4.07</td><td>61.2%</td><td>9.8%</td><td>7.9%</td><td>Gold II</td><td>34</td><td>Plat IV</td><td>48</td><td>+214</td></tr>
                    <tr><td>2</td><td>41</td><td>56.10%</td><td>5.12</td><td>3.88</td><td>58.5%</td><td>12.2%</td><td>9.8%</td><td>Plat IV</td><td>48</td><td>Plat III</td><td>12</td><td>+164</td></tr>
                    <tr><td>3</td><td>29</td><td>44.83%</td><td>5.62</td><td>3.48</td><td>48.3%</td><td>17.2%</td><td>13.8%</td><td>Plat III</td><td>12</td><td>Plat IV</td><td>62</td><td>–50</td></tr>
                  </tbody>
                </WeeklySummaryBodyTable>
              </TableBodyWrapper>
            </Table>
          </WeeklySummary>

          {/* FOCUS CYCLES */}
          <FocusCyclesSection $searched={searched} $active={activeTab}>
            <FocusCyclesRow>
              <FocusCyclesHalf>
                <Table>
                  <FocusCyclesTableHeader>
                    <thead><tr><th>Start Date</th><th>Improvement Focus</th></tr></thead>
                  </FocusCyclesTableHeader>
                  <TableBodyWrapper style={{ maxHeight: '260px' }}>
                    <FocusCyclesBodyTable $d={d}>
                      <tbody>
                        {MOCK_FOCUS_CYCLES.map(fc => (
                          <tr key={fc.startdate}>
                            <td>{fc.startdate}</td>
                            <td>
                              <ImprovementFocusSelect $d={d} aria-label="Improvement focus"
                                value={improvementFocus[fc.startdate] || ''}
                                onChange={(e) => handleImprovementFocusChange(e, fc.startdate)}>
                                <option value="" disabled hidden>-- Select --</option>
                                <option value="Reduce Deaths">Reduce Deaths</option>
                                <option value="First Item Timing">First Item Timing</option>
                                <option value="Objective Control">Objective Control</option>
                                <option value="Clear Speed">Clear Speed</option>
                                <option value="Gank Pathing">Gank Pathing</option>
                                <option value="Vision Control">Vision Control</option>
                                <option value="None">None</option>
                              </ImprovementFocusSelect>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </FocusCyclesBodyTable>
                  </TableBodyWrapper>
                </Table>
              </FocusCyclesHalf>
              <FocusCyclesHalf>
                <Table style={{ height: '100%' }}>
                  <div style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9fc7c7', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Cycle Descriptions</div>
                    {MOCK_FOCUS_CYCLES.map(fc => (
                      <div key={fc.startdate} style={{ marginBottom: '0.75rem', padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: '3px solid rgba(242,201,107,0.25)' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f2c96b', marginBottom: '3px' }}>{fc.focus}</div>
                        <div style={{ fontSize: '0.78rem', color: 'rgba(248,250,252,0.55)', lineHeight: 1.5 }}>{fc.description}</div>
                      </div>
                    ))}
                  </div>
                </Table>
              </FocusCyclesHalf>
            </FocusCyclesRow>

            <Table>
              <ImprovementFocusStatsTableHeader>
                <thead><tr>
                  <th>Focus Concept</th><th>Win Rate</th><th>Very Good</th><th>Good</th><th>Okay</th><th>Bad</th>
                </tr></thead>
              </ImprovementFocusStatsTableHeader>
              <TableBodyWrapper style={{ maxHeight: '200px' }}>
                <ImprovementFocusStatsBodyTable $d={d}>
                  <tbody>
                    {MOCK_FOCUS_STATS.map(r => (
                      <tr key={r.concept}>
                        <td>{r.concept}</td><td>{r.winRate}</td><td>{r.veryGood}</td>
                        <td>{r.good}</td><td>{r.okay}</td><td>{r.bad}</td>
                      </tr>
                    ))}
                  </tbody>
                </ImprovementFocusStatsBodyTable>
              </TableBodyWrapper>
            </Table>
          </FocusCyclesSection>

        </>}

        {/* tour trigger */}
        {searched && !tourActive && (
          <TourStartBtn onClick={startTour}>◎ Reviewer Guide</TourStartBtn>
        )}

        {/* tour overlay */}
        {tourActive && (
          <TourOverlay $active>
            <TourDimmer $vis onClick={() => setTourActive(false)} />

            {bubblePos.spotRect && (
              <BubbleSpotlight style={{
                top:    bubblePos.spotRect.top,
                left:   bubblePos.spotRect.left,
                width:  bubblePos.spotRect.width,
                height: bubblePos.spotRect.height,
              }} />
            )}

            {(isCentered || bubblePos.top !== null) && (
              <Bubble style={isCentered
                ? { top:'50%', left:'50%', transform:'translate(-50%,-50%)' }
                : { top: bubblePos.top, left: bubblePos.left }
              }>
                <BubbleTail $dir={isCentered ? 'none' : bubblePos.tailDir} />
                <BubbleTitle>{step.title}</BubbleTitle>
                <BubbleText>{step.text}</BubbleText>
                <BubbleNav>
                  <BubbleStep>Step {tourStep + 1} of {TOUR_STEPS.length}</BubbleStep>
                  <BubbleBtnRow>
                    {tourStep > 0 && <BubbleBtn onClick={tourPrev}>← Back</BubbleBtn>}
                    <BubbleBtn onClick={tourNext}>{tourStep === TOUR_STEPS.length - 1 ? 'Close' : 'Next →'}</BubbleBtn>
                  </BubbleBtnRow>
                </BubbleNav>
              </Bubble>
            )}
          </TourOverlay>
        )}

        {/* disclaimer */}
        <Disclaimer>
          Jungle Improvement Log is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
        </Disclaimer>

      </Container>
    </GlobalLayout>
  )
}

export default App