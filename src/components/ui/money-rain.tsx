
"use client";

import { DollarSign, Landmark, CreditCard } from 'lucide-react';
import React, { useEffect, useState, ComponentType } from 'react';

interface MoneyIconConfig {
  id: number;
  IconComponent: ComponentType<{ className?: string; style?: React.CSSProperties; size?: number; fill?: string; color?: string }>;
  style: React.CSSProperties;
  delay: string;
  duration: string;
  size: number;
  color: string;
}

const availableIcons = [
  { component: DollarSign, color: "hsl(var(--chart-2))" }, // Greenish
  { component: Landmark, color: "hsl(var(--primary))" },   // Purple (like primary)
  { component: CreditCard, color: "hsl(var(--accent))" }   // Pink (like accent)
];

const MoneyRain: React.FC<{ onAnimationEnd: () => void; animationKey: number }> = ({ onAnimationEnd, animationKey }) => {
  const [icons, setIcons] = useState<MoneyIconConfig[]>([]);
  const numIcons = 10; 

  useEffect(() => {
    const newIcons: MoneyIconConfig[] = [];
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
        duration: `${2 + Math.random() * 1.5}s`, 
        size: Math.floor(Math.random() * 10 + 24), 
        color: selectedIcon.color,
      });
    }
    setIcons(newIcons);

    const longestDuration = 2 + 1.5 + 1; 
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
          className="absolute animate-float-up-fade" // Reusing the float-up-fade animation
          style={{
            ...iconItem.style,
            animationDelay: iconItem.delay,
            animationDuration: iconItem.duration,
            width: iconItem.size,
            height: iconItem.size,
            color: iconItem.IconComponent === CreditCard ? undefined : iconItem.color,
            fill: iconItem.IconComponent === CreditCard ? iconItem.color : "none",
            opacity: 0, 
          }}
        />
      ))}
    </div>
  );
};

export default MoneyRain;
