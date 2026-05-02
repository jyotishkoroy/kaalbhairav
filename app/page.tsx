/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent, WheelEvent } from "react";

const BRAND = {
  name: "TARAYAI",
  subtitle: "VEDIC ASTROLOGY",
};

const TOP_NAV = [
  { label: "CHART", href: "/astro" },
  { label: "INSIGHTS", href: "/news" },
  { label: "SETTINGS", href: "/settings" },
] as const;

const FOOTER_LINKS = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Settings", href: "/settings" },
] as const;

const PATH_CARDS = [
  {
    kicker: "ASK THE GURU",
    title: "Ask what your chart is trying to teach you.",
    label: "ASK TARAYAI",
    href: "/astro",
    meta: "AI guidance",
    body: "Personal answers for love, career, emotional patterns, timing, and spiritual direction.",
    symbol: "GURU",
    accent: "#b89cff",
    aura: "168, 140, 255",
  },
  {
    kicker: "KUNDALI",
    title: "Enter your birth map and read the architecture of self.",
    label: "GENERATE CHART",
    href: "/astro",
    meta: "Birth chart",
    body: "Lagna, Moon sign, houses, yogas, planetary strengths, and readable chart summaries.",
    symbol: "LAGNA",
    accent: "#ffb86b",
    aura: "255, 157, 46",
  },
  {
    kicker: "PANCHANG",
    title: "Move with the day instead of fighting its current.",
    label: "TODAY'S TIMING",
    href: "/astro",
    meta: "Daily timing",
    body: "Tithi, nakshatra, lunar mood, careful windows, and simple daily spiritual focus.",
    symbol: "MOON",
    accent: "#9ee7ff",
    aura: "78, 196, 255",
  },
  {
    kicker: "COMPATIBILITY",
    title: "Understand the pattern between two inner skies.",
    label: "CHECK MATCH",
    href: "/astro",
    meta: "Relationship lens",
    body: "Emotional fit, karmic lessons, long-term harmony signals, and gentle practical guidance.",
    symbol: "TWIN",
    accent: "#ff7ab6",
    aura: "255, 94, 166",
  },
  {
    kicker: "REMEDIES",
    title: "Balance pressure with simple sacred action.",
    label: "VIEW REMEDIES",
    href: "/still",
    meta: "Spiritual practice",
    body: "Non-fear-based mantras, discipline, charity, color, routine, and reflective practices.",
    symbol: "JAPA",
    accent: "#d6ff8f",
    aura: "196, 255, 128",
  },
] as const;

const HERO = {
  eyebrow: "TARAYAI ASTROLOGY",
  headline: ["DISCOVER", "YOUR", "INNER SKY"],
  subline:
    "A cinematic Vedic astrology companion for chart intelligence, timing, remedies, and emotionally grounded AI guidance.",
};

const STARFIELD = Array.from({ length: 54 }, (_, index) => ({
  left: `${(index * 37) % 101}%`,
  top: `${(index * 61) % 101}%`,
  size: index % 9 === 0 ? 4 : index % 5 === 0 ? 3 : 2,
  delay: `${-((index * 0.43) % 9).toFixed(2)}s`,
  duration: `${8 + (index % 11)}s`,
}));

const RAYS = Array.from({ length: 24 }, (_, index) => index * 15);

function wrapIndex(index: number, length: number) {
  return ((index % length) + length) % length;
}

function getRelativeIndex(index: number, activeIndex: number, length: number) {
  let relative = index - activeIndex;
  const half = Math.floor(length / 2);

  if (relative > half) relative -= length;
  if (relative < -half) relative += length;

  return relative;
}

function BrandMark() {
  return (
    <header className="brand-mark">
      <Link href="/" aria-label="Tarayai home">
        {BRAND.name}
      </Link>
      <p>{BRAND.subtitle}</p>
    </header>
  );
}

function TopNav() {
  return (
    <nav className="top-nav" aria-label="Primary navigation">
      {TOP_NAV.map((item, index) => (
        <Link key={item.href} href={item.href} style={{ "--nav-delay": `${index * 90}ms` } as CSSProperties}>
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

function AstrologyGlyph() {
  return (
    <svg className="astro-glyph" viewBox="0 0 520 520" aria-hidden="true" focusable="false">
      <circle cx="260" cy="260" r="226" />
      <circle cx="260" cy="260" r="176" />
      <circle cx="260" cy="260" r="116" />
      <circle cx="260" cy="260" r="44" />

      {RAYS.map((angle) => (
        <line
          key={angle}
          x1="260"
          y1="34"
          x2="260"
          y2="86"
          transform={`rotate(${angle} 260 260)`}
        />
      ))}

      <path d="M260 48L401 430L70 178H450L119 430L260 48Z" />
      <path d="M260 105L410 360H110L260 105Z" />
      <path d="M260 415L110 160H410L260 415Z" />
      <path d="M156 156H364L468 260L364 364H156L52 260L156 156Z" />
      <path d="M204 194H316L372 260L316 326H204L148 260L204 194Z" />

      <circle className="glyph-dot" cx="372" cy="162" r="5" />
      <circle className="glyph-dot dim" cx="148" cy="348" r="3" />
      <circle className="glyph-dot dim" cx="398" cy="314" r="3" />
      <circle className="glyph-dot warm" cx="260" cy="260" r="7" />
    </svg>
  );
}

function AmbientLayer() {
  return (
    <div className="ambient-layer" aria-hidden="true">
      <div className="orbital-ring ring-one" />
      <div className="orbital-ring ring-two" />
      <div className="orbital-ring ring-three" />
      <div className="light-beam beam-one" />
      <div className="light-beam beam-two" />

      <div className="starfield">
        {STARFIELD.map((star, index) => (
          <span
            key={`${star.left}-${star.top}-${index}`}
            className="star"
            style={
              {
                left: star.left,
                top: star.top,
                width: `${star.size}px`,
                height: `${star.size}px`,
                animationDelay: star.delay,
                animationDuration: star.duration,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className="scanlines" />
      <div className="noise" />
    </div>
  );
}

type RotatingDeckProps = {
  activeIndex: number;
  setActiveIndex: (updater: number | ((index: number) => number)) => void;
};

function RotatingDeck({ activeIndex, setActiveIndex }: RotatingDeckProps) {
  const dragState = useRef({
    dragging: false,
    startX: 0,
    lastX: 0,
  });
  const wheelLock = useRef(0);

  const activeCard = PATH_CARDS[activeIndex];

  const goTo = useCallback(
    (nextIndex: number) => {
      setActiveIndex(wrapIndex(nextIndex, PATH_CARDS.length));
    },
    [setActiveIndex],
  );

  const advance = useCallback(
    (direction: number) => {
      setActiveIndex((current) => wrapIndex(current + direction, PATH_CARDS.length));
    },
    [setActiveIndex],
  );

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragState.current = {
      dragging: true,
      startX: event.clientX,
      lastX: event.clientX,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragState.current.dragging) return;

    const delta = event.clientX - dragState.current.startX;
    dragState.current.lastX = event.clientX;

    if (Math.abs(delta) > 76) {
      advance(delta < 0 ? 1 : -1);
      dragState.current.startX = event.clientX;
    }
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    dragState.current.dragging = false;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    const now = Date.now();

    if (now - wheelLock.current < 420 || Math.abs(event.deltaY) < 18) {
      return;
    }

    wheelLock.current = now;
    advance(event.deltaY > 0 ? 1 : -1);
  };

  return (
    <section className="deck-section" aria-labelledby="deck-title">
      <div className="deck-intro">
        <p>{HERO.eyebrow}</p>
        <h1 id="deck-title">
          {HERO.headline.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </h1>
        <span className="intro-rule" aria-hidden="true" />
        <p className="intro-body">{HERO.subline}</p>
      </div>

      <div
        className="deck-stage"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerCancel={handlePointerUp}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        role="region"
        aria-label="Rotating TarayAI feature deck"
      >
        <div className="deck-shadow" aria-hidden="true" />
        <div className="deck-axis" aria-hidden="true" />
        <div className="deck-orbit" aria-hidden="true" />

        {PATH_CARDS.map((card, index) => {
          const relative = getRelativeIndex(index, activeIndex, PATH_CARDS.length);
          const abs = Math.abs(relative);
          const isActive = relative === 0;

          return (
            <article
              key={card.kicker}
              className={`path-card${isActive ? " is-active" : ""}${abs > 2 ? " is-hidden-card" : ""}`}
              aria-hidden={abs > 2}
              style={
                {
                  "--rel": relative,
                  "--abs": abs,
                  "--x": `${relative * 138}px`,
                  "--y": `${abs * 22}px`,
                  "--z": `${160 - abs * 80}px`,
                  "--r": `${relative * -12}deg`,
                  "--ry": `${relative * -22}deg`,
                  "--scale": 1 - abs * 0.075,
                  "--opacity": abs > 2 ? 0 : 1 - abs * 0.16,
                  "--aura": card.aura,
                  "--accent": card.accent,
                  "--card-delay": `${index * -0.74}s`,
                } as CSSProperties
              }
            >
              <div className="card-face">
                <div className="card-sheen" aria-hidden="true" />
                <div className="card-noise" aria-hidden="true" />

                <div className="card-topline">
                  <span>{card.kicker}</span>
                  <span>{card.meta}</span>
                </div>

                <div className="symbol-wrap" aria-hidden="true">
                  <span>{card.symbol}</span>
                  <AstrologyGlyph />
                </div>

                <div className="card-copy">
                  <h2>{card.title}</h2>
                  <p>{card.body}</p>
                </div>

                <Link className="card-cta" href={card.href} tabIndex={isActive ? 0 : -1}>
                  {card.label}
                </Link>
              </div>
            </article>
          );
        })}
      </div>

      <div className="deck-controls" aria-label="Feature deck controls">
        <button type="button" onClick={() => advance(-1)} aria-label="Previous TarayAI path">
          PREV
        </button>

        <div className="deck-dots" role="tablist" aria-label="TarayAI paths">
          {PATH_CARDS.map((card, index) => (
            <button
              key={card.kicker}
              type="button"
              aria-label={`Show ${card.kicker}`}
              aria-selected={index === activeIndex}
              className={index === activeIndex ? "active" : ""}
              onClick={() => goTo(index)}
            />
          ))}
        </div>

        <button type="button" onClick={() => advance(1)} aria-label="Next TarayAI path">
          NEXT
        </button>
      </div>

      <aside className="active-readout" aria-label="Selected TarayAI path">
        <span>{activeCard.kicker}</span>
        <p>{activeCard.body}</p>
      </aside>
    </section>
  );
}

function KineticSidebar({ activeIndex, setActiveIndex }: RotatingDeckProps) {
  const activeCard = PATH_CARDS[activeIndex];

  return (
    <aside className="kinetic-sidebar" aria-label="Astrology sections">
      <p className="menu-question">WHAT ARE YOU SEEKING?</p>

      <nav className="side-links" aria-label="Homepage astrology links">
        {PATH_CARDS.map((item, index) => (
          <button
            key={item.kicker}
            type="button"
            className={index === activeIndex ? "active" : ""}
            onClick={() => setActiveIndex(index)}
          >
            <span aria-hidden="true">-&gt;</span>
            {item.kicker}
          </button>
        ))}
      </nav>

      <Link className="ask-pill" href={activeCard.href}>
        {activeCard.label}
      </Link>
    </aside>
  );
}

function MarqueeBand() {
  const text = "KUNDALI  -  PANCHANG  -  GURU  -  COMPATIBILITY  -  REMEDIES  -  TARAYAI  -  ";
  return (
    <div className="marquee-band" aria-hidden="true">
      <div>
        <span>{text}</span>
        <span>{text}</span>
        <span>{text}</span>
      </div>
    </div>
  );
}

function FooterLinks() {
  return (
    <footer className="home-footer">
      <nav aria-label="Footer links">
        {FOOTER_LINKS.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>
      <p>Jai Maa Tara</p>
    </footer>
  );
}

export default function HomePage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [pointer, setPointer] = useState({ x: 50, y: 50 });

  const mainStyle = useMemo(
    () =>
      ({
        "--mx": `${pointer.x}%`,
        "--my": `${pointer.y}%`,
        "--active-aura": PATH_CARDS[activeIndex].aura,
        "--active-accent": PATH_CARDS[activeIndex].accent,
      }) as CSSProperties,
    [activeIndex, pointer.x, pointer.y],
  );

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();

    setPointer({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <main className="tarayai-home" style={mainStyle} onPointerMove={handlePointerMove}>
      <style>{`
        .tarayai-home {
          --bg: #030306;
          --text: #f7f2e9;
          --muted: rgba(247, 242, 233, 0.64);
          --dim: rgba(247, 242, 233, 0.38);
          --line: rgba(247, 242, 233, 0.16);
          --panel: rgba(7, 8, 14, 0.74);
          --glass: rgba(255, 255, 255, 0.07);
          --active-aura: 168, 140, 255;
          --active-accent: #b89cff;

          position: relative;
          min-height: 100svh;
          width: 100%;
          overflow: hidden;
          color: var(--text);
          isolation: isolate;
          background:
            radial-gradient(circle at var(--mx) var(--my), rgba(var(--active-aura), 0.26), transparent 19rem),
            radial-gradient(circle at 14% 18%, rgba(115, 74, 255, 0.16), transparent 21rem),
            radial-gradient(circle at 78% 72%, rgba(255, 111, 42, 0.13), transparent 24rem),
            linear-gradient(120deg, #020204 0%, #080713 45%, #020204 100%);
          font-family: ui-monospace, "SFMono-Regular", "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        }

        .tarayai-home *,
        .tarayai-home *::before,
        .tarayai-home *::after {
          box-sizing: border-box;
        }

        .tarayai-home a,
        .tarayai-home button {
          color: inherit;
          font: inherit;
        }

        .tarayai-home a {
          text-decoration: none;
        }

        .tarayai-home button {
          border: 0;
          background: transparent;
          cursor: pointer;
        }

        .tarayai-home a:focus-visible,
        .tarayai-home button:focus-visible {
          outline: 1px solid rgba(247, 242, 233, 0.9);
          outline-offset: 5px;
          border-radius: 999px;
        }

        .ambient-layer {
          position: absolute;
          inset: 0;
          z-index: -2;
          overflow: hidden;
          pointer-events: none;
        }

        .ambient-layer::before {
          content: "";
          position: absolute;
          inset: -35%;
          background:
            conic-gradient(
              from 210deg at 50% 50%,
              transparent 0deg,
              rgba(var(--active-aura), 0.18) 68deg,
              transparent 116deg,
              rgba(255, 157, 46, 0.11) 181deg,
              transparent 244deg,
              rgba(255, 255, 255, 0.06) 312deg,
              transparent 360deg
            );
          filter: blur(46px);
          opacity: 0.68;
          animation: cosmicSpin 28s linear infinite;
        }

        .ambient-layer::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 50% 50%, transparent 0 18%, rgba(0, 0, 0, 0.28) 54%, rgba(0, 0, 0, 0.9) 100%),
            repeating-linear-gradient(
              to bottom,
              rgba(255, 255, 255, 0.02) 0,
              rgba(255, 255, 255, 0.02) 1px,
              transparent 1px,
              transparent 7px
            );
          opacity: 0.65;
        }

        .starfield {
          position: absolute;
          inset: 0;
        }

        .star {
          position: absolute;
          border-radius: 999px;
          background: rgba(255, 250, 235, 0.9);
          box-shadow:
            0 0 10px rgba(var(--active-aura), 0.72),
            0 0 24px rgba(var(--active-aura), 0.28);
          animation: starDrift var(--duration, 10s) ease-in-out infinite alternate;
        }

        .orbital-ring {
          position: absolute;
          left: 50%;
          top: 50%;
          border: 1px solid rgba(247, 242, 233, 0.12);
          border-radius: 50%;
          transform: translate(-50%, -50%) rotateX(66deg) rotateZ(0deg);
          box-shadow:
            inset 0 0 60px rgba(var(--active-aura), 0.08),
            0 0 50px rgba(var(--active-aura), 0.07);
          animation: orbitRotate 18s linear infinite;
        }

        .ring-one {
          width: min(1040px, 92vw);
          height: min(1040px, 92vw);
        }

        .ring-two {
          width: min(760px, 70vw);
          height: min(760px, 70vw);
          animation-duration: 24s;
          animation-direction: reverse;
          opacity: 0.72;
        }

        .ring-three {
          width: min(520px, 52vw);
          height: min(520px, 52vw);
          animation-duration: 13s;
          opacity: 0.45;
        }

        .light-beam {
          position: absolute;
          width: 32vw;
          height: 120vh;
          top: -10vh;
          background: linear-gradient(to bottom, transparent, rgba(var(--active-aura), 0.16), transparent);
          filter: blur(16px);
          mix-blend-mode: screen;
          opacity: 0.38;
          animation: beamSweep 8s ease-in-out infinite alternate;
        }

        .beam-one {
          left: 12%;
          transform: rotate(18deg);
        }

        .beam-two {
          right: 1%;
          transform: rotate(-24deg);
          animation-delay: -4s;
          opacity: 0.24;
        }

        .scanlines {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(to bottom, rgba(255,255,255,0.06), transparent 18%, transparent 72%, rgba(0,0,0,0.34)),
            repeating-linear-gradient(
              to bottom,
              rgba(255, 255, 255, 0.018) 0,
              rgba(255, 255, 255, 0.018) 1px,
              transparent 1px,
              transparent 4px
            );
          opacity: 0.4;
        }

        .noise {
          position: absolute;
          inset: -40%;
          background:
            radial-gradient(circle at 20% 30%, rgba(255,255,255,0.06) 0 1px, transparent 1px),
            radial-gradient(circle at 80% 70%, rgba(255,255,255,0.04) 0 1px, transparent 1px);
          background-size: 19px 23px, 31px 29px;
          opacity: 0.18;
          animation: noiseShift 1s steps(2, end) infinite;
        }

        .brand-mark {
          position: absolute;
          top: clamp(26px, 4.6vw, 68px);
          left: clamp(20px, 4.2vw, 76px);
          z-index: 20;
          transform: translateZ(0);
          animation: introDrop 900ms cubic-bezier(.2,.8,.2,1) both;
        }

        .brand-mark a {
          display: inline-block;
          color: var(--text);
          font-size: clamp(2.7rem, 5.5vw, 6.1rem);
          line-height: 0.78;
          letter-spacing: 0.052em;
          font-weight: 900;
          text-shadow:
            0 0 1px rgba(255, 255, 255, 0.9),
            0 0 18px rgba(var(--active-aura), 0.26),
            0 24px 48px rgba(0, 0, 0, 0.84);
          transition: transform 240ms ease, text-shadow 240ms ease;
        }

        .brand-mark a:hover {
          transform: skewX(-6deg) translateX(6px);
          text-shadow:
            0 0 1px rgba(255, 255, 255, 0.9),
            0 0 24px rgba(var(--active-aura), 0.48),
            0 28px 58px rgba(0, 0, 0, 0.9);
        }

        .brand-mark p {
          margin: 18px 0 0;
          color: rgba(247, 242, 233, 0.52);
          font-size: clamp(0.72rem, 1.08vw, 1rem);
          letter-spacing: 0.58em;
          white-space: nowrap;
        }

        .top-nav {
          position: absolute;
          top: clamp(30px, 5vw, 68px);
          right: clamp(20px, 4vw, 72px);
          z-index: 22;
          min-height: 58px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px;
          border: 1px solid rgba(247, 242, 233, 0.22);
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.34);
          box-shadow:
            inset 0 0 22px rgba(255, 255, 255, 0.035),
            0 24px 80px rgba(0, 0, 0, 0.72),
            0 0 36px rgba(var(--active-aura), 0.08);
          backdrop-filter: blur(18px);
        }

        .top-nav a {
          position: relative;
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          overflow: hidden;
          padding: 0 18px;
          border-radius: 999px;
          color: rgba(247, 242, 233, 0.74);
          font-size: clamp(0.72rem, 0.9vw, 0.92rem);
          letter-spacing: 0.08em;
          animation: introRise 700ms cubic-bezier(.2,.8,.2,1) both;
          animation-delay: var(--nav-delay);
          transition: color 180ms ease, transform 180ms ease, background 180ms ease;
        }

        .top-nav a::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 50% 0%, rgba(var(--active-aura), 0.22), transparent 62%),
            rgba(255, 255, 255, 0.04);
          opacity: 0;
          transform: translateY(70%);
          transition: opacity 200ms ease, transform 200ms ease;
        }

        .top-nav a span {
          position: relative;
          z-index: 1;
        }

        .top-nav a:hover {
          color: #ffffff;
          transform: translateY(-2px);
        }

        .top-nav a:hover::before {
          opacity: 1;
          transform: translateY(0);
        }

        .deck-section {
          position: absolute;
          inset: 0;
          z-index: 10;
          display: grid;
          grid-template-columns: minmax(270px, 0.78fr) minmax(420px, 1.45fr) minmax(270px, 0.72fr);
          align-items: center;
          gap: clamp(10px, 2vw, 34px);
          padding:
            clamp(138px, 12vw, 178px)
            clamp(22px, 4vw, 76px)
            clamp(88px, 8vw, 116px);
        }

        .deck-intro {
          align-self: center;
          max-width: 430px;
          pointer-events: none;
        }

        .deck-intro > p:first-child {
          margin: 0 0 24px;
          color: rgba(247, 242, 233, 0.82);
          font-family: Georgia, "Times New Roman", Times, serif;
          font-size: clamp(0.76rem, 0.92vw, 0.96rem);
          letter-spacing: 0.08em;
          animation: textFlicker 4.2s ease-in-out infinite;
        }

        .deck-intro h1 {
          margin: 0;
          display: grid;
          color: rgba(247, 250, 255, 0.96);
          font-size: clamp(4rem, 7vw, 8.6rem);
          font-weight: 500;
          line-height: 0.82;
          letter-spacing: -0.04em;
          text-shadow:
            0 0 1px rgba(255, 255, 255, 0.9),
            0 0 30px rgba(var(--active-aura), 0.34),
            0 34px 80px rgba(0, 0, 0, 0.9);
        }

        .deck-intro h1 span {
          display: block;
          animation: headlineRise 900ms cubic-bezier(.16,.9,.26,1) both;
        }

        .deck-intro h1 span:nth-child(2) {
          padding-left: clamp(22px, 4vw, 64px);
          animation-delay: 100ms;
        }

        .deck-intro h1 span:nth-child(3) {
          padding-left: clamp(44px, 8vw, 124px);
          animation-delay: 200ms;
        }

        .intro-rule {
          display: block;
          width: min(270px, 68%);
          height: 1px;
          margin: 32px 0 22px;
          background:
            linear-gradient(to right, rgba(var(--active-aura), 0.8), rgba(247, 242, 233, 0.2), transparent);
          box-shadow: 0 0 22px rgba(var(--active-aura), 0.28);
          transform-origin: left;
          animation: ruleGrow 1100ms cubic-bezier(.2,.8,.2,1) both;
        }

        .intro-body {
          max-width: 390px;
          margin: 0;
          color: rgba(247, 242, 233, 0.62);
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-size: clamp(0.92rem, 1.08vw, 1.08rem);
          line-height: 1.7;
          letter-spacing: 0.01em;
          animation: introFade 900ms ease both 260ms;
        }

        .deck-stage {
          position: relative;
          min-height: min(610px, 68vh);
          display: grid;
          place-items: center;
          perspective: 1500px;
          touch-action: pan-y;
          cursor: grab;
          transform-style: preserve-3d;
        }

        .deck-stage:active {
          cursor: grabbing;
        }

        .deck-shadow {
          position: absolute;
          bottom: 4%;
          width: min(620px, 72vw);
          height: 80px;
          border-radius: 50%;
          background: radial-gradient(ellipse, rgba(var(--active-aura), 0.28), rgba(0, 0, 0, 0.62) 45%, transparent 70%);
          filter: blur(20px);
          opacity: 0.72;
          transform: rotateX(72deg);
          animation: shadowPulse 5s ease-in-out infinite alternate;
        }

        .deck-axis {
          position: absolute;
          width: min(520px, 62vw);
          height: min(520px, 62vw);
          border-radius: 50%;
          border: 1px dashed rgba(247, 242, 233, 0.15);
          transform: rotateX(68deg) rotateZ(0deg);
          animation: orbitRotate 11s linear infinite reverse;
        }

        .deck-orbit {
          position: absolute;
          width: min(740px, 75vw);
          height: min(740px, 75vw);
          border-radius: 50%;
          background:
            conic-gradient(from 180deg, transparent, rgba(var(--active-aura), 0.12), transparent 32%, rgba(255, 255, 255, 0.08), transparent 72%);
          mask-image: radial-gradient(circle, transparent 0 48%, #000 49% 50%, transparent 51%);
          transform: rotateX(70deg);
          opacity: 0.58;
          animation: orbitRotate 15s linear infinite;
        }

        .path-card {
          --x: 0px;
          --y: 0px;
          --z: 0px;
          --r: 0deg;
          --ry: 0deg;
          --scale: 1;
          --opacity: 1;

          position: absolute;
          width: clamp(278px, 29vw, 430px);
          min-height: clamp(430px, 48vw, 560px);
          opacity: var(--opacity);
          transform:
            translate3d(var(--x), var(--y), var(--z))
            rotateY(var(--ry))
            rotateZ(var(--r))
            scale(var(--scale));
          transform-style: preserve-3d;
          transition:
            transform 760ms cubic-bezier(.16,.9,.22,1),
            opacity 520ms ease,
            filter 520ms ease;
          filter: saturate(0.82) brightness(0.72) blur(calc(var(--abs) * 0.22px));
          pointer-events: none;
          animation: cardIdle 7s ease-in-out infinite alternate;
          animation-delay: var(--card-delay);
        }

        .path-card.is-active {
          z-index: 8;
          pointer-events: auto;
          filter: saturate(1.12) brightness(1.04);
        }

        .path-card.is-hidden-card {
          pointer-events: none;
          visibility: hidden;
        }

        .card-face {
          position: relative;
          min-height: inherit;
          display: grid;
          align-content: space-between;
          overflow: hidden;
          padding: clamp(22px, 2vw, 30px);
          border: 1px solid rgba(247, 242, 233, 0.16);
          border-radius: clamp(28px, 3vw, 46px);
          background:
            linear-gradient(145deg, rgba(255, 255, 255, 0.14), transparent 18%),
            radial-gradient(circle at 50% 24%, rgba(var(--aura), 0.28), transparent 34%),
            radial-gradient(circle at 26% 78%, rgba(255, 255, 255, 0.07), transparent 35%),
            linear-gradient(155deg, rgba(16, 18, 31, 0.92), rgba(2, 3, 8, 0.92));
          box-shadow:
            inset 0 0 1px rgba(255, 255, 255, 0.54),
            inset 0 0 90px rgba(255, 255, 255, 0.035),
            0 42px 120px rgba(0, 0, 0, 0.82),
            0 0 54px rgba(var(--aura), 0.18);
          backdrop-filter: blur(22px);
        }

        .card-face::before {
          content: "";
          position: absolute;
          inset: -1px;
          border-radius: inherit;
          background:
            linear-gradient(118deg, transparent 0%, rgba(255, 255, 255, 0.32) 13%, transparent 26%),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.08), transparent 48%, rgba(0, 0, 0, 0.52));
          opacity: 0.54;
          mix-blend-mode: screen;
          transform: translateX(-55%);
          animation: sheenSweep 5.4s cubic-bezier(.7,0,.2,1) infinite;
          animation-delay: var(--card-delay);
        }

        .card-face::after {
          content: "";
          position: absolute;
          inset: 12px;
          border: 1px solid rgba(247, 242, 233, 0.1);
          border-radius: calc(clamp(28px, 3vw, 46px) - 11px);
          pointer-events: none;
        }

        .card-sheen {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at var(--mx) var(--my), rgba(255, 255, 255, 0.13), transparent 25%),
            repeating-linear-gradient(114deg, transparent 0 16px, rgba(255, 255, 255, 0.018) 17px, transparent 21px);
          opacity: 0.82;
          pointer-events: none;
        }

        .card-noise {
          position: absolute;
          inset: -30%;
          background:
            radial-gradient(circle, rgba(255,255,255,0.08) 0 1px, transparent 1px);
          background-size: 13px 17px;
          opacity: 0.12;
          animation: noiseShift 800ms steps(2, end) infinite;
        }

        .card-topline {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          color: rgba(247, 242, 233, 0.74);
          font-size: 0.76rem;
          line-height: 1;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .card-topline span:last-child {
          color: rgba(247, 242, 233, 0.42);
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-size: 0.7rem;
          letter-spacing: 0.06em;
        }

        .symbol-wrap {
          position: relative;
          z-index: 1;
          min-height: clamp(190px, 23vw, 270px);
          display: grid;
          place-items: center;
          margin: clamp(18px, 2vw, 28px) 0;
        }

        .symbol-wrap > span {
          position: absolute;
          z-index: 3;
          color: rgba(247, 242, 233, 0.98);
          font-size: clamp(2rem, 3.2vw, 4rem);
          line-height: 1;
          letter-spacing: -0.08em;
          text-shadow:
            0 0 1px rgba(255, 255, 255, 0.8),
            0 0 22px rgba(var(--aura), 0.48);
          transform: translateZ(34px);
        }

        .astro-glyph {
          width: min(292px, 84%);
          height: min(292px, 84%);
          opacity: 0.48;
          filter:
            drop-shadow(0 0 16px rgba(var(--aura), 0.44))
            drop-shadow(0 0 34px rgba(var(--aura), 0.16));
          animation: wheelTurn 24s linear infinite;
        }

        .astro-glyph circle,
        .astro-glyph line,
        .astro-glyph path {
          fill: none;
          stroke: rgba(247, 242, 233, 0.48);
          stroke-width: 1.1;
          vector-effect: non-scaling-stroke;
        }

        .astro-glyph .glyph-dot {
          fill: #ffffff;
          stroke: none;
        }

        .astro-glyph .glyph-dot.dim {
          fill: var(--accent);
          opacity: 0.72;
        }

        .astro-glyph .glyph-dot.warm {
          fill: var(--accent);
          opacity: 0.9;
        }

        .card-copy {
          position: relative;
          z-index: 3;
        }

        .card-copy h2 {
          max-width: 11ch;
          margin: 0 0 18px;
          color: rgba(247, 250, 255, 0.96);
          font-family: Georgia, "Times New Roman", Times, serif;
          font-size: clamp(2.1rem, 3.2vw, 3.85rem);
          font-weight: 400;
          line-height: 0.92;
          letter-spacing: -0.06em;
          text-wrap: balance;
          text-shadow: 0 0 22px rgba(var(--aura), 0.22);
        }

        .card-copy p {
          max-width: 34ch;
          margin: 0;
          color: rgba(247, 242, 233, 0.6);
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-size: 0.95rem;
          line-height: 1.58;
        }

        .card-cta {
          position: relative;
          z-index: 3;
          width: max-content;
          min-height: 48px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-top: 26px;
          padding: 0 20px;
          border: 1px solid rgba(247, 242, 233, 0.24);
          border-radius: 999px;
          color: rgba(247, 242, 233, 0.9);
          background:
            radial-gradient(circle at 30% 0%, rgba(var(--aura), 0.24), transparent 62%),
            rgba(255, 255, 255, 0.04);
          box-shadow:
            inset 0 0 24px rgba(255, 255, 255, 0.04),
            0 0 28px rgba(var(--aura), 0.12);
          font-size: 0.78rem;
          letter-spacing: 0.08em;
          transition:
            transform 180ms ease,
            border-color 180ms ease,
            box-shadow 180ms ease,
            background 180ms ease;
        }

        .card-cta:hover {
          transform: translateY(-3px);
          border-color: rgba(247, 242, 233, 0.54);
          box-shadow:
            inset 0 0 24px rgba(255, 255, 255, 0.055),
            0 0 44px rgba(var(--aura), 0.24);
        }

        .deck-controls {
          position: absolute;
          left: 50%;
          bottom: clamp(76px, 8vw, 112px);
          z-index: 20;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 18px;
          transform: translateX(-50%);
          padding: 8px;
          border: 1px solid rgba(247, 242, 233, 0.15);
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.38);
          backdrop-filter: blur(16px);
          box-shadow: 0 16px 60px rgba(0, 0, 0, 0.56);
        }

        .deck-controls > button {
          min-height: 38px;
          padding: 0 14px;
          border-radius: 999px;
          color: rgba(247, 242, 233, 0.58);
          font-size: 0.72rem;
          letter-spacing: 0.1em;
          transition: color 160ms ease, transform 160ms ease, background 160ms ease;
        }

        .deck-controls > button:hover {
          color: #ffffff;
          transform: translateY(-1px);
          background: rgba(255, 255, 255, 0.06);
        }

        .deck-dots {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .deck-dots button {
          width: 8px;
          height: 8px;
          padding: 0;
          border: 1px solid rgba(247, 242, 233, 0.34);
          border-radius: 999px;
          background: transparent;
          transition: width 220ms ease, background 220ms ease, border-color 220ms ease, box-shadow 220ms ease;
        }

        .deck-dots button.active {
          width: 32px;
          border-color: rgba(247, 242, 233, 0.72);
          background: var(--active-accent);
          box-shadow: 0 0 24px rgba(var(--active-aura), 0.44);
        }

        .active-readout {
          align-self: end;
          justify-self: end;
          max-width: 310px;
          padding: 22px;
          border: 1px solid rgba(247, 242, 233, 0.13);
          border-radius: 28px;
          background:
            linear-gradient(145deg, rgba(255,255,255,0.075), transparent 40%),
            rgba(0, 0, 0, 0.32);
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.58);
          backdrop-filter: blur(18px);
        }

        .active-readout span {
          display: block;
          margin-bottom: 14px;
          color: var(--active-accent);
          font-size: 0.76rem;
          letter-spacing: 0.12em;
        }

        .active-readout p {
          margin: 0;
          color: rgba(247, 242, 233, 0.58);
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-size: 0.92rem;
          line-height: 1.62;
        }

        .kinetic-sidebar {
          position: absolute;
          left: clamp(20px, 4.2vw, 76px);
          bottom: clamp(92px, 10vw, 136px);
          z-index: 21;
          width: min(286px, 26vw);
        }

        .menu-question {
          margin: 0 0 22px;
          color: rgba(247, 242, 233, 0.9);
          font-size: clamp(0.78rem, 1vw, 0.96rem);
          line-height: 1.3;
          letter-spacing: 0.08em;
        }

        .side-links {
          display: grid;
          gap: 13px;
        }

        .side-links button {
          width: max-content;
          max-width: 100%;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: rgba(187, 164, 255, 0.66);
          font-size: clamp(0.76rem, 1vw, 0.94rem);
          letter-spacing: 0.05em;
          text-align: left;
          text-shadow: 0 0 16px rgba(var(--active-aura), 0.14);
          transition:
            transform 180ms ease,
            color 180ms ease,
            text-shadow 180ms ease,
            padding-left 180ms ease;
        }

        .side-links button:hover,
        .side-links button.active {
          color: rgba(247, 242, 233, 0.96);
          transform: translateX(8px);
          text-shadow: 0 0 24px rgba(var(--active-aura), 0.38);
        }

        .side-links button.active {
          padding-left: 8px;
        }

        .ask-pill {
          margin-top: 36px;
          min-width: 222px;
          min-height: 56px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(247, 242, 233, 0.18);
          border-radius: 999px;
          color: rgba(247, 242, 233, 0.86);
          background:
            radial-gradient(circle at 28% 0%, rgba(var(--active-aura), 0.24), transparent 56%),
            rgba(3, 4, 10, 0.62);
          box-shadow:
            inset 0 0 28px rgba(255, 255, 255, 0.04),
            0 0 34px rgba(var(--active-aura), 0.16);
          font-size: 0.78rem;
          letter-spacing: 0.08em;
          transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
        }

        .ask-pill:hover {
          transform: translateY(-3px);
          border-color: rgba(247, 242, 233, 0.48);
          box-shadow:
            inset 0 0 28px rgba(255, 255, 255, 0.06),
            0 0 44px rgba(var(--active-aura), 0.28);
        }

        .marquee-band {
          position: absolute;
          left: 0;
          right: 0;
          bottom: clamp(26px, 3vw, 44px);
          z-index: 12;
          overflow: hidden;
          border-top: 1px solid rgba(247, 242, 233, 0.09);
          border-bottom: 1px solid rgba(247, 242, 233, 0.09);
          background: rgba(255, 255, 255, 0.025);
          color: rgba(247, 242, 233, 0.28);
          pointer-events: none;
          transform: rotate(-1.25deg) scaleX(1.02);
        }

        .marquee-band div {
          display: flex;
          width: max-content;
          min-width: 100%;
          animation: marqueeMove 22s linear infinite;
        }

        .marquee-band span {
          display: inline-flex;
          padding: 12px 0;
          white-space: nowrap;
          font-size: clamp(0.74rem, 1vw, 0.94rem);
          letter-spacing: 0.12em;
        }

        .home-footer {
          position: absolute;
          right: clamp(20px, 4vw, 76px);
          bottom: clamp(92px, 9vw, 126px);
          z-index: 20;
          display: grid;
          justify-items: end;
          gap: 9px;
          color: rgba(247, 242, 233, 0.32);
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-size: 0.75rem;
        }

        .home-footer nav {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .home-footer a {
          color: rgba(247, 242, 233, 0.36);
          transition: color 180ms ease;
        }

        .home-footer a:hover {
          color: rgba(247, 242, 233, 0.78);
        }

        .home-footer p {
          margin: 0;
          color: rgba(247, 242, 233, 0.22);
        }

        @keyframes cosmicSpin {
          from { transform: rotate(0deg) scale(1); }
          to { transform: rotate(360deg) scale(1.04); }
        }

        @keyframes orbitRotate {
          from { transform: translate(-50%, -50%) rotateX(66deg) rotateZ(0deg); }
          to { transform: translate(-50%, -50%) rotateX(66deg) rotateZ(360deg); }
        }

        @keyframes beamSweep {
          from { translate: -2vw 0; opacity: 0.18; }
          to { translate: 4vw 0; opacity: 0.44; }
        }

        @keyframes starDrift {
          from { transform: translate3d(-8px, 10px, 0) scale(0.72); opacity: 0.28; }
          to { transform: translate3d(18px, -24px, 0) scale(1.25); opacity: 0.95; }
        }

        @keyframes noiseShift {
          0% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(-2%, 1%, 0); }
          100% { transform: translate3d(1%, -2%, 0); }
        }

        @keyframes introDrop {
          from { opacity: 0; transform: translateY(-18px); filter: blur(10px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }

        @keyframes introRise {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes headlineRise {
          from { opacity: 0; transform: translateY(34px) skewY(4deg); filter: blur(10px); }
          to { opacity: 1; transform: translateY(0) skewY(0); filter: blur(0); }
        }

        @keyframes ruleGrow {
          from { transform: scaleX(0); opacity: 0; }
          to { transform: scaleX(1); opacity: 1; }
        }

        @keyframes introFade {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes textFlicker {
          0%, 100% { opacity: 0.64; }
          40% { opacity: 1; }
          42% { opacity: 0.45; }
          46% { opacity: 0.92; }
        }

        @keyframes cardIdle {
          from { margin-top: 0; }
          to { margin-top: -14px; }
        }

        @keyframes sheenSweep {
          0%, 42% { transform: translateX(-72%); opacity: 0; }
          55% { opacity: 0.7; }
          74%, 100% { transform: translateX(74%); opacity: 0; }
        }

        @keyframes wheelTurn {
          from { transform: rotate(0deg) scale(1); }
          to { transform: rotate(360deg) scale(1); }
        }

        @keyframes shadowPulse {
          from { transform: rotateX(72deg) scaleX(0.86); opacity: 0.45; }
          to { transform: rotateX(72deg) scaleX(1.12); opacity: 0.78; }
        }

        @keyframes marqueeMove {
          from { transform: translate3d(0, 0, 0); }
          to { transform: translate3d(-33.333%, 0, 0); }
        }

        @media (max-width: 1260px) {
          .deck-section {
            grid-template-columns: minmax(280px, 0.82fr) minmax(390px, 1.28fr);
            padding-right: clamp(20px, 3.5vw, 48px);
          }

          .active-readout {
            display: none;
          }

          .kinetic-sidebar {
            width: 250px;
          }

          .deck-stage {
            min-height: min(590px, 64vh);
          }

          .path-card {
            width: clamp(270px, 33vw, 390px);
            min-height: clamp(410px, 50vw, 520px);
          }
        }

        @media (max-width: 980px) {
          .tarayai-home {
            min-height: 100svh;
            overflow-y: auto;
            overflow-x: hidden;
          }

          .brand-mark,
          .top-nav,
          .deck-section,
          .kinetic-sidebar,
          .home-footer,
          .marquee-band {
            position: relative;
            inset: auto;
            transform: none;
          }

          .tarayai-home {
            display: grid;
            gap: 24px;
            padding: 24px 16px 30px;
          }

          .brand-mark {
            order: 1;
          }

          .brand-mark a {
            font-size: clamp(2.6rem, 13vw, 4.7rem);
          }

          .brand-mark p {
            margin-top: 11px;
            font-size: 0.7rem;
            letter-spacing: 0.32em;
          }

          .top-nav {
            order: 2;
            justify-self: start;
            min-height: 50px;
          }

          .deck-section {
            order: 3;
            display: grid;
            grid-template-columns: 1fr;
            gap: 24px;
            padding: 0;
          }

          .deck-intro {
            max-width: none;
          }

          .deck-intro h1 {
            font-size: clamp(3.7rem, 18vw, 7rem);
          }

          .deck-intro h1 span:nth-child(2),
          .deck-intro h1 span:nth-child(3) {
            padding-left: 0;
          }

          .intro-body {
            max-width: 620px;
          }

          .deck-stage {
            min-height: 590px;
            margin: 4px 0 8px;
            overflow: hidden;
          }

          .path-card {
            width: min(86vw, 390px);
            min-height: 500px;
          }

          .deck-controls {
            position: relative;
            left: auto;
            bottom: auto;
            transform: none;
            justify-self: center;
            margin-top: -8px;
          }

          .active-readout {
            display: block;
            justify-self: stretch;
            max-width: none;
          }

          .kinetic-sidebar {
            order: 4;
            width: 100%;
          }

          .side-links {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
          }

          .side-links button {
            width: auto;
            padding: 10px 12px;
            border: 1px solid rgba(247, 242, 233, 0.1);
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.035);
          }

          .side-links button:hover,
          .side-links button.active {
            transform: translateY(-1px);
            padding-left: 12px;
          }

          .ask-pill {
            margin-top: 22px;
          }

          .marquee-band {
            order: 5;
            margin: 18px -24px 0;
          }

          .home-footer {
            order: 6;
            justify-items: start;
            margin-top: 6px;
          }
        }

        @media (max-width: 620px) {
          .tarayai-home {
            padding: 22px 14px 28px;
          }

          .top-nav {
            width: 100%;
            justify-content: space-between;
          }

          .top-nav a {
            padding: 0 11px;
            font-size: 0.68rem;
          }

          .deck-stage {
            min-height: 540px;
            perspective: 1000px;
          }

          .path-card {
            width: min(90vw, 336px);
            min-height: 460px;
          }

          .card-face {
            padding: 22px;
            border-radius: 34px;
          }

          .card-copy h2 {
            font-size: clamp(2rem, 10vw, 2.95rem);
          }

          .card-copy p {
            font-size: 0.9rem;
          }

          .deck-controls {
            width: 100%;
            gap: 8px;
            justify-content: space-between;
          }

          .deck-controls > button {
            padding: 0 10px;
            font-size: 0.68rem;
          }

          .home-footer nav {
            gap: 14px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ambient-layer::before,
          .star,
          .orbital-ring,
          .light-beam,
          .noise,
          .brand-mark,
          .top-nav a,
          .deck-intro > p:first-child,
          .deck-intro h1 span,
          .intro-rule,
          .intro-body,
          .path-card,
          .card-face::before,
          .card-noise,
          .astro-glyph,
          .deck-shadow,
          .marquee-band div {
            animation: none !important;
          }

          .path-card,
          .top-nav a,
          .brand-mark a,
          .card-cta,
          .ask-pill,
          .side-links button {
            transition: none !important;
          }
        }
      `}</style>

      <AmbientLayer />
      <BrandMark />
      <TopNav />
      <KineticSidebar activeIndex={activeIndex} setActiveIndex={setActiveIndex} />
      <RotatingDeck activeIndex={activeIndex} setActiveIndex={setActiveIndex} />
      <MarqueeBand />
      <FooterLinks />
    </main>
  );
}
