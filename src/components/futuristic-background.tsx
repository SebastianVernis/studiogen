"use client";

import React from 'react';

const FuturisticBackground = () => {
  return (
    <div
      className="fixed inset-0 z-[-1]"
      style={{
        backgroundColor: '#111827',
        backgroundImage: `
          linear-gradient(270deg, rgba(236, 72, 153, 0.25), rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.25)),
          linear-gradient(rgba(236, 72, 153, 0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(168, 85, 247, 0.05) 1px, transparent 1px)
        `,
        backgroundSize: `400% 400%, 35px 35px, 35px 35px`,
        animation: 'animatedGradientBackground 20s ease infinite',
      }}
      aria-hidden="true"
    />
  );
};

export default FuturisticBackground;
