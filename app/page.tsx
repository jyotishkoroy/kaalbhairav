/**
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import Link from 'next/link'

const BRAND = {
  name: "TARAYAI",
  subtitle: "VEDIC ASTROLOGY",
};

const ROUTES = {
  home: "/",
  chart: "/astro",
  insights: "/news",
  contact: "/settings",
  kundali: "/astro",
  dailyPanchang: "/astro",
  askTheGuru: "/astro",
  compatibility: "/astro",
  remedies: "/still",
  askAnything: "/astro",
} as const;

const TOP_NAV = [
  { label: "CHART", href: ROUTES.chart },
  { label: "INSIGHTS", href: ROUTES.insights },
  { label: "CONTACT", href: ROUTES.contact },
] as const;

const SEEKING_ITEMS = [
  { label: "KUNDALI", href: ROUTES.kundali },
  { label: "DAILY PANCHANG", href: ROUTES.dailyPanchang },
  { label: "ASK THE GURU", href: ROUTES.askTheGuru },
  { label: "COMPATIBILITY", href: ROUTES.compatibility },
  { label: "REMEDIES", href: ROUTES.remedies },
] as const;

const HERO = {
  label: "TARAYAI ASTROLOGY",
  lines: ["DISCOVER", "YOUR", "INNER SKY"],
  prompt: "ASK ME ANYTHING...",
};

const ORBS = [
  { left: "6%", top: "22%", size: 2, delay: "0s", duration: "11s" },
  { left: "12%", top: "68%", size: 3, delay: "-2s", duration: "13s" },
  { left: "18%", top: "48%", size: 2, delay: "-7s", duration: "14s" },
  { left: "25%", top: "76%", size: 4, delay: "-1s", duration: "17s" },
  { left: "31%", top: "28%", size: 2, delay: "-5s", duration: "12s" },
  { left: "39%", top: "16%", size: 3, delay: "-3s", duration: "16s" },
  { left: "46%", top: "82%", size: 2, delay: "-9s", duration: "15s" },
  { left: "54%", top: "20%", size: 4, delay: "-4s", duration: "18s" },
  { left: "62%", top: "70%", size: 2, delay: "-8s", duration: "13s" },
  { left: "70%", top: "34%", size: 3, delay: "-6s", duration: "16s" },
  { left: "78%", top: "78%", size: 2, delay: "-10s", duration: "12s" },
  { left: "85%", top: "28%", size: 4, delay: "-2s", duration: "19s" },
  { left: "91%", top: "56%", size: 2, delay: "-11s", duration: "15s" },
  { left: "96%", top: "42%", size: 3, delay: "-5s", duration: "14s" },
] as const;

const ASTRO_WHEEL_RAYS = Array.from({ length: 12 }, (_, index) => index * 30);

function AstrologyWheel() {
  return (
    <svg
      className="astro-wheel"
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 520 520"
    >
      <circle cx="260" cy="260" r="228" />
      <circle cx="260" cy="260" r="184" />
      <circle cx="260" cy="260" r="112" />
      <circle cx="260" cy="260" r="44" />

      {ASTRO_WHEEL_RAYS.map((angle) => {
        return (
          <line
            key={`ray-${angle}`}
            x1="260"
            y1="76"
            x2="260"
            y2="118"
            transform={`rotate(${angle} 260 260)`}
          />
        );
      })}

      <path d="M260 64L365 416L90 170H430L155 416L260 64Z" />
      <path d="M260 112L390 342H130L260 112Z" />
      <path d="M260 408L130 178H390L260 408Z" />
      <path d="M166 166H354L448 260L354 354H166L72 260L166 166Z" />
      <path d="M210 188H310L366 260L310 332H210L154 260L210 188Z" />

      <circle className="astro-dot" cx="372" cy="162" r="5" />
      <circle className="astro-dot dim" cx="148" cy="348" r="3" />
      <circle className="astro-dot dim" cx="398" cy="314" r="3" />
      </svg>
  );
}

function ParticleField() {
  return (
    <div className="particle-field" aria-hidden="true">
      {ORBS.map((orb, index) => (
        <span
          key={`orb-${index}`}
          className="orb"
          style={{
            left: orb.left,
            top: orb.top,
            width: `${orb.size}px`,
            height: `${orb.size}px`,
            animationDelay: orb.delay,
            animationDuration: orb.duration,
          }}
        />
      ))}

      <span className="dust dust-one" />
      <span className="dust dust-two" />
      <span className="dust dust-three" />
    </div>
  );
}

function GlassPanels() {
  return (
    <div className="glass-panels" aria-hidden="true">
      <div className="glass-panel panel-one">
        <span />
      </div>
      <div className="glass-panel panel-two">
        <span />
      </div>
      <div className="glass-panel panel-three">
        <span />
      </div>
    </div>
  );
}

function TopNav() {
  return (
    <nav className="top-nav" aria-label="Primary navigation">
      {TOP_NAV.map((item, index) => (
        <Link key={item.href} href={item.href}>
          {item.label}
          {index === 0 ? <span className="nav-divider" aria-hidden="true" /> : null}
        </Link>
      ))}
    </nav>
  );
}

function SeekingMenu() {
  return (
    <aside className="seeking-menu" aria-label="Astrology sections">
      <p className="menu-question">WHAT ARE YOU SEEKING?</p>

      <nav className="menu-links" aria-label="Homepage astrology links">
        {SEEKING_ITEMS.map((item) => (
          <Link key={item.href} href={item.href}>
            <span aria-hidden="true">-&gt;</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <Link className="ask-pill" href={ROUTES.askAnything}>
        {HERO.prompt}
      </Link>
    </aside>
  );
}

function BrandMark() {
  return (
    <header className="brand-mark">
      <Link href={ROUTES.home} aria-label="Tarayai home">
        {BRAND.name}
      </Link>
      <p>{BRAND.subtitle}</p>
    </header>
  );
}

function HeroCard() {
  return (
    <section className="hero-stage" aria-labelledby="hero-title">
      <div className="spine top-spine" aria-hidden="true">
        <div />
      </div>

      <div className="hero-card">
        <div className="card-glow" aria-hidden="true" />
        <AstrologyWheel />

        <div className="hero-copy">
          <p>{HERO.label}</p>
          <h1 id="hero-title">
            {HERO.lines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </h1>
        </div>
      </div>

      <div className="spine bottom-spine" aria-hidden="true">
        <div />
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <main className="tarayai-home">
      <style>{`
        .tarayai-home {
          --bg: #000000;
          --text: #f5f2ec;
          --muted: rgba(245, 242, 236, 0.62);
          --dim: rgba(245, 242, 236, 0.38);
          --line: rgba(245, 242, 236, 0.18);
          --violet: #a88cff;
          --violet-soft: rgba(168, 140, 255, 0.58);
          --amber: #ff9d2e;
          --amber-soft: rgba(255, 157, 46, 0.35);
          --blue-glass: rgba(17, 29, 42, 0.56);
          --panel: rgba(7, 12, 17, 0.72);

          position: relative;
          min-height: 100svh;
          width: 100%;
          overflow: hidden;
          background:
            radial-gradient(circle at 48% 48%, rgba(82, 52, 139, 0.16), transparent 28%),
            radial-gradient(circle at 72% 70%, rgba(255, 92, 28, 0.08), transparent 24%),
            radial-gradient(circle at 22% 78%, rgba(128, 78, 255, 0.12), transparent 22%),
            #000000;
          color: var(--text);
          isolation: isolate;
          font-family: ui-monospace, "SFMono-Regular", "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        }

        .tarayai-home *,
        .tarayai-home *::before,
        .tarayai-home *::after {
          box-sizing: border-box;
        }

        .tarayai-home a {
          color: inherit;
          text-decoration: none;
        }

        .tarayai-home a:focus-visible {
          outline: 1px solid rgba(245, 242, 236, 0.9);
          outline-offset: 5px;
          border-radius: 999px;
        }

        .tarayai-home::before {
          content: "";
          position: absolute;
          inset: -20%;
          z-index: -3;
          background:
            linear-gradient(112deg, transparent 0%, rgba(97, 54, 180, 0.08) 42%, rgba(255, 74, 20, 0.06) 54%, transparent 72%),
            radial-gradient(circle at 30% 64%, rgba(136, 70, 255, 0.18), transparent 20%),
            radial-gradient(circle at 66% 34%, rgba(180, 137, 255, 0.12), transparent 19%);
          filter: blur(4px);
          animation: deepBreath 11s ease-in-out infinite alternate;
        }

        .tarayai-home::after {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          background:
            linear-gradient(to bottom, rgba(0, 0, 0, 0.2), transparent 30%, rgba(0, 0, 0, 0.55)),
            repeating-linear-gradient(
              to bottom,
              rgba(255, 255, 255, 0.018) 0,
              rgba(255, 255, 255, 0.018) 1px,
              transparent 1px,
              transparent 6px
            );
          opacity: 0.42;
          pointer-events: none;
        }

        .brand-mark {
          position: absolute;
          top: clamp(28px, 5vw, 72px);
          left: clamp(22px, 4.2vw, 78px);
          z-index: 10;
        }

        .brand-mark a {
          display: inline-block;
          color: var(--text);
          font-size: clamp(2.7rem, 5.5vw, 5.7rem);
          line-height: 0.82;
          letter-spacing: 0.055em;
          font-weight: 800;
          text-shadow:
            0 0 12px rgba(255, 255, 255, 0.16),
            0 0 1px rgba(255, 255, 255, 0.9);
          filter: drop-shadow(0 10px 26px rgba(0, 0, 0, 0.8));
        }

        .brand-mark p {
          margin: 18px 0 0;
          color: rgba(245, 242, 236, 0.56);
          font-size: clamp(0.76rem, 1.2vw, 1.05rem);
          letter-spacing: 0.58em;
          white-space: nowrap;
        }

        .top-nav {
          position: absolute;
          top: clamp(30px, 5vw, 68px);
          right: clamp(22px, 4.3vw, 78px);
          z-index: 11;
          min-height: 58px;
          display: inline-flex;
          align-items: center;
          gap: clamp(16px, 2vw, 32px);
          padding: 0 24px;
          border: 1px solid rgba(245, 242, 236, 0.34);
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.34);
          box-shadow:
            inset 0 0 18px rgba(255, 255, 255, 0.025),
            0 28px 52px rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(16px);
        }

        .top-nav a {
          position: relative;
          min-height: 56px;
          display: inline-flex;
          align-items: center;
          color: rgba(245, 242, 236, 0.84);
          font-size: clamp(0.8rem, 1vw, 1.08rem);
          letter-spacing: 0.06em;
          transition: color 180ms ease, transform 180ms ease;
        }

        .top-nav a:hover {
          color: #ffffff;
          transform: translateY(-1px);
        }

        .nav-divider {
          position: absolute;
          left: calc(100% + clamp(10px, 1.25vw, 18px));
          top: 50%;
          width: clamp(38px, 4vw, 72px);
          height: 10px;
          transform: translateY(-50%);
          background:
            radial-gradient(ellipse at 20% 50%, rgba(245, 242, 236, 0.85), transparent 42%),
            radial-gradient(ellipse at 80% 50%, rgba(245, 242, 236, 0.7), transparent 44%);
          opacity: 0.64;
          filter: blur(0.2px);
        }

        .seeking-menu {
          position: absolute;
          left: clamp(22px, 4.1vw, 78px);
          top: 55%;
          z-index: 8;
          width: min(280px, 32vw);
          transform: translateY(-16%);
        }

        .menu-question {
          margin: 0 0 24px;
          color: rgba(245, 242, 236, 0.96);
          font-size: clamp(0.9rem, 1.25vw, 1.18rem);
          line-height: 1.2;
          letter-spacing: 0.04em;
        }

        .menu-links {
          display: grid;
          gap: 22px;
        }

        .menu-links a {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          width: max-content;
          max-width: 100%;
          color: rgba(184, 161, 255, 0.82);
          font-size: clamp(0.88rem, 1.25vw, 1.13rem);
          letter-spacing: 0.015em;
          text-shadow: 0 0 16px rgba(168, 140, 255, 0.18);
          transition: transform 180ms ease, color 180ms ease, text-shadow 180ms ease;
        }

        .menu-links a:hover {
          color: rgba(245, 242, 236, 0.96);
          transform: translateX(7px);
          text-shadow: 0 0 22px rgba(168, 140, 255, 0.34);
        }

        .ask-pill {
          margin-top: 54px;
          min-width: 250px;
          min-height: 64px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(168, 140, 255, 0.32);
          border-radius: 999px;
          color: rgba(195, 174, 255, 0.82);
          background:
            radial-gradient(circle at 30% 20%, rgba(168, 140, 255, 0.12), transparent 42%),
            rgba(4, 2, 11, 0.42);
          box-shadow:
            inset 0 0 28px rgba(168, 140, 255, 0.05),
            0 0 28px rgba(168, 140, 255, 0.07);
          font-size: clamp(0.88rem, 1.15vw, 1.06rem);
          letter-spacing: 0.04em;
          transition: border-color 180ms ease, color 180ms ease, transform 180ms ease, box-shadow 180ms ease;
        }

        .ask-pill:hover {
          color: #fff;
          border-color: rgba(245, 242, 236, 0.5);
          transform: translateY(-2px);
          box-shadow:
            inset 0 0 28px rgba(168, 140, 255, 0.08),
            0 0 34px rgba(168, 140, 255, 0.14);
        }

        .hero-stage {
          position: absolute;
          left: 50%;
          top: 52%;
          z-index: 7;
          width: min(760px, 48vw);
          min-height: min(540px, 56vw);
          transform: translate(-46%, -47%);
          display: grid;
          place-items: center;
          perspective: 1300px;
        }

        .hero-card {
          position: relative;
          width: min(760px, 100%);
          aspect-ratio: 1.72 / 1;
          display: grid;
          place-items: center;
          overflow: hidden;
          border: 1px solid rgba(145, 183, 210, 0.18);
          border-radius: clamp(28px, 3vw, 52px);
          background:
            linear-gradient(148deg, rgba(255, 255, 255, 0.12), transparent 18%),
            radial-gradient(circle at 65% 32%, rgba(168, 140, 255, 0.14), transparent 38%),
            radial-gradient(circle at 44% 76%, rgba(255, 93, 28, 0.1), transparent 40%),
            linear-gradient(135deg, rgba(12, 21, 31, 0.86), rgba(4, 8, 13, 0.76));
          box-shadow:
            inset 0 0 80px rgba(255, 255, 255, 0.04),
            inset 0 0 1px rgba(255, 255, 255, 0.38),
            0 42px 120px rgba(0, 0, 0, 0.84),
            0 0 48px rgba(75, 124, 180, 0.08);
          backdrop-filter: blur(22px);
          transform-style: preserve-3d;
          animation: cardFloat 7s ease-in-out infinite;
        }

        .hero-card::before {
          content: "";
          position: absolute;
          inset: -1px;
          background:
            linear-gradient(105deg, transparent 0%, rgba(255, 255, 255, 0.15) 16%, transparent 31%),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.08), transparent 42%, rgba(0, 0, 0, 0.42));
          mix-blend-mode: screen;
          opacity: 0.62;
          pointer-events: none;
        }

        .hero-card::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 22% 44%, rgba(255, 255, 255, 0.06), transparent 16%),
            radial-gradient(circle at 70% 70%, rgba(168, 140, 255, 0.08), transparent 28%),
            repeating-linear-gradient(
              112deg,
              transparent 0,
              transparent 12px,
              rgba(255, 255, 255, 0.018) 13px,
              transparent 18px
            );
          opacity: 0.78;
          pointer-events: none;
        }

        .card-glow {
          position: absolute;
          inset: 10%;
          background:
            radial-gradient(circle at 50% 50%, rgba(168, 140, 255, 0.2), transparent 38%),
            radial-gradient(circle at 48% 52%, rgba(255, 157, 46, 0.1), transparent 46%);
          filter: blur(24px);
          opacity: 0.62;
          animation: glowPulse 5.8s ease-in-out infinite alternate;
        }

        .astro-wheel {
          position: absolute;
          width: min(430px, 70%);
          height: min(430px, 70%);
          opacity: 0.38;
          filter:
            drop-shadow(0 0 12px rgba(168, 140, 255, 0.22))
            drop-shadow(0 0 24px rgba(255, 157, 46, 0.08));
          animation: wheelTurn 38s linear infinite;
        }

        .astro-wheel circle,
        .astro-wheel line,
        .astro-wheel path {
          fill: none;
          stroke: rgba(216, 185, 255, 0.56);
          stroke-width: 1.25;
          vector-effect: non-scaling-stroke;
        }

        .astro-wheel .astro-dot {
          fill: rgba(255, 255, 255, 0.95);
          stroke: none;
        }

        .astro-wheel .astro-dot.dim {
          fill: rgba(255, 157, 46, 0.66);
        }

        .hero-copy {
          position: relative;
          z-index: 3;
          text-align: center;
          transform: translateZ(42px);
        }

        .hero-copy p {
          margin: 0 0 26px;
          color: rgba(245, 242, 236, 0.88);
          font-family: Georgia, "Times New Roman", Times, serif;
          font-size: clamp(0.78rem, 1vw, 1.02rem);
          letter-spacing: 0.05em;
          text-shadow: 0 0 18px rgba(255, 255, 255, 0.2);
        }

        .hero-copy h1 {
          margin: 0;
          display: grid;
          gap: clamp(0px, 0.3vw, 6px);
          color: rgba(244, 248, 255, 0.94);
          font-size: clamp(3.3rem, 5.6vw, 6.7rem);
          font-weight: 400;
          line-height: 0.88;
          letter-spacing: 0.035em;
          text-shadow:
            0 0 18px rgba(150, 180, 255, 0.38),
            0 0 2px rgba(255, 255, 255, 0.9);
        }

        .hero-copy h1 span {
          display: block;
        }

        .spine {
          position: absolute;
          left: 50%;
          z-index: -1;
          width: min(240px, 26vw);
          height: min(240px, 26vw);
          transform: translateX(-50%);
          opacity: 0.58;
          filter:
            drop-shadow(0 0 18px rgba(168, 140, 255, 0.2))
            drop-shadow(0 0 32px rgba(255, 157, 46, 0.11));
          animation: spineFloat 8s ease-in-out infinite alternate;
        }

        .spine > div {
          width: 100%;
          height: 100%;
          background:
            radial-gradient(circle at 50% 15%, rgba(255, 255, 255, 0.5), transparent 8%),
            conic-gradient(from 90deg, transparent, rgba(168, 140, 255, 0.42), rgba(255, 157, 46, 0.22), transparent 72%),
            radial-gradient(circle, rgba(55, 38, 82, 0.42), transparent 65%);
          clip-path: polygon(50% 0%, 62% 26%, 96% 28%, 68% 48%, 82% 84%, 50% 61%, 18% 84%, 32% 48%, 4% 28%, 38% 26%);
        }

        .top-spine {
          top: -17%;
        }

        .bottom-spine {
          bottom: -20%;
          transform: translateX(-50%) rotate(180deg);
          animation-delay: -3s;
        }

        .glass-panels {
          position: absolute;
          right: clamp(32px, 7vw, 132px);
          top: 54%;
          z-index: 5;
          width: min(360px, 24vw);
          height: min(420px, 34vw);
          transform: translateY(-30%);
          perspective: 1200px;
        }

        .glass-panel {
          position: absolute;
          border-radius: 28px;
          border: 1px solid rgba(169, 241, 218, 0.16);
          background:
            linear-gradient(145deg, rgba(255, 255, 255, 0.09), transparent 16%),
            linear-gradient(160deg, rgba(17, 53, 46, 0.76), rgba(4, 6, 7, 0.84));
          box-shadow:
            inset 0 0 42px rgba(255, 255, 255, 0.04),
            0 24px 80px rgba(0, 0, 0, 0.78);
          transform-style: preserve-3d;
          animation: panelDrift 8s ease-in-out infinite alternate;
        }

        .glass-panel span {
          position: absolute;
          inset: 12%;
          border-radius: inherit;
          background:
            linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.08), transparent),
            repeating-linear-gradient(
              to bottom,
              rgba(255, 255, 255, 0.08) 0,
              rgba(255, 255, 255, 0.08) 2px,
              transparent 2px,
              transparent 13px
            );
          opacity: 0.3;
          filter: blur(0.4px);
        }

        .panel-one {
          width: 178px;
          height: 272px;
          right: 12px;
          top: 64px;
          transform: rotateY(-18deg) rotateX(4deg) rotateZ(1deg);
        }

        .panel-two {
          width: 150px;
          height: 230px;
          right: 150px;
          top: 136px;
          opacity: 0.66;
          transform: rotateY(-24deg) rotateX(8deg) translateZ(-70px);
          animation-delay: -2.4s;
        }

        .panel-three {
          width: 122px;
          height: 194px;
          right: 236px;
          top: 178px;
          opacity: 0.42;
          transform: rotateY(-28deg) rotateX(10deg) translateZ(-140px);
          animation-delay: -4.1s;
        }

        .particle-field {
          position: absolute;
          inset: 0;
          z-index: 1;
          overflow: hidden;
          pointer-events: none;
        }

        .orb {
          position: absolute;
          border-radius: 999px;
          background: rgba(222, 204, 255, 0.9);
          box-shadow:
            0 0 10px rgba(168, 140, 255, 0.8),
            0 0 24px rgba(168, 140, 255, 0.26);
          animation-name: orbDrift;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          animation-direction: alternate;
        }

        .dust {
          position: absolute;
          display: block;
          border-radius: 999px;
          filter: blur(0.1px);
          opacity: 0.55;
          transform: rotate(-12deg);
          background:
            radial-gradient(circle, rgba(196, 171, 255, 0.96) 0 1px, transparent 2px),
            radial-gradient(circle, rgba(255, 157, 46, 0.75) 0 1px, transparent 2px),
            radial-gradient(circle, rgba(255, 255, 255, 0.72) 0 1px, transparent 2px);
          background-size: 22px 20px, 31px 28px, 43px 38px;
          background-position: 0 0, 12px 8px, 24px 16px;
          mask-image: radial-gradient(ellipse, black 0%, black 52%, transparent 72%);
          animation: dustFlow 12s ease-in-out infinite alternate;
        }

        .dust-one {
          left: 10%;
          bottom: 2%;
          width: 58%;
          height: 36%;
        }

        .dust-two {
          right: 3%;
          top: 30%;
          width: 38%;
          height: 28%;
          opacity: 0.32;
          animation-delay: -4s;
        }

        .dust-three {
          left: 36%;
          top: 10%;
          width: 38%;
          height: 34%;
          opacity: 0.3;
          transform: rotate(18deg);
          animation-delay: -7s;
        }

        @keyframes deepBreath {
          from {
            transform: scale(1) translate3d(0, 0, 0);
            opacity: 0.72;
          }
          to {
            transform: scale(1.06) translate3d(-1.2%, 1%, 0);
            opacity: 1;
          }
        }

        @keyframes cardFloat {
          0%, 100% {
            transform: translate3d(0, 0, 0) rotateX(0.5deg) rotateY(-0.8deg);
          }
          50% {
            transform: translate3d(0, -18px, 0) rotateX(1.8deg) rotateY(1deg);
          }
        }

        @keyframes glowPulse {
          from {
            opacity: 0.38;
            transform: scale(0.96);
          }
          to {
            opacity: 0.78;
            transform: scale(1.08);
          }
        }

        @keyframes wheelTurn {
          from {
            transform: rotate(0deg) scale(1);
          }
          to {
            transform: rotate(360deg) scale(1);
          }
        }

        @keyframes spineFloat {
          from {
            opacity: 0.36;
            filter:
              drop-shadow(0 0 14px rgba(168, 140, 255, 0.14))
              drop-shadow(0 0 18px rgba(255, 157, 46, 0.08));
          }
          to {
            opacity: 0.7;
            filter:
              drop-shadow(0 0 24px rgba(168, 140, 255, 0.28))
              drop-shadow(0 0 38px rgba(255, 157, 46, 0.16));
          }
        }

        @keyframes panelDrift {
          0%, 100% {
            margin-top: 0;
          }
          50% {
            margin-top: -16px;
          }
        }

        @keyframes orbDrift {
          from {
            transform: translate3d(-8px, 10px, 0) scale(0.92);
            opacity: 0.34;
          }
          to {
            transform: translate3d(16px, -20px, 0) scale(1.22);
            opacity: 0.95;
          }
        }

        @keyframes dustFlow {
          from {
            transform: translate3d(-2%, 1%, 0) rotate(-12deg) scale(0.98);
            opacity: 0.34;
          }
          to {
            transform: translate3d(2%, -2%, 0) rotate(-9deg) scale(1.05);
            opacity: 0.68;
          }
        }

        @media (max-width: 1180px) {
          .brand-mark a {
            font-size: clamp(2.35rem, 6vw, 4.5rem);
          }

          .brand-mark p {
            letter-spacing: 0.44em;
          }

          .hero-stage {
            width: min(720px, 58vw);
            transform: translate(-36%, -43%);
          }

          .seeking-menu {
            width: 250px;
          }

          .glass-panels {
            opacity: 0.72;
            right: -20px;
          }
        }

        @media (max-width: 900px) {
          .tarayai-home {
            min-height: 100svh;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 28px 18px 36px;
            display: grid;
            gap: 28px;
          }

          .brand-mark,
          .top-nav,
          .seeking-menu,
          .hero-stage,
          .glass-panels {
            position: relative;
            inset: auto;
            transform: none;
          }

          .brand-mark {
            order: 1;
            text-align: left;
          }

          .brand-mark a {
            font-size: clamp(2.6rem, 12vw, 4.4rem);
          }

          .brand-mark p {
            margin-top: 12px;
            font-size: 0.72rem;
            letter-spacing: 0.32em;
          }

          .top-nav {
            order: 2;
            justify-self: start;
            min-height: 46px;
            padding: 0 16px;
            gap: 16px;
          }

          .top-nav a {
            min-height: 44px;
            font-size: 0.78rem;
          }

          .nav-divider {
            display: none;
          }

          .hero-stage {
            order: 3;
            width: 100%;
            min-height: auto;
            margin-top: 8px;
          }

          .hero-card {
            width: min(100%, 640px);
            min-height: 330px;
            aspect-ratio: auto;
            border-radius: 32px;
          }

          .hero-copy h1 {
            font-size: clamp(3rem, 13vw, 5rem);
          }

          .seeking-menu {
            order: 4;
            width: 100%;
            display: grid;
            justify-items: start;
            margin-top: 4px;
          }

          .menu-links {
            gap: 16px;
          }

          .ask-pill {
            min-width: min(100%, 270px);
            min-height: 54px;
            margin-top: 28px;
          }

          .glass-panels {
            order: 5;
            display: none;
          }

          .dust-one {
            left: -18%;
            bottom: 4%;
            width: 130%;
          }

          .dust-two,
          .dust-three {
            opacity: 0.22;
          }
        }

        @media (max-width: 520px) {
          .tarayai-home {
            padding: 22px 16px 32px;
          }

          .top-nav {
            width: 100%;
            justify-content: space-between;
          }

          .hero-card {
            min-height: 310px;
          }

          .hero-copy p {
            margin-bottom: 18px;
            font-size: 0.72rem;
          }

          .hero-copy h1 {
            letter-spacing: 0.015em;
          }

          .astro-wheel {
            width: 88%;
            height: 88%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .tarayai-home::before,
          .hero-card,
          .card-glow,
          .astro-wheel,
          .spine,
          .glass-panel,
          .orb,
          .dust {
            animation: none !important;
          }
        }
      `}</style>

      <ParticleField />
      <BrandMark />
      <TopNav />
      <SeekingMenu />
      <HeroCard />
      <GlassPanels />
    </main>
  );
}
