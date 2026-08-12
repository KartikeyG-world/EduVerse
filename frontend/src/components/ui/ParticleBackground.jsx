import React, { memo, useEffect, useState, useMemo } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';

// Read computed CSS variable as rgb hex
const getCSSColor = (varName) => {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  if (!raw) return '#6366f1';
  const [r, g, b] = raw.split(' ').map(Number);
  return `rgb(${r},${g},${b})`;
};


//  ParticleBackground
//  mode: 'ambient' (dashboard/general) | 'focus' (Focus Mode — more intense)
 
const ParticleBackground = memo(({ mode = 'ambient' }) => {
  const [init, setInit] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  // Re-read CSS vars when theme changes
  const [themeKey, setThemeKey] = useState(0);

  useEffect(() => {
    const observer = new MutationObserver(() => setThemeKey(k => k + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // this should be run only once per application lifetime
  useEffect(() => {
    initParticlesEngine(async (engine) => {
      // loadSlim loads only the features needed for most cases, 
      // keeping the bundle size smaller than loadFull.
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  const ambientOptions = useMemo(() => {
    const isStarlight = document.documentElement.getAttribute('data-theme') === 'starlight-galaxy';
    return {
      fullScreen: false,
      background: { color: { value: 'transparent' } },
    fpsLimit: isMobile ? 30 : 40,
    particles: {
      number: { value: isStarlight ? (isMobile ? 25 : 80) : (isMobile ? 12 : 38), density: { enable: true, area: 900 } },
      color: { value: [getCSSColor('--color-primary'), getCSSColor('--color-accent'), getCSSColor('--color-secondary')] },
      shape: { type: isStarlight ? 'star' : 'circle' },
      opacity: {
        value: 0.18,
        random: true,
        animation: { enable: true, speed: 0.4, minimumValue: 0.05, sync: false },
      },
      size: {
        value: { min: 1, max: 3 },
        random: true,
      },
      move: {
        enable: true,
        speed: 0.4,
        direction: 'none',
        random: true,
        straight: false,
        outModes: { default: 'out' },
      },
      links: {
        enable: !isMobile,
        distance: 130,
        color: getCSSColor('--color-primary'),
        opacity: 0.07,
        width: 1,
      },
    },
    detectRetina: !isMobile,
    };
  }, [isMobile, themeKey]);

  const focusOptions = useMemo(() => {
    const isStarlight = document.documentElement.getAttribute('data-theme') === 'starlight-galaxy';
    return {
      fullScreen: false,
      background: { color: { value: 'transparent' } },
    fpsLimit: isMobile ? 40 : 50,
    particles: {
      number: { value: isStarlight ? (isMobile ? 40 : 120) : (isMobile ? 20 : 60), density: { enable: true, area: 800 } },
      color: { value: [getCSSColor('--color-accent'), getCSSColor('--color-primary'), getCSSColor('--color-secondary')] },
      shape: { type: isStarlight ? 'star' : 'circle' },
      opacity: {
        value: 0.25,
        random: true,
        animation: { enable: true, speed: 0.8, minimumValue: 0.05, sync: false },
      },
      size: {
        value: { min: 1, max: 4 },
        random: true,
      },
      move: {
        enable: true,
        speed: 0.9,
        direction: 'none',
        random: true,
        straight: false,
        outModes: { default: 'out' },
        attract: { enable: true, rotateX: 600, rotateY: 1200 },
      },
      links: {
        enable: !isMobile,
        distance: 150,
        color: getCSSColor('--color-accent'),
        opacity: 0.12,
        width: 1,
      },
    },
    detectRetina: !isMobile,
    };
  }, [isMobile, themeKey]);

  if (!init) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <Particles
        key={`particles-${mode}-${themeKey}`}
        id={`particles-${mode}`}
        options={mode === 'focus' ? focusOptions : ambientOptions}
        className="w-full h-full absolute inset-0"
      />
    </div>
  );
});

ParticleBackground.displayName = 'ParticleBackground';
export default ParticleBackground;
