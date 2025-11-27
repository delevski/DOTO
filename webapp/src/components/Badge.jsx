import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { getBadgeById } from '../utils/badges';
import { useTranslation } from '../utils/translations';

export default function Badge({ badgeId, earned = false, size = 'md', className = '' }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const t = useTranslation();
  const badge = getBadgeById(badgeId);
  
  if (!badge) {
    console.warn(`Badge not found: ${badgeId}`);
    return null;
  }
  
  if (!badge.icon) {
    console.warn(`Badge icon missing for: ${badgeId}`);
    return null;
  }
  
  const Icon = badge.icon;
  const badgeName = t(badge.name);
  const badgeDescription = t(badge.description);
  const sizeClasses = {
    sm: 'w-12 h-12 text-lg',
    md: 'w-16 h-16 text-xl',
    lg: 'w-20 h-20 text-2xl',
  };
  
  const iconSizeClasses = {
    sm: 20,
    md: 28,
    lg: 36,
  };
  
  return (
    <div 
      className={`relative flex flex-col items-center ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Badge Container */}
      <div 
        className={`
          relative ${sizeClasses[size]} rounded-full 
          flex items-center justify-center
          transition-all duration-300
          ${earned 
            ? `bg-gradient-to-br ${badge.gradient} shadow-lg cursor-pointer hover:scale-110 hover:shadow-xl` 
            : 'bg-gray-200 dark:bg-gray-700 opacity-50 cursor-not-allowed'
          }
          ${earned ? 'animate-pulse-slow' : ''}
        `}
        style={earned ? {
          boxShadow: showTooltip ? `0 0 20px ${badge.glowColor}` : '0 4px 6px rgba(0, 0, 0, 0.1)',
        } : {}}
      >
        {/* Inner glow effect for earned badges */}
        {earned && (
          <div 
            className="absolute inset-0 rounded-full opacity-30"
            style={{
              background: `radial-gradient(circle, ${badge.glowColor} 0%, transparent 70%)`,
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          />
        )}
        
        {/* Icon or Lock */}
        <div className="relative z-10">
          {earned ? (
            <Icon size={iconSizeClasses[size]} className="text-white drop-shadow-lg" />
          ) : (
            <Lock size={iconSizeClasses[size] * 0.8} className="text-gray-500 dark:text-gray-400" />
          )}
        </div>
        
        {/* Shine effect overlay for earned badges */}
        {earned && (
          <div 
            className="absolute inset-0 rounded-full opacity-20"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%)',
            }}
          />
        )}
      </div>
      
      {/* Badge Name */}
      <span 
        className={`
          mt-2 text-xs font-medium text-center max-w-[80px] 
          ${earned 
            ? 'text-gray-700 dark:text-gray-300' 
            : 'text-gray-400 dark:text-gray-600'
          }
        `}
      >
        {badgeName}
      </span>
      
      {/* Tooltip */}
      {showTooltip && earned && (
        <div 
          className={`
            absolute bottom-full mb-2 px-3 py-2 
            bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg
            shadow-xl z-50 whitespace-nowrap
            pointer-events-none
            animate-fade-in
          `}
          style={{
            transform: 'translateX(-50%)',
            left: '50%',
          }}
        >
          <div className="font-semibold mb-1">{badgeName}</div>
          <div className="text-gray-300 dark:text-gray-400 text-[10px]">
            {badgeDescription}
          </div>
          {/* Tooltip arrow */}
          <div 
            className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1"
            style={{
              width: 0,
              height: 0,
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: '6px solid rgb(17, 24, 39)',
            }}
          />
        </div>
      )}
      
    </div>
  );
}

