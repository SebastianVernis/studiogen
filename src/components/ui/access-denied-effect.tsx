
"use client";

import { Ban, Lock, AlertOctagon } from 'lucide-react';
import React, { useEffect, useState, ComponentType } from 'react';

interface IconConfig {
  id: number;
  IconComponent: ComponentType<{ className?: string; style?: React.CSSProperties; size?: number; fill?: string }>;
  style: React.CSSProperties;
  delay: string;
  duration: string;
  size: number;
  color: string;
}

const availableIcons = [
  { component: Ban, color: "hsl(var(--destructive))" }, 
  { component: Lock, color: "hsl(var(--muted-foreground))" },
  { component: AlertOctagon, color: "hsl(var(--destructive))" }
];

const AccessDeniedEffect: React.FC<{ onAnimationEnd: () => void; animationKey: number }> = ({ onAnimationEnd, animationKey }) => {
  const [icons, setIcons] = useState<IconConfig[]>([]);
  const numIcons = 8; 

  useEffect(() => {
    const newIcons: IconConfig[] = [];
    for (let i = 0; i < numIcons; i++) {
      const selectedIcon = availableIcons[Math.floor(Math.random() * availableIcons.length)];
      newIcons.push({
        id: i,
        IconComponent: selectedIcon.component,
        style: {
          left: `${Math.random() * 85 + 7.5}%`, 
          top: `${Math.random() * 30 - 10}%`, 
        },
        delay: `${Math.random() * 0.5}s`,      
        duration: `${1.5 + Math.random() * 1.0}s`, 
        size: Math.floor(Math.random() * 10 + 24), 
        color: selectedIcon.color,
      });
    }
    setIcons(newIcons);

    const longestDuration = 1.5 + 1.0 + 0.5;
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
          className="absolute animate-shake-pulse" // Using the new animation
          style={{
            ...iconItem.style,
            animationDelay: iconItem.delay,
            animationDuration: iconItem.duration,
            width: iconItem.size,
            height: iconItem.size,
            color: iconItem.color,
            fill: iconItem.IconComponent === Ban || iconItem.IconComponent === AlertOctagon ? iconItem.color : "none",
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
};

export default AccessDeniedEffect;
