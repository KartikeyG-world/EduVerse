import React, { memo, useEffect, useState, useMemo } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';


//  ParticleBackground
//  mode: 'ambient' (dashboard/general) | 'focus' (Focus Mode — more intense)
 
const ParticleBackground = memo(({ mode = 'ambient' }) => {
  const [init, setInit] = useState(false);

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

  const ambientOptions = useMemo(() => ({
    fullScreen: false,
    background: { color: { value: 'transparent' } },
    fpsLimit: 40,
    particles: {
      number: { value: 38, density: { enable: true, area: 900 } },
      color: { value: ['#6366f1', '#06b6d4', '#8b5cf6'] },
      shape: { type: 'circle' },
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
        enable: true,
        distance: 130,
        color: '#6366f1',
        opacity: 0.07,
        width: 1,
      },
    },
    detectRetina: true,
  }), []);

  const focusOptions = useMemo(() => ({
    fullScreen: false,
    background: { color: { value: 'transparent' } },
    fpsLimit: 50,
    particles: {
      number: { value: 60, density: { enable: true, area: 800 } },
      color: { value: ['#06b6d4', '#6366f1', '#a78bfa'] },
      shape: { type: 'circle' },
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
        enable: true,
        distance: 150,
        color: '#06b6d4',
        opacity: 0.12,
        width: 1,
      },
    },
    detectRetina: true,
  }), []);

  if (!init) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <Particles
        id={`particles-${mode}`}
        options={mode === 'focus' ? focusOptions : ambientOptions}
        className="w-full h-full absolute inset-0"
      />
    </div>
  );
});

ParticleBackground.displayName = 'ParticleBackground';
export default ParticleBackground;
