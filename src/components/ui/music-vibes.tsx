
"use client";

import { Music2, Disc3, ActivitySquare } from 'lucide-react';
import React, { useEffect, useState, ComponentType } from 'react';

interface IconConfig {
  id: number;
  IconComponent: ComponentType<{ className?: string; style?: React.CSSProperties; size?: number; fill?: string; strokeWidth?: number }>;
  style: React.CSSProperties;
  delay: string;
  duration: string;
  size: number;
  color: string;
}

const availableIcons = [
  { component: Music2, color: "hsl(var(--accent))" }, 
  { component: Disc3, color: "hsl(var(--primary))" },
  { component: ActivitySquare, color: "hsl(var(--secondary))" }
];

const MusicVibes: React.FC<{ onAnimationEnd: () => void; animationKey: number }> = ({ onAnimationEnd, animationKey }) => {
  const [icons, setIcons] = useState<IconConfig[]>([]);
  const numIcons = 10; 

  useEffect(() => {
    const newIcons: IconConfig[] = [];
    for (let i = 0; i < numIcons; i++) {
      const selectedIcon = availableIcons[Math.floor(Math.random() * availableIcons.length)];
      newIcons.push({
        id: i,
        IconComponent: selectedIcon.component,
        style: {
          left: `${Math.random() * 90 + 5}%`, 
          top: `${Math.random() * 40 - 20}%`,
        },
        delay: `${Math.random() * 1}s`,      
        duration: `${1.8 + Math.random() * 1.5}s`, 
        size: Math.floor(Math.random() * 12 + 22), 
        color: selectedIcon.color,
      });
    }
    setIcons(newIcons);

    const longestDuration = 1.8 + 1.5 + 1; 
    const timer = setTimeout(() => {
      onAnimationEnd();
    }, longestDuration * 1000 + 500);

    return () => clearTimeout(timer);
  }, [animationKey, onAnimationEnd]);

  return (
    <div className="absolute inset-x-0 top-0 h-48 sm:h-64 overflow-hidden pointer-events-none z-50">
      {icons.map((iconItem) => (
        <iconItem.IconComponent
          key={iconItem.id}
          className="absolute animate-float-up-fade"
          style={{
            ...iconItem.style,
            animationDelay: iconItem.delay,
            animationDuration: iconItem.duration,
            width: iconItem.size,
            height: iconItem.size,
            color: iconItem.IconComponent === Disc3 ? undefined : iconItem.color, // Disc3 uses fill
            fill: iconItem.IconComponent === Disc3 ? iconItem.color : "none",
            strokeWidth: iconItem.IconComponent === Disc3 ? 1 : 2,
            opacity: 0, 
          }}
        />
      ))}
    </div>
  );
};

export default MusicVibes;
