
"use client";

import { Heart } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface HeartConfig {
  id: number;
  style: React.CSSProperties;
  delay: string;
  duration: string;
  size: number;
}

const HeartRain: React.FC<{ onAnimationEnd: () => void; animationKey: number }> = ({ onAnimationEnd, animationKey }) => {
  const [hearts, setHearts] = useState<HeartConfig[]>([]);
  const numHearts = 7; // Number of hearts

  useEffect(() => {
    const newHearts: HeartConfig[] = [];
    for (let i = 0; i < numHearts; i++) {
      newHearts.push({
        id: i,
        style: {
          left: `${Math.random() * 90 + 5}%`, 
          top: `${Math.random() * 30 - 15}%`, 
        },
        delay: `${Math.random() * 0.8}s`,      
        duration: `${1.5 + Math.random() * 1.5}s`, 
        size: Math.floor(Math.random() * 12 + 20), 
      });
    }
    setHearts(newHearts);

    const longestDuration = 1.5 + 1.5 + 0.8; // max duration + max delay
    const timer = setTimeout(() => {
      onAnimationEnd();
    }, longestDuration * 1000 + 500); // Add a small buffer

    return () => clearTimeout(timer);
  }, [animationKey, onAnimationEnd]);

  return (
    <div className="absolute inset-x-0 top-0 h-48 sm:h-64 overflow-hidden pointer-events-none z-50">
      {hearts.map((heart) => (
        <Heart
          key={heart.id}
          className="absolute text-pink-500 animate-float-up-fade"
          style={{
            ...heart.style,
            animationDelay: heart.delay,
            animationDuration: heart.duration,
            width: heart.size,
            height: heart.size,
            opacity: 0, 
          }}
          fill="currentColor"
        />
      ))}
    </div>
  );
};

export default HeartRain;
