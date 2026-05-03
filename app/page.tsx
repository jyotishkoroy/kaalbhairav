/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent, WheelEvent } from "react";

const PRIMARY_LINKS = [
  {
    label: "Ask Guru",
    href: "/sign-in?next=/astro",
    eyebrow: "guidance",
    note: "Ask what your chart is trying to teach you.",
  },
  {
    label: "Still",
    href: "/sign-in?next=/astro",
    eyebrow: "practice",
    note: "One quiet page for reflection and daily steadiness.",
  },
  {
    label: "News",
    href: "/sign-in?next=/astro",
    eyebrow: "updates",
    note: "Astrology, culture, sky, and Tarayai notes.",
  },
] as const;

const FOOTER_LINKS = [
  { label: "Delete account", href: "/settings" },
  { label: "Contact creator", href: "mailto:jyotishko.roy@tarayai.com" },
  { label: "Privacy", href: "/privacy" },
] as const;

const PARTICLES = Array.from({ length: 44 }, (_, index) => ({
  left: `${(index * 43) % 101}%`,
  top: `${(index * 67) % 101}%`,
  size: index % 8 === 0 ? 4 : index % 5 === 0 ? 3 : 2,
  delay: `${-((index * 0.41) % 8).toFixed(2)}s`,
  duration: `${11 + (index % 13)}s`,
}));

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

type HomeStateProps = {
  activeIndex: number;
  setActiveIndex: (updater: number | ((index: number) => number)) => void;
};

function AmbientField() {
  return (
    <div className="ambient-field" aria-hidden="true">
      <div className="wash wash-one" />
      <div className="wash wash-two" />
      <div className="horizon-glow" />
      <div className="central-light">
        <span className="light-core" />
        <span className="light-ray ray-a" />
        <span className="light-ray ray-b" />
        <span className="light-ray ray-c" />
        <span className="light-ring ring-a" />
        <span className="light-ring ring-b" />
      </div>
      <div className="particle-field">
        {PARTICLES.map((particle, index) => (
          <span
            key={`${particle.left}-${particle.top}-${index}`}
            className="particle"
            style={
              {
                left: particle.left,
                top: particle.top,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                animationDelay: particle.delay,
                animationDuration: particle.duration,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div className="grain" />
    </div>
  );
}

function TopBrand() {
  return (
    <header className="top-brand" aria-label="Tarayai home">
      <Link href="/">tarayai.</Link>
    </header>
  );
}

function TopNav({ activeIndex, setActiveIndex }: HomeStateProps) {
  return (
    <nav className="top-nav" aria-label="Primary navigation">
      {PRIMARY_LINKS.map((item, index) => (
        <Link
          key={item.href}
          href={item.href}
          className={index === activeIndex ? "active" : ""}
          onMouseEnter={() => setActiveIndex(index)}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function RayLogo() {
  return (
    <div className="ray-logo" aria-hidden="true">
      <div className="logo-glass">
        <Image
          src="/tarayai-logo.png"
          alt=""
          width={1149}
          height={912}
          priority
          className="logo-image"
        />
      </div>
    </div>
  );
}

function FloatingCards({ activeIndex, setActiveIndex }: HomeStateProps) {
  const wheelLock = useRef(0);
  const dragState = useRef({ dragging: false, startX: 0 });

  const advance = useCallback(
    (direction: number) => {
      setActiveIndex((current) => wrapIndex(current + direction, PRIMARY_LINKS.length));
    },
    [setActiveIndex],
  );

  const goTo = useCallback(
    (index: number) => {
      setActiveIndex(wrapIndex(index, PRIMARY_LINKS.length));
    },
    [setActiveIndex],
  );

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    const now = Date.now();

    if (now - wheelLock.current < 520 || Math.abs(event.deltaY) < 16) return;

    wheelLock.current = now;
    advance(event.deltaY > 0 ? 1 : -1);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragState.current = { dragging: true, startX: event.clientX };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragState.current.dragging) return;

    const delta = event.clientX - dragState.current.startX;
    if (Math.abs(delta) < 74) return;

    advance(delta < 0 ? 1 : -1);
    dragState.current.startX = event.clientX;
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    dragState.current.dragging = false;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <section
      className="card-stage"
      aria-label="Tarayai sections"
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="orbit-shadow" aria-hidden="true" />
      {PRIMARY_LINKS.map((item, index) => {
        const relative = getRelativeIndex(index, activeIndex, PRIMARY_LINKS.length);
        const abs = Math.abs(relative);
        const active = relative === 0;

        return (
          <article
            key={item.href}
            className={`float-card${active ? " active" : ""}`}
            style={
              {
                "--rel": relative,
                "--abs": abs,
                "--x": `${relative * 230}px`,
                "--y": `${abs * 42}px`,
                "--z": `${active ? 210 : -abs * 95}px`,
                "--rot": `${relative * -9}deg`,
                "--ry": `${relative * -23}deg`,
                "--scale": active ? 1 : 0.88,
                "--opacity": active ? 1 : 0.58,
              } as CSSProperties
            }
          >
            <Link href={item.href} tabIndex={active ? 0 : -1} onFocus={() => goTo(index)}>
              <span className="card-eyebrow">{item.eyebrow}</span>
              <span className="card-title">{item.label}</span>
              <span className="card-note">{item.note}</span>
            </Link>
          </article>
        );
      })}

      <div className="stage-controls" aria-label="Section controls">
        <button type="button" aria-label="Previous section" onClick={() => advance(-1)}>
          prev
        </button>
        <div className="stage-dots" role="tablist" aria-label="Tarayai page sections">
          {PRIMARY_LINKS.map((item, index) => (
            <button
              key={item.href}
              type="button"
              aria-label={`Show ${item.label}`}
              aria-selected={index === activeIndex}
              className={index === activeIndex ? "active" : ""}
              onClick={() => goTo(index)}
            />
          ))}
        </div>
        <button type="button" aria-label="Next section" onClick={() => advance(1)}>
          next
        </button>
      </div>
    </section>
  );
}

function SideMenu({ activeIndex, setActiveIndex }: HomeStateProps) {
  return (
    <aside className="side-menu" aria-label="Tarayai quick links">
      <p>what are you seeking?</p>
      <nav>
        {PRIMARY_LINKS.map((item, index) => (
          <Link
            key={item.href}
            href={item.href}
            className={index === activeIndex ? "active" : ""}
            onMouseEnter={() => setActiveIndex(index)}
          >
            <span aria-hidden="true">-</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

function FooterLinks() {
  return (
    <footer className="home-footer" aria-label="Footer links">
      <nav>
        {FOOTER_LINKS.map((item) => (
          <Link key={item.href} href={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}

export default function HomePage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [pointer, setPointer] = useState({ x: 50, y: 50 });

  const pageStyle = useMemo(
    () =>
      ({
        "--mx": `${pointer.x}%`,
        "--my": `${pointer.y}%`,
      }) as CSSProperties,
    [pointer.x, pointer.y],
  );

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPointer({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <main className="tarayai-home" style={pageStyle} onPointerMove={handlePointerMove}>
      <style>{`
        .tarayai-home {
          --ink: #392a22;
          --soft-ink: rgba(57, 42, 34, 0.58);
          --faint-ink: rgba(57, 42, 34, 0.32);
          --line: rgba(101, 74, 53, 0.16);
          --cream: #faf7ee;
          --warm: #efe5d0;
          --gold: #b59662;
          --red: #8d1532;
          --deep-red: #5d1024;
          --glass: rgba(255, 255, 255, 0.54);

          position: relative;
          min-height: 100svh;
          width: 100%;
          overflow: hidden;
          isolation: isolate;
          color: var(--ink);
          background:
            radial-gradient(circle at var(--mx) var(--my), rgba(141, 21, 50, 0.13), transparent 17rem),
            radial-gradient(circle at 50% 24%, rgba(255, 255, 255, 0.94), transparent 20rem),
            radial-gradient(circle at 12% 28%, rgba(181, 150, 98, 0.16), transparent 24rem),
            radial-gradient(circle at 82% 68%, rgba(141, 21, 50, 0.11), transparent 25rem),
            linear-gradient(132deg, #fffdf8 0%, var(--cream) 42%, #f3ead9 100%);
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
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
          outline: 1px solid rgba(93, 16, 36, 0.72);
          outline-offset: 6px;
          border-radius: 999px;
        }

        .ambient-field {
          position: absolute;
          inset: 0;
          z-index: -3;
          overflow: hidden;
          pointer-events: none;
        }

        .ambient-field::before {
          content: "";
          position: absolute;
          inset: -26%;
          background:
            conic-gradient(
              from 225deg at 50% 50%,
              transparent 0deg,
              rgba(181, 150, 98, 0.24) 48deg,
              transparent 104deg,
              rgba(141, 21, 50, 0.13) 178deg,
              transparent 252deg,
              rgba(255, 255, 255, 0.72) 318deg,
              transparent 360deg
            );
          filter: blur(42px);
          opacity: 0.72;
          animation: slowSpin 34s linear infinite;
        }

        .ambient-field::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(to bottom, rgba(255,255,255,0.78), transparent 26%, transparent 68%, rgba(239,229,208,0.76)),
            repeating-linear-gradient(to bottom, rgba(101,74,53,0.025) 0, rgba(101,74,53,0.025) 1px, transparent 1px, transparent 8px);
          opacity: 0.72;
        }

        .wash {
          position: absolute;
          border-radius: 999px;
          filter: blur(18px);
          opacity: 0.5;
          animation: washFloat 10s ease-in-out infinite alternate;
        }

        .wash-one {
          left: -8vw;
          top: 18vh;
          width: 38vw;
          height: 38vw;
          background: radial-gradient(circle, rgba(181, 150, 98, 0.2), transparent 70%);
        }

        .wash-two {
          right: -8vw;
          bottom: 8vh;
          width: 42vw;
          height: 42vw;
          background: radial-gradient(circle, rgba(141, 21, 50, 0.13), transparent 72%);
          animation-delay: -5s;
        }

        .horizon-glow {
          position: absolute;
          left: 50%;
          bottom: -20vh;
          width: 88vw;
          height: 38vh;
          border-radius: 50%;
          background: radial-gradient(ellipse, rgba(181, 150, 98, 0.28), transparent 68%);
          transform: translateX(-50%);
          filter: blur(12px);
        }

        .central-light {
          position: absolute;
          left: 50%;
          top: 50%;
          width: min(420px, 44vw);
          height: min(760px, 82vh);
          transform: translate(-50%, -50%);
        }

        .light-core {
          position: absolute;
          left: 50%;
          top: 5%;
          bottom: 4%;
          width: 16px;
          border-radius: 999px;
          transform: translateX(-50%);
          background:
            linear-gradient(to bottom, transparent 0%, rgba(255, 255, 255, 0.98) 18%, rgba(255, 241, 190, 0.92) 48%, rgba(255, 255, 255, 0.96) 78%, transparent 100%);
          box-shadow:
            0 0 32px rgba(181, 150, 98, 0.7),
            0 0 96px rgba(141, 21, 50, 0.18),
            0 0 160px rgba(255, 255, 255, 0.88);
          animation: rayPulse 4.6s ease-in-out infinite alternate;
        }

        .light-ray {
          position: absolute;
          left: 50%;
          top: 1%;
          bottom: 0;
          width: 42%;
          transform: translateX(-50%);
          transform-origin: 50% 50%;
          background: linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.72) 20%, rgba(181, 150, 98, 0.18) 52%, transparent);
          filter: blur(22px);
          opacity: 0.55;
          mix-blend-mode: screen;
          animation: raySweep 7s ease-in-out infinite alternate;
        }

        .ray-a { transform: translateX(-50%) rotate(0deg); }
        .ray-b { transform: translateX(-50%) rotate(12deg); animation-delay: -3.1s; opacity: 0.34; }
        .ray-c { transform: translateX(-50%) rotate(-12deg); animation-delay: -4.5s; opacity: 0.34; }

        .light-ring {
          position: absolute;
          left: 50%;
          top: 50%;
          border: 1px solid rgba(181, 150, 98, 0.22);
          border-radius: 50%;
          transform: translate(-50%, -50%) rotateX(67deg);
          box-shadow: 0 0 42px rgba(181, 150, 98, 0.12), inset 0 0 42px rgba(255, 255, 255, 0.25);
          animation: ringTurn 16s linear infinite;
        }

        .ring-a {
          width: min(560px, 54vw);
          height: min(560px, 54vw);
        }

        .ring-b {
          width: min(760px, 74vw);
          height: min(760px, 74vw);
          opacity: 0.58;
          animation-duration: 24s;
          animation-direction: reverse;
        }

        .particle-field {
          position: absolute;
          inset: 0;
        }

        .particle {
          position: absolute;
          border-radius: 999px;
          background: rgba(181, 150, 98, 0.62);
          box-shadow: 0 0 12px rgba(181, 150, 98, 0.45), 0 0 28px rgba(255, 255, 255, 0.7);
          animation: particleDrift var(--duration, 12s) ease-in-out infinite alternate;
        }

        .grain {
          position: absolute;
          inset: -42%;
          background:
            radial-gradient(circle, rgba(57,42,34,0.045) 0 1px, transparent 1px),
            radial-gradient(circle, rgba(255,255,255,0.5) 0 1px, transparent 1px);
          background-size: 19px 23px, 29px 31px;
          opacity: 0.2;
          animation: grainMove 900ms steps(2, end) infinite;
        }

        .top-brand {
          position: absolute;
          top: clamp(22px, 4.8vw, 58px);
          left: clamp(20px, 4.4vw, 74px);
          z-index: 30;
          animation: enterDown 800ms cubic-bezier(.2,.8,.2,1) both;
        }

        .top-brand a {
          display: inline-block;
          color: var(--ink);
          font-family: Georgia, "Times New Roman", Times, serif;
          font-size: clamp(3.1rem, 6.2vw, 7.2rem);
          font-weight: 400;
          line-height: 0.76;
          letter-spacing: -0.075em;
          text-shadow: 0 18px 50px rgba(181, 150, 98, 0.24);
          transition: transform 220ms ease, color 220ms ease;
        }

        .top-brand a:hover {
          color: var(--deep-red);
          transform: translateX(4px) skewX(-4deg);
        }

        .top-nav {
          position: absolute;
          top: clamp(28px, 4.4vw, 58px);
          right: clamp(18px, 4vw, 68px);
          z-index: 31;
          min-height: 48px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 6px;
          border: 1px solid rgba(101, 74, 53, 0.14);
          border-radius: 999px;
          background: rgba(255, 253, 248, 0.62);
          box-shadow: 0 18px 70px rgba(101, 74, 53, 0.12), inset 0 0 22px rgba(255, 255, 255, 0.62);
          backdrop-filter: blur(18px);
        }

        .top-nav a {
          min-height: 36px;
          display: inline-flex;
          align-items: center;
          padding: 0 16px;
          border-radius: 999px;
          color: rgba(57, 42, 34, 0.6);
          font-size: clamp(0.72rem, 0.88vw, 0.88rem);
          letter-spacing: 0.045em;
          transition: color 180ms ease, background 180ms ease, transform 180ms ease, box-shadow 180ms ease;
        }

        .top-nav a:hover,
        .top-nav a.active {
          color: var(--deep-red);
          background: rgba(255, 255, 255, 0.74);
          box-shadow: inset 0 0 18px rgba(181, 150, 98, 0.13), 0 8px 28px rgba(101, 74, 53, 0.08);
          transform: translateY(-1px);
        }

        .ray-logo {
          position: absolute;
          left: 50%;
          top: 50%;
          z-index: 8;
          width: min(440px, 42vw);
          transform: translate(-50%, -50%);
          pointer-events: none;
          animation: logoFloat 7s ease-in-out infinite alternate;
        }

        .logo-glass {
          position: relative;
          width: 100%;
          aspect-ratio: 1149 / 912;
          display: grid;
          place-items: center;
        }

        .logo-glass::before {
          content: "";
          position: absolute;
          inset: 18% 10% 10%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.94), rgba(181, 150, 98, 0.12) 52%, transparent 70%);
          filter: blur(20px);
        }

        .logo-image {
          position: relative;
          width: 100%;
          height: auto;
          object-fit: contain;
        }

        .card-stage {
          position: absolute;
          inset: clamp(122px, 12vw, 160px) clamp(20px, 4vw, 72px) clamp(104px, 9vw, 132px);
          z-index: 14;
          display: grid;
          place-items: center;
          perspective: 1500px;
          transform-style: preserve-3d;
          touch-action: pan-y;
          cursor: grab;
        }

        .card-stage:active {
          cursor: grabbing;
        }

        .orbit-shadow {
          position: absolute;
          left: 50%;
          bottom: 8%;
          width: min(620px, 62vw);
          height: 88px;
          transform: translateX(-50%) rotateX(72deg);
          border-radius: 50%;
          background: radial-gradient(ellipse, rgba(181, 150, 98, 0.22), rgba(93, 16, 36, 0.09) 44%, transparent 72%);
          filter: blur(18px);
          animation: shadowBreathe 5.8s ease-in-out infinite alternate;
        }

        .float-card {
          position: absolute;
          width: clamp(276px, 27vw, 432px);
          min-height: clamp(210px, 22vw, 308px);
          opacity: var(--opacity);
          transform:
            translate3d(var(--x), var(--y), var(--z))
            rotateY(var(--ry))
            rotateZ(var(--rot))
            scale(var(--scale));
          transform-style: preserve-3d;
          filter: blur(calc(var(--abs) * 0.2px)) saturate(0.86);
          transition: transform 820ms cubic-bezier(.16,.9,.22,1), opacity 520ms ease, filter 520ms ease;
          pointer-events: none;
          animation: cardFloat 6.8s ease-in-out infinite alternate;
        }

        .float-card.active {
          z-index: 9;
          filter: blur(0) saturate(1);
          pointer-events: auto;
        }

        .float-card a {
          position: relative;
          min-height: inherit;
          display: grid;
          align-content: end;
          overflow: hidden;
          padding: clamp(22px, 2.4vw, 34px);
          border: 1px solid rgba(101, 74, 53, 0.16);
          border-radius: clamp(28px, 3vw, 44px);
          background:
            linear-gradient(130deg, rgba(255, 255, 255, 0.88), rgba(255, 255, 255, 0.38) 47%, rgba(239, 229, 208, 0.42)),
            radial-gradient(circle at 50% 4%, rgba(255, 255, 255, 0.96), transparent 34%);
          box-shadow:
            inset 0 0 1px rgba(255, 255, 255, 0.92),
            inset 0 0 68px rgba(255, 255, 255, 0.26),
            0 34px 110px rgba(101, 74, 53, 0.2),
            0 0 70px rgba(181, 150, 98, 0.12);
          backdrop-filter: blur(24px);
          transform-style: preserve-3d;
        }

        .float-card a::before {
          content: "";
          position: absolute;
          inset: -1px;
          border-radius: inherit;
          background:
            linear-gradient(112deg, transparent 0%, rgba(255, 255, 255, 0.96) 14%, transparent 30%),
            radial-gradient(circle at 28% 16%, rgba(181, 150, 98, 0.18), transparent 38%);
          opacity: 0.7;
          transform: translateX(-64%);
          mix-blend-mode: screen;
          animation: glassSweep 6s cubic-bezier(.68,0,.2,1) infinite;
        }

        .float-card a::after {
          content: "";
          position: absolute;
          inset: 12px;
          border: 1px solid rgba(101, 74, 53, 0.08);
          border-radius: calc(clamp(28px, 3vw, 44px) - 11px);
        }

        .card-eyebrow,
        .card-title,
        .card-note {
          position: relative;
          z-index: 2;
        }

        .card-eyebrow {
          position: absolute;
          left: clamp(22px, 2.4vw, 34px);
          top: clamp(20px, 2.2vw, 30px);
          color: var(--faint-ink);
          font-size: 0.76rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .card-title {
          display: block;
          color: var(--deep-red);
          font-family: Georgia, "Times New Roman", Times, serif;
          font-size: clamp(2.7rem, 4.8vw, 5.8rem);
          font-weight: 400;
          line-height: 0.9;
          letter-spacing: -0.08em;
          text-shadow: 0 16px 42px rgba(181, 150, 98, 0.18);
        }

        .card-note {
          display: block;
          max-width: 29ch;
          margin-top: 16px;
          color: var(--soft-ink);
          font-size: clamp(0.9rem, 1vw, 1rem);
          line-height: 1.55;
        }

        .stage-controls {
          position: absolute;
          left: 50%;
          bottom: 0;
          z-index: 18;
          display: inline-flex;
          align-items: center;
          gap: 16px;
          padding: 7px;
          border: 1px solid rgba(101, 74, 53, 0.13);
          border-radius: 999px;
          background: rgba(255, 253, 248, 0.68);
          box-shadow: 0 18px 60px rgba(101, 74, 53, 0.12), inset 0 0 22px rgba(255, 255, 255, 0.72);
          backdrop-filter: blur(16px);
          transform: translateX(-50%);
        }

        .stage-controls > button {
          min-height: 34px;
          padding: 0 12px;
          border-radius: 999px;
          color: rgba(57, 42, 34, 0.46);
          font-size: 0.72rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          transition: color 160ms ease, transform 160ms ease, background 160ms ease;
        }

        .stage-controls > button:hover {
          color: var(--deep-red);
          background: rgba(255, 255, 255, 0.66);
          transform: translateY(-1px);
        }

        .stage-dots {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .stage-dots button {
          width: 8px;
          height: 8px;
          padding: 0;
          border: 1px solid rgba(93, 16, 36, 0.32);
          border-radius: 999px;
          transition: width 220ms ease, background 220ms ease, border-color 220ms ease, box-shadow 220ms ease;
        }

        .stage-dots button.active {
          width: 31px;
          border-color: rgba(93, 16, 36, 0.72);
          background: var(--deep-red);
          box-shadow: 0 0 24px rgba(141, 21, 50, 0.18);
        }

        .side-menu {
          position: absolute;
          left: clamp(20px, 4.4vw, 74px);
          bottom: clamp(92px, 10vw, 136px);
          z-index: 22;
          width: min(250px, 24vw);
        }

        .side-menu p {
          margin: 0 0 20px;
          color: rgba(57, 42, 34, 0.62);
          font-size: 0.76rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .side-menu nav {
          display: grid;
          gap: 12px;
        }

        .side-menu a {
          width: max-content;
          max-width: 100%;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: rgba(93, 16, 36, 0.46);
          font-size: clamp(0.86rem, 1vw, 0.98rem);
          letter-spacing: 0.04em;
          transition: transform 180ms ease, color 180ms ease, padding-left 180ms ease;
        }

        .side-menu a:hover,
        .side-menu a.active {
          color: var(--deep-red);
          transform: translateX(8px);
        }

        .side-menu a.active {
          padding-left: 8px;
        }

        .home-footer {
          position: absolute;
          right: clamp(20px, 4vw, 72px);
          bottom: clamp(38px, 4.6vw, 62px);
          z-index: 26;
        }

        .home-footer nav {
          display: flex;
          align-items: center;
          gap: clamp(14px, 2vw, 26px);
          color: rgba(57, 42, 34, 0.42);
          font-size: 0.78rem;
        }

        .home-footer a {
          transition: color 180ms ease, transform 180ms ease;
        }

        .home-footer a:hover {
          color: var(--deep-red);
          transform: translateY(-1px);
        }

        @keyframes slowSpin {
          from { transform: rotate(0deg) scale(1); }
          to { transform: rotate(360deg) scale(1.05); }
        }

        @keyframes washFloat {
          from { transform: translate3d(-1vw, 1vh, 0) scale(0.96); }
          to { transform: translate3d(2vw, -2vh, 0) scale(1.05); }
        }

        @keyframes rayPulse {
          from { opacity: 0.72; transform: translateX(-50%) scaleY(0.94); }
          to { opacity: 1; transform: translateX(-50%) scaleY(1.04); }
        }

        @keyframes raySweep {
          from { opacity: 0.28; filter: blur(26px); }
          to { opacity: 0.66; filter: blur(18px); }
        }

        @keyframes ringTurn {
          from { transform: translate(-50%, -50%) rotateX(67deg) rotateZ(0deg); }
          to { transform: translate(-50%, -50%) rotateX(67deg) rotateZ(360deg); }
        }

        @keyframes particleDrift {
          from { opacity: 0.18; transform: translate3d(-10px, 12px, 0) scale(0.7); }
          to { opacity: 0.82; transform: translate3d(18px, -28px, 0) scale(1.22); }
        }

        @keyframes grainMove {
          0% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(-2%, 1%, 0); }
          100% { transform: translate3d(1%, -2%, 0); }
        }

        @keyframes enterDown {
          from { opacity: 0; transform: translateY(-16px); filter: blur(8px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }

        @keyframes logoFloat {
          from { transform: translate(-50%, -49%) scale(0.985); }
          to { transform: translate(-50%, -51%) scale(1.015); }
        }

        @keyframes shadowBreathe {
          from { opacity: 0.45; transform: translateX(-50%) rotateX(72deg) scaleX(0.86); }
          to { opacity: 0.78; transform: translateX(-50%) rotateX(72deg) scaleX(1.1); }
        }

        @keyframes cardFloat {
          from { margin-top: 0; }
          to { margin-top: -12px; }
        }

        @keyframes glassSweep {
          0%, 42% { transform: translateX(-72%); opacity: 0; }
          55% { opacity: 0.74; }
          75%, 100% { transform: translateX(76%); opacity: 0; }
        }

        @media (max-width: 980px) {
          .tarayai-home {
            min-height: 100svh;
            overflow-y: auto;
            overflow-x: hidden;
            display: grid;
            gap: 24px;
            padding: 22px 16px 30px;
          }

          .top-brand,
          .top-nav,
          .ray-logo,
          .card-stage,
          .side-menu,
          .home-footer {
            position: relative;
            inset: auto;
            transform: none;
          }

          .top-brand {
            order: 1;
          }

          .top-brand a {
            font-size: clamp(3rem, 14vw, 5.2rem);
          }

          .top-nav {
            order: 2;
            justify-self: start;
            flex-wrap: wrap;
          }

          .ray-logo {
            order: 3;
            left: auto;
            top: auto;
            width: min(420px, 90vw);
            justify-self: center;
            margin-top: 2vh;
          }

          .card-stage {
            order: 4;
            min-height: 500px;
            padding: 0;
            overflow: hidden;
          }

          .float-card {
            width: min(86vw, 390px);
            min-height: 250px;
          }

          .side-menu {
            order: 5;
            width: 100%;
          }

          .side-menu nav {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
          }

          .side-menu a {
            padding: 10px 13px;
            border: 1px solid rgba(101, 74, 53, 0.12);
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.5);
          }

          .side-menu a:hover,
          .side-menu a.active {
            transform: translateY(-1px);
            padding-left: 13px;
          }

          .home-footer {
            order: 6;
            justify-self: start;
            margin-top: 8px;
          }

          .home-footer nav {
            flex-wrap: wrap;
          }
        }

        @media (max-width: 620px) {
          .tarayai-home {
            padding: 20px 14px 28px;
          }

          .top-nav {
            width: 100%;
            justify-content: space-between;
          }

          .top-nav a {
            padding: 0 11px;
            font-size: 0.7rem;
          }

          .card-stage {
            min-height: 470px;
            perspective: 1000px;
          }

          .float-card {
            width: min(90vw, 338px);
            min-height: 230px;
          }

          .float-card {
            transform:
              translate3d(calc(var(--rel) * 142px), var(--y), var(--z))
              rotateY(calc(var(--rel) * -18deg))
              rotateZ(calc(var(--rel) * -7deg))
              scale(var(--scale));
          }

          .card-title {
            font-size: clamp(2.45rem, 15vw, 4.5rem);
          }

          .stage-controls {
            width: min(100%, 338px);
            justify-content: space-between;
            gap: 8px;
          }

          .home-footer nav {
            gap: 14px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ambient-field::before,
          .wash,
          .light-core,
          .light-ray,
          .light-ring,
          .particle,
          .grain,
          .top-brand,
          .ray-logo,
          .orbit-shadow,
          .float-card,
          .float-card a::before {
            animation: none !important;
          }

          .top-brand a,
          .top-nav a,
          .float-card,
          .stage-controls > button,
          .stage-dots button,
          .side-menu a,
          .home-footer a {
            transition: none !important;
          }
        }
      `}</style>

      <AmbientField />
      <TopBrand />
      <TopNav activeIndex={activeIndex} setActiveIndex={setActiveIndex} />
      <RayLogo />
      <FloatingCards activeIndex={activeIndex} setActiveIndex={setActiveIndex} />
      <SideMenu activeIndex={activeIndex} setActiveIndex={setActiveIndex} />
      <FooterLinks />
    </main>
  );
}
