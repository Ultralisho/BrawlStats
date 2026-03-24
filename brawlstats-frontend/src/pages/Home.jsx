import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';

const HOME_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');

.home-page, .home-page *, .home-page *::before, .home-page *::after {
  box-sizing: border-box;
}

.home-page {
  --bg-0: #0b1018;
  --bg-1: #121925;
  --bg-2: #1a2336;
  --line: rgba(148,163,184,0.10);
  --line-strong: rgba(148,163,184,0.16);
  --t-1: #eaf0fa;
  --t-2: #9bacc6;
  --t-3: #5d6f8a;
  --t-4: #3d4d68;
  --accent: #6aa6ff;
  --accent-soft: rgba(106,166,255,0.10);
  --accent-line: rgba(106,166,255,0.30);
  --link: #6aa6ff;
  --link-soft: rgba(106,166,255,0.10);
  --link-line: rgba(106,166,255,0.30);
  --pos: #5cc78f;
  --neg: #e26d6d;

  font-family: 'Inter', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  background: var(--bg-0);
  color: var(--t-1);
  min-height: 100vh;
  scroll-behavior: smooth;
}
.home-page a { text-decoration: none; color: inherit; }
.home-page button { font-family: inherit; cursor: pointer; border: none; background: none; color: inherit; }
.home-page .display { font-family: 'Syne', 'Inter', sans-serif; letter-spacing: -0.02em; }
.home-page .mono    { font-family: 'JetBrains Mono', monospace; }

/* Navbar */
.home-page .nav {
  position: sticky; top: 0; z-index: 50;
  background: color-mix(in oklab, var(--bg-0) 88%, transparent);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--line);
}
.home-page .nav-inner {
  max-width: 1240px; margin: 0 auto; height: 64px; padding: 0 32px;
  display: flex; align-items: center; justify-content: space-between;
}
.home-page .brand {
  display: flex; align-items: center; gap: 10px;
  font-family: 'Syne', sans-serif; font-weight: 800;
  font-size: 17px; letter-spacing: 0.02em; color: var(--t-1);
}
.home-page .brand-mark {
  width: 28px; height: 28px; border-radius: 8px;
  background: linear-gradient(135deg, var(--accent) 0%, color-mix(in oklab, var(--accent) 50%, var(--link)) 100%);
  display: grid; place-items: center;
  color: var(--bg-0); font-weight: 800; font-size: 14px;
}
.home-page .brand .b-2 { color: var(--accent); }
.home-page .nav-links { display: flex; gap: 28px; font-size: 14px; color: var(--t-2); }
.home-page .nav-links a { transition: color .15s; }
.home-page .nav-links a:hover { color: var(--t-1); }
.home-page .nav-cta { display: flex; align-items: center; gap: 14px; font-size: 14px; }
.home-page .nav-cta .nav-link-txt { color: var(--t-2); transition: color .15s; }
.home-page .nav-cta .nav-link-txt:hover { color: var(--t-1); }

.home-page .btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; border-radius: 8px;
  font-weight: 600; font-size: 13.5px; line-height: 1;
  transition: transform .12s ease, background .15s, border-color .15s, color .15s;
  border: 1px solid transparent;
  text-decoration: none;
}
.home-page .btn-primary { background: var(--accent); color: var(--bg-0); font-weight: 700; }
.home-page .btn-primary:hover { transform: translateY(-1px); background: color-mix(in oklab, var(--accent) 88%, white); }
.home-page .btn-ghost { color: var(--t-1); border-color: var(--line-strong); background: transparent; }
.home-page .btn-ghost:hover { background: var(--bg-1); border-color: var(--t-3); }

/* Hero */
.home-page .hero {
  position: relative; overflow: hidden;
  padding: 96px 32px 80px;
}
.home-page .hero-bg {
  position: absolute; inset: 0; pointer-events: none;
  background:
    radial-gradient(60% 50% at 18% 36%, color-mix(in oklab, var(--link) 30%, transparent), transparent 70%),
    radial-gradient(50% 40% at 82% 18%, color-mix(in oklab, var(--accent) 22%, transparent), transparent 70%);
  opacity: .55;
}
.home-page .hero-grid {
  position: absolute; inset: 0; pointer-events: none;
  background-image:
    linear-gradient(var(--line) 1px, transparent 1px),
    linear-gradient(90deg, var(--line) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: radial-gradient(70% 60% at 50% 30%, black, transparent 80%);
  opacity: .35;
}
.home-page .hero-inner {
  position: relative;
  max-width: 1240px; margin: 0 auto;
  display: grid; grid-template-columns: 1.1fr 1fr; gap: 56px;
  align-items: center;
}
.home-page .eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 6px 12px; border-radius: 999px;
  background: var(--accent-soft); border: 1px solid var(--accent-line);
  font-size: 11.5px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--accent);
}
.home-page .eyebrow .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 4px var(--accent-soft); }
.home-page .hero h1 {
  font-family: 'Syne', sans-serif; font-weight: 800;
  font-size: clamp(2.4rem, 4.6vw, 3.6rem);
  line-height: 1.05; letter-spacing: -0.025em;
  margin: 24px 0 20px;
  color: var(--t-1); text-wrap: balance;
}
.home-page .hero h1 em { font-style: normal; color: var(--accent); }
.home-page .hero p.lead {
  font-size: 17px; line-height: 1.55; color: var(--t-2);
  max-width: 520px; text-wrap: pretty;
}
.home-page .hero-cta { margin-top: 32px; display: flex; gap: 12px; flex-wrap: wrap; }
.home-page .hero-cta .btn { padding: 12px 22px; font-size: 14.5px; border-radius: 10px; }

/* Hero preview card */
.home-page .preview {
  background: var(--bg-1); border: 1px solid var(--line-strong);
  border-radius: 14px; padding: 20px;
  position: relative;
  box-shadow: 0 30px 60px -30px rgba(0,0,0,0.6);
}
.home-page .preview-bar { display: flex; align-items: center; gap: 6px; margin-bottom: 16px; }
.home-page .preview-bar .pdot { width: 9px; height: 9px; border-radius: 50%; background: var(--bg-2); }
.home-page .preview-bar .ptab { margin-left: auto; font-size: 11px; color: var(--t-3); letter-spacing: 0.08em; text-transform: uppercase; }
.home-page .preview-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
.home-page .pmini {
  background: var(--bg-2); border: 1px solid var(--line);
  border-radius: 10px; padding: 12px 14px;
}
.home-page .pmini-lbl { font-size: 10.5px; color: var(--t-3); letter-spacing: 0.08em; text-transform: uppercase; }
.home-page .pmini-val { font-family: 'JetBrains Mono', monospace; font-size: 22px; font-weight: 700; color: var(--t-1); margin-top: 4px; }
.home-page .pmini-delta { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--pos); margin-top: 2px; }
.home-page .pchart {
  height: 140px; background: var(--bg-2); border: 1px solid var(--line);
  border-radius: 10px; padding: 12px;
  display: flex; flex-direction: column;
  overflow: visible;
}
.home-page .pchart-head { display: flex; justify-content: space-between; font-size: 11px; color: var(--t-3); margin-bottom: 8px; letter-spacing: 0.06em; text-transform: uppercase; }
.home-page .pchart svg { width: 100%; flex: 1; overflow: visible; }

/* Stat strip */
.home-page .strip {
  border-top: 1px solid var(--line); border-bottom: 1px solid var(--line);
  background: var(--bg-1);
}
.home-page .strip-inner {
  max-width: 1240px; margin: 0 auto; padding: 28px 32px;
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px;
}
.home-page .stat { display: flex; flex-direction: column; gap: 4px; }
.home-page .stat-val { font-family: 'JetBrains Mono', monospace; font-size: 28px; font-weight: 700; color: var(--t-1); letter-spacing: -0.01em; line-height: 1; }
.home-page .stat-val .unit { color: var(--accent); font-weight: 700; margin-left: 2px; }
.home-page .stat-lbl { font-size: 11.5px; color: var(--t-3); letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; }

/* Section shell */
.home-page section.block {
  max-width: 1240px; margin: 0 auto;
  padding: 88px 32px 0;
}
.home-page .sec-head {
  display: flex; align-items: flex-end; justify-content: space-between;
  margin-bottom: 28px; gap: 24px;
}
.home-page .sec-head .sec-title {
  font-family: 'Syne', sans-serif; font-weight: 800;
  font-size: 26px; letter-spacing: -0.015em; color: var(--t-1);
}
.home-page .sec-head .sec-sub { font-size: 13.5px; color: var(--t-2); margin-top: 4px; }
.home-page .sec-head .sec-link {
  font-size: 13px; color: var(--link); font-weight: 600;
  display: inline-flex; gap: 4px; align-items: center;
}
.home-page .sec-link svg { width: 14px; height: 14px; }

/* Cards / Builds */
.home-page .grid-builds { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.home-page .card {
  background: var(--bg-1); border: 1px solid var(--line);
  border-radius: 12px; padding: 20px;
  transition: border-color .15s, transform .15s, box-shadow .15s;
}
.home-page .card:hover { border-color: var(--line-strong); transform: translateY(-2px); box-shadow: 0 16px 30px -20px rgba(0,0,0,0.6); }
.home-page .build-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
.home-page .build-name { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 17px; color: var(--t-1); }
.home-page .build-meta { font-size: 12px; color: var(--t-3); margin-top: 2px; }
.home-page .rating {
  font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 700;
  color: var(--accent); background: var(--accent-soft);
  border: 1px solid var(--accent-line);
  padding: 4px 10px; border-radius: 8px;
}
.home-page .sub-label { font-size: 10.5px; color: var(--t-4); letter-spacing: 0.10em; text-transform: uppercase; font-weight: 600; margin-bottom: 6px; }
.home-page .chip-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
.home-page .chip {
  font-size: 11.5px; padding: 4px 9px; border-radius: 6px;
  background: var(--bg-2); border: 1px solid var(--line);
  color: var(--t-2);
}
.home-page .chip-row:last-child { margin-bottom: 0; }

/* Events */
.home-page .grid-events { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.home-page .ev { position: relative; display: flex; flex-direction: column; gap: 14px; }
.home-page .ev-head { display: flex; align-items: center; gap: 12px; }
.home-page .ev-ico {
  width: 40px; height: 40px; border-radius: 10px;
  background: var(--bg-2); border: 1px solid var(--line);
  display: grid; place-items: center; color: var(--t-2);
}
.home-page .ev-ico svg { width: 18px; height: 18px; }
.home-page .ev-name { font-weight: 600; font-size: 14.5px; color: var(--t-1); }
.home-page .ev-map  { font-size: 12px; color: var(--t-3); margin-top: 1px; }
.home-page .ev-time-row { display: flex; align-items: center; justify-content: space-between; }
.home-page .ev-time-row .lbl { font-size: 11px; color: var(--t-4); letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; }
.home-page .ev-time-row .val { font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 600; color: var(--t-1); }
.home-page .pbar { height: 4px; border-radius: 4px; background: color-mix(in oklab, var(--t-1) 6%, transparent); overflow: hidden; }
.home-page .pbar > div { height: 100%; background: var(--accent); border-radius: 4px; }

/* Ranking + Brawlers */
.home-page .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
.home-page .rank-list { display: flex; flex-direction: column; }
.home-page .rank-row {
  display: grid; grid-template-columns: 36px 1fr auto;
  align-items: center; gap: 14px;
  padding: 14px 0;
  border-bottom: 1px solid var(--line);
}
.home-page .rank-row:last-of-type { border-bottom: none; }
.home-page .rank-num { font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 700; color: var(--t-3); text-align: center; }
.home-page .rank-row.top-1 .rank-num { color: var(--accent); font-size: 16px; }
.home-page .rank-row.top-2 .rank-num { color: var(--t-2); font-size: 15px; }
.home-page .rank-row.top-3 .rank-num { color: var(--t-2); font-size: 15px; }
.home-page .rank-name { font-weight: 600; font-size: 14px; color: var(--t-1); }
.home-page .rank-tag  { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--t-3); margin-top: 2px; }
.home-page .rank-trophies { font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 700; color: var(--accent); text-align: right; }
.home-page .rank-country  { font-size: 11px; color: var(--t-3); margin-top: 2px; text-align: right; }

.home-page .grid-brawl { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.home-page .brawl {
  background: var(--bg-1); border: 1px solid var(--line);
  border-radius: 10px; padding: 14px;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  transition: border-color .15s, transform .15s;
}
.home-page .brawl:hover { border-color: var(--line-strong); transform: translateY(-2px); }
.home-page .brawl-pic {
  width: 48px; height: 48px; border-radius: 10px;
  display: grid; place-items: center;
  font-family: 'Syne', sans-serif; font-weight: 800; font-size: 18px;
}
.home-page .brawl-name { font-weight: 600; font-size: 13px; color: var(--t-1); }
.home-page .brawl-tag {
  font-size: 10.5px; padding: 3px 9px; border-radius: 4px;
  letter-spacing: 0.06em; text-transform: capitalize; font-weight: 600;
}
.home-page .r-legendary { --r: 220, 160, 60; }
.home-page .r-mythic    { --r: 200, 110, 150; }
.home-page .r-epic      { --r: 140, 120, 200; }
.home-page .r-chromatic { --r: 220, 180, 80; }
.home-page .r-rare      { --r: 100, 160, 130; }
.home-page .r-common    { --r: 130, 140, 160; }
.home-page .brawl-pic { background: rgba(var(--r),0.10); border: 1px solid rgba(var(--r),0.30); color: rgb(var(--r)); }
.home-page .brawl-tag { background: rgba(var(--r),0.08); border: 1px solid rgba(var(--r),0.25); color: rgb(var(--r)); }

/* News */
.home-page .grid-news { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.home-page .news .cover {
  height: 130px; border-radius: 10px;
  background: linear-gradient(135deg, var(--bg-2) 0%, color-mix(in oklab, var(--bg-2) 80%, var(--accent)) 100%);
  border: 1px solid var(--line);
  margin-bottom: 14px;
  position: relative; overflow: hidden;
}
.home-page .news .cover .cover-mark {
  position: absolute; inset: 0;
  background-image:
    repeating-linear-gradient(45deg, transparent 0 14px, color-mix(in oklab, var(--bg-0) 50%, transparent) 14px 15px);
}
.home-page .news .cover .cover-tag {
  position: absolute; left: 12px; bottom: 12px;
  font-size: 10px; padding: 4px 9px; border-radius: 4px;
  font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  background: var(--bg-0); color: var(--t-1); border: 1px solid var(--line-strong);
}
.home-page .news .date  { font-size: 11.5px; color: var(--t-3); letter-spacing: 0.06em; text-transform: uppercase; font-weight: 600; }
.home-page .news h3 { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 16px; color: var(--t-1); line-height: 1.3; margin: 8px 0; text-wrap: balance; }
.home-page .news p { font-size: 13px; color: var(--t-2); line-height: 1.55; text-wrap: pretty; }

/* Footer */
.home-page footer.foot {
  margin-top: 96px; border-top: 1px solid var(--line);
  padding: 40px 32px; background: var(--bg-1);
}
.home-page .foot-inner {
  max-width: 1240px; margin: 0 auto;
  display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap;
  color: var(--t-3); font-size: 13px;
}
.home-page .foot-inner .foot-links { display: flex; gap: 20px; }
.home-page .foot-inner .foot-links a:hover { color: var(--t-1); }

/* Responsive */
@media (max-width: 960px) {
  .home-page .hero-inner { grid-template-columns: 1fr; gap: 40px; }
  .home-page .grid-builds, .home-page .grid-events, .home-page .grid-news { grid-template-columns: 1fr 1fr; }
  .home-page .grid-2 { grid-template-columns: 1fr; }
  .home-page .strip-inner { grid-template-columns: 1fr 1fr; gap: 28px; }
}
@media (max-width: 640px) {
  .home-page .nav-links { display: none; }
  .home-page .grid-builds, .home-page .grid-events, .home-page .grid-news { grid-template-columns: 1fr; }
  .home-page section.block { padding: 64px 20px 0; }
  .home-page .hero { padding: 56px 20px 48px; }
  .home-page .strip-inner { grid-template-columns: 1fr 1fr; padding: 20px; }
}
`;

const I = {
  arrow: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>),
  gem:   (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" {...p}><path d="M6 3h12l3 6-9 12L3 9z"/><path d="M3 9h18"/><path d="M9 3l-3 6 6 12 6-12-3-6"/></svg>),
  ball:  (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4"/></svg>),
  flame: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" {...p}><path d="M12 2c2 4 5 6 5 10a5 5 0 1 1-10 0c0-2 1-4 3-5-1 3 1 4 2 4 0-3-1-5 0-9z"/></svg>),
  star:  (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" {...p}><polygon points="12 2 15 8.6 22 9.5 17 14.3 18.2 21.4 12 18 5.8 21.4 7 14.3 2 9.5 9 8.6 12 2"/></svg>),
  bolt:  (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" {...p}><polygon points="13 2 4 14 11 14 10 22 20 10 13 10 13 2"/></svg>),
  skull: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" {...p}><path d="M12 2a8 8 0 0 0-8 8c0 3 1.5 5 3 6v3a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-3c1.5-1 3-3 3-6a8 8 0 0 0-8-8z"/><circle cx="9" cy="11" r="1.4" fill="currentColor"/><circle cx="15" cy="11" r="1.4" fill="currentColor"/></svg>),
};

const BUILDS = [
  { brawler:'Leon',  role:'Asesino',     mode:'Gem Grab',   stars:['Invisiheal','Clone Projector'],  gears:['Speed','Shield'],        rating:9.2 },
  { brawler:'Sandy', role:'Controlador', mode:'Hot Zone',   stars:['Rogue Winds','Healing Winds'],   gears:['Speed','Gadget Charge'], rating:8.8 },
  { brawler:'Spike', role:'Asesino',     mode:'Gem Grab',   stars:['Fertilize','Curveball'],         gears:['Shield','Damage'],       rating:9.0 },
  { brawler:'Amber', role:'Controlador', mode:'Showdown',   stars:['Scorchin Siphon','Ignite'],      gears:['Speed','Shield'],        rating:8.5 },
  { brawler:'Crow',  role:'Asesino',     mode:'Knockout',   stars:['Extra Toxic','Defense Booster'], gears:['Gadget Charge','Speed'], rating:8.3 },
  { brawler:'Meg',   role:'Tank',        mode:'Brawl Ball', stars:['Force Field','Jolting Volts'],   gears:['Shield','Damage'],       rating:8.0 },
];

const MODE_ICO_KEY = {
  'Gem Grab':'gem', 'Brawl Ball':'ball', 'Hot Zone':'flame',
  'Showdown':'skull', 'Solo Showdown':'skull', 'Duo Showdown':'skull',
  'Knockout':'bolt', 'Bounty':'star', 'Heist':'bolt', 'Duels':'bolt',
  'Wipeout':'star', 'Basket Brawl':'ball', 'Volley Brawl':'ball',
  'Hold The Trophy':'star', 'Bot Drop':'skull', 'Siege':'bolt',
};

const RANKING = [
  { rank:1, name:'Eloxitaa',    tag:'#LP2PPU', trophies:266174, country:'ES' },
  { rank:2, name:'prostislavv', tag:'#ROST22', trophies:239652, country:'RU' },
  { rank:3, name:'Netty',       tag:'#YETI01', trophies:233709, country:'US' },
  { rank:4, name:'Ties',        tag:'#YETI02', trophies:232392, country:'CN' },
  { rank:5, name:'SpeedRun_CN', tag:'#FAST99', trophies:229100, country:'CN' },
];

const BRAWLERS = [
  { name:'Meeple',  rarity:'chromatic' },
  { name:'Juju',    rarity:'legendary' },
  { name:'Melodie', rarity:'legendary' },
  { name:'Angelo',  rarity:'epic' },
  { name:'Willow',  rarity:'mythic' },
  { name:'Charlie', rarity:'epic' },
];

const NEWS = [
  { title:'Cambios en el meta de la nueva temporada', date:'13 MAY 2026', cat:'Meta',    excerpt:'Los brawlers más afectados por los últimos balances y cómo adaptarte.' },
  { title:'Guía completa de Leon en ranked',          date:'12 MAY 2026', cat:'Guía',    excerpt:'Todo lo que necesitas para dominar con Leon en la temporada 32.' },
  { title:'Meeple llega al juego: análisis completo', date:'10 MAY 2026', cat:'Novedad', excerpt:'Stats, mejores builds y posición provisional en el tier list.' },
];

const STATS = [
  { val:'12.8K', lbl:'jugadores activos' },
  { val:'4.2',   lbl:'partidas analizadas', unit:'M' },
  { val:'102',   lbl:'brawlers en base' },
  { val:'99.9',  lbl:'uptime', unit:'%' },
];

function fmtTime(s) {
  const h = Math.floor(s/3600);
  const m = Math.floor((s%3600)/60);
  return h > 0 ? `${h}h ${String(m).padStart(2,'0')}m` : `${m}m`;
}

function Counter({ to, decimals = 0, prefix = '', suffix = '', duration = 1400 }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(to * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  const num = decimals > 0
    ? val.toFixed(decimals)
    : Math.round(val).toLocaleString('es-ES').replace(/,/g, ' ');
  return <span>{prefix}{num}{suffix}</span>;
}

function AnimatedSparkline() {
  const W = 360, H = 80, N = 22;
  const seed = useMemo(() => {
    const a = []; let v = 14;
    for (let i = 0; i < N; i++) {
      v += (Math.random() - 0.35) * 4;
      v = Math.max(4, Math.min(46, v));
      a.push(v);
    }
    return a;
  }, []);
  const [data, setData] = useState(seed);
  const pathRef = useRef(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setData(prev => {
        const last = prev[prev.length - 1];
        let next = last + (Math.random() - 0.3) * 6;
        next = Math.max(4, Math.min(46, next));
        return [...prev.slice(1), next];
      });
    }, 1600);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!pathRef.current) return;
    const len = pathRef.current.getTotalLength();
    pathRef.current.style.transition = 'none';
    pathRef.current.style.strokeDasharray = `${len}`;
    pathRef.current.style.strokeDashoffset = `${len}`;
    pathRef.current.getBoundingClientRect();
    pathRef.current.style.transition = 'stroke-dashoffset 1.6s cubic-bezier(.4,0,.2,1)';
    pathRef.current.style.strokeDashoffset = '0';
    const t = setTimeout(() => setDrawn(true), 1700);
    return () => clearTimeout(t);
  }, []);

  const maxY = Math.max(...data);
  const minY = Math.min(...data);
  const range = Math.max(8, maxY - minY);
  const yOf = v => H - ((v - minY) / range) * (H * 0.78) - 6;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * W, yOf(v)]);
  const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
  const area = d + ` L ${W} ${H} L 0 ${H} Z`;
  const [tipX, tipY] = pts[pts.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ overflow:'visible' }}>
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.42"/>
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0"/>
        </linearGradient>
        <filter id="sparkGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <path d={area} fill="url(#sparkGrad)" style={{
        transition: drawn ? 'd 0.9s cubic-bezier(.4,0,.2,1)' : 'none',
        opacity: drawn ? 1 : 0,
      }}/>
      <path ref={pathRef} d={d} fill="none" stroke="var(--accent)" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round"
        filter="url(#sparkGlow)"
        style={drawn ? { transition: 'd 0.9s cubic-bezier(.4,0,.2,1)' } : null}/>
      {drawn && (
        <g style={{ transition: 'transform 0.9s cubic-bezier(.4,0,.2,1)', transform: `translate(${tipX.toFixed(2)}px, ${tipY.toFixed(2)}px)` }}>
          <circle r="9" fill="var(--accent)" opacity="0.18">
            <animate attributeName="r" values="4;11;4" dur="1.8s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.30;0.0;0.30" dur="1.8s" repeatCount="indefinite"/>
          </circle>
          <circle r="3.2" fill="var(--accent)"/>
          <circle r="1.4" fill="var(--bg-1)"/>
        </g>
      )}
    </svg>
  );
}

function Nav({ user }) {
  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link to="/" className="brand">
          <span className="brand-mark">B</span>
          <span>BRAWL<span className="b-2">STATS</span></span>
        </Link>
        <div className="nav-links">
          <a href="#builds">Builds</a>
          <a href="#eventos">Eventos</a>
          <a href="#ranking">Ranking</a>
          <a href="#noticias">Noticias</a>
        </div>
        <div className="nav-cta">
          {user && (
            <Link to="/dashboard" className="btn btn-ghost">Dashboard <I.arrow style={{width:14, height:14}}/></Link>
          )}
          <Link to="/login" className="nav-link-txt">Iniciar sesión</Link>
          <Link to="/register" className="btn btn-primary">Crear cuenta</Link>
        </div>
      </div>
    </nav>
  );
}

function HeroPreview() {
  return (
    <div className="preview" aria-hidden="true">
      <div className="preview-bar">
        <span className="pdot"></span><span className="pdot"></span><span className="pdot"></span>
        <span className="ptab">Tu Dashboard</span>
      </div>
      <div className="preview-stats">
        <div className="pmini">
          <div className="pmini-lbl">Trofeos</div>
          <div className="pmini-val"><Counter to={48320}/></div>
          <div className="pmini-delta">▲ <Counter to={1240}/> esta semana</div>
        </div>
        <div className="pmini">
          <div className="pmini-lbl">Winrate 7d</div>
          <div className="pmini-val"><Counter to={63.4} decimals={1} suffix="%"/></div>
          <div className="pmini-delta">▲ +<Counter to={2.1} decimals={1}/> pts</div>
        </div>
      </div>
      <div className="pchart">
        <div className="pchart-head">
          <span>Trofeos · últimos 30d</span>
          <span className="mono" style={{ color:'var(--pos)' }}>+2 340 ▲</span>
        </div>
        <AnimatedSparkline/>
      </div>
    </div>
  );
}

function Hero({ user }) {
  return (
    <header className="hero">
      <div className="hero-bg"/>
      <div className="hero-grid"/>
      <div className="hero-inner">
        <div>
          <span className="eyebrow"><span className="dot"></span>Temporada 32 activa</span>
          <h1 className="display">
            La comunidad <em>fan</em> de Brawl Stars, con datos que de verdad importan
          </h1>
          <p className="lead">
            Builds optimizadas, eventos en tiempo real, rankings globales y tus estadísticas personales — todo en un sitio limpio, sin distracciones.
          </p>
          <div className="hero-cta">
            {user ? (
              <Link to="/dashboard" className="btn btn-primary">Ir al dashboard <I.arrow style={{width:14, height:14}}/></Link>
            ) : (
              <Link to="/register" className="btn btn-primary">Crear cuenta gratis <I.arrow style={{width:14, height:14}}/></Link>
            )}
            <a href="#builds" className="btn btn-ghost">Ver builds destacados</a>
          </div>
        </div>
        <HeroPreview/>
      </div>
    </header>
  );
}

function StatStrip() {
  return (
    <div className="strip">
      <div className="strip-inner">
        {STATS.map((s,i) => (
          <div className="stat" key={i}>
            <div className="stat-val mono">
              {s.val}{s.unit && <span className="unit">{s.unit}</span>}
            </div>
            <div className="stat-lbl">{s.lbl}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionHead({ title, sub, link }) {
  return (
    <div className="sec-head">
      <div>
        <div className="sec-title">{title}</div>
        {sub && <div className="sec-sub">{sub}</div>}
      </div>
      {link && (
        <a href={link.href} className="sec-link">
          {link.label} <I.arrow/>
        </a>
      )}
    </div>
  );
}

function Builds() {
  return (
    <section className="block" id="builds">
      <SectionHead
        title="Builds destacados"
        sub="Las configuraciones mejor valoradas por la comunidad esta semana"
        link={{ label: 'Ver todos', href: '#' }}
      />
      <div className="grid-builds">
        {BUILDS.map(b => (
          <article className="card" key={b.brawler}>
            <div className="build-head">
              <div>
                <div className="build-name">{b.brawler}</div>
                <div className="build-meta">{b.role} · {b.mode}</div>
              </div>
              <div className="rating mono">{b.rating}</div>
            </div>
            <div className="sub-label">Star Powers</div>
            <div className="chip-row">
              {b.stars.map(s => <span className="chip" key={s}>{s}</span>)}
            </div>
            <div className="sub-label">Gears</div>
            <div className="chip-row">
              {b.gears.map(g => <span className="chip" key={g}>{g}</span>)}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function EventIcon({ src, modeName }) {
  const [failed, setFailed] = useState(false);
  const Ico = I[MODE_ICO_KEY[modeName]] || I.star;
  if (failed || !src) {
    return <div className="ev-ico"><Ico/></div>;
  }
  return (
    <img
      src={src}
      alt={modeName}
      width={40}
      height={40}
      loading="lazy"
      onError={() => setFailed(true)}
      style={{ width:40, height:40, borderRadius:10, objectFit:'cover', border:'1px solid var(--line)', background:'var(--bg-2)' }}
    />
  );
}

function Events() {
  const [events, setEvents] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    fetch('/api/brawlapi/events')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!alive || !data) return;
        const active = Array.isArray(data.active) ? data.active : [];
        setEvents(active.slice(0, 6));
      })
      .catch(() => { /* mantener lista vacía → fallback al icono */ })
      .finally(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="block" id="eventos">
      <SectionHead
        title="Eventos actuales"
        sub="Rotación en tiempo real · sincronizado con la API"
        link={{ label: 'Ver mapas', href: '/mapas' }}
      />
      <div className="grid-events">
        {!loaded && events.length === 0 && (
          <p style={{ color:'var(--t-3)', gridColumn:'1/-1', textAlign:'center', padding:'1rem' }}>
            Cargando eventos...
          </p>
        )}
        {loaded && events.length === 0 && (
          <p style={{ color:'var(--t-3)', gridColumn:'1/-1', textAlign:'center', padding:'1rem' }}>
            No hay eventos disponibles en este momento.
          </p>
        )}
        {events.map((ev, i) => {
          const mode    = ev.map?.gameMode?.name || 'Evento';
          const mapName = ev.map?.name || '—';
          const img     = ev.map?.imageUrl || null;
          const start   = ev.startTime ? new Date(ev.startTime).getTime() : null;
          const end     = ev.endTime   ? new Date(ev.endTime).getTime()   : null;
          const totalSec= start && end ? Math.max(1, Math.floor((end - start)/1000)) : 0;
          const leftSec = end ? Math.max(0, Math.floor((end - now)/1000)) : 0;
          const pct     = totalSec ? Math.max(0, Math.min(100, (leftSec / totalSec) * 100)) : 0;
          return (
            <article className="card ev" key={ev.slot?.id ?? i}>
              <div className="ev-head">
                <EventIcon src={img} modeName={mode} />
                <div>
                  <div className="ev-name">{mode}</div>
                  <div className="ev-map">{mapName}</div>
                </div>
              </div>
              <div>
                <div className="ev-time-row">
                  <span className="lbl">Tiempo restante</span>
                  <span className="val">{end ? fmtTime(leftSec) : '—'}</span>
                </div>
                <div className="pbar" style={{ marginTop: 8 }}>
                  <div style={{ width: pct + '%' }}/>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Ranking() {
  return (
    <section className="block" id="ranking">
      <div className="grid-2">
        <div>
          <SectionHead
            title="Top jugadores globales"
            sub="Ranking mundial en tiempo real"
            link={{ label: 'Leaderboard completo', href: '#' }}
          />
          <div className="card">
            <div className="rank-list">
              {RANKING.map(p => (
                <div className={`rank-row top-${p.rank}`} key={p.rank}>
                  <div className="rank-num">{String(p.rank).padStart(2,'0')}</div>
                  <div>
                    <div className="rank-name">{p.name}</div>
                    <div className="rank-tag">{p.tag}</div>
                  </div>
                  <div>
                    <div className="rank-trophies">{p.trophies.toLocaleString('es-ES')}</div>
                    <div className="rank-country">{p.country}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div>
          <SectionHead
            title="Brawlers recientes"
            sub="Últimos añadidos a la base de datos"
            link={{ label: 'Ver todos', href: '#' }}
          />
          <div className="grid-brawl">
            {BRAWLERS.map(b => (
              <div className={`brawl r-${b.rarity}`} key={b.name}>
                <div className="brawl-pic">{b.name[0]}</div>
                <div className="brawl-name">{b.name}</div>
                <div className="brawl-tag">{b.rarity}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function News() {
  return (
    <section className="block" id="noticias">
      <SectionHead
        title="Noticias y guías"
        sub="Análisis, novedades y guías escritas por la comunidad"
        link={{ label: 'Todo el blog', href: '#' }}
      />
      <div className="grid-news">
        {NEWS.map((n, i) => (
          <article className="card news" key={i}>
            <div className="cover">
              <div className="cover-mark"/>
              <span className="cover-tag">{n.cat}</span>
            </div>
            <div className="date">{n.date}</div>
            <h3>{n.title}</h3>
            <p>{n.excerpt}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Foot() {
  return (
    <footer className="foot">
      <div className="foot-inner">
        <div>
          <span style={{ fontFamily:'Syne', fontWeight: 800, color:'var(--t-1)' }}>
            BRAWL<span style={{ color:'var(--accent)' }}>STATS</span>
          </span>
          <span style={{ marginLeft: 12 }}>Fan-site no oficial · No afiliado con Supercell</span>
        </div>
        <div className="foot-links">
          <Link to="/login">Login</Link>
          <Link to="/register">Registro</Link>
          <a href="#">API</a>
          <a href="#">Privacidad</a>
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  const { user } = useAuth();
  return (
    <div className="home-page">
      <style>{HOME_CSS}</style>
      <Nav user={user}/>
      <Hero user={user}/>
      <StatStrip/>
      <Builds/>
      <Events/>
      <Ranking/>
      <News/>
      <Foot/>
    </div>
  );
}
