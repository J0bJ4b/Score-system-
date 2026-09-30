import React from 'react';
import { SchoolLogoType, SchoolSettings } from '../types';
import { School } from 'lucide-react';

interface SchoolLogoProps {
  settings?: SchoolSettings;
  logoUrl?: string;
  logoType?: SchoolLogoType;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  alt?: string;
}

export const SchoolLogo: React.FC<SchoolLogoProps> = ({
  settings,
  logoUrl,
  logoType,
  className = '',
  size = 'md',
  alt = 'ตราโรงเรียน',
}) => {
  const effectiveUrl = logoUrl !== undefined ? logoUrl : settings?.logo_url;
  const effectiveType: SchoolLogoType = logoType || settings?.logo_type || (effectiveUrl ? 'custom' : 'garuda');

  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  }[size];

  // If custom logo image is provided
  if (effectiveType === 'custom' && effectiveUrl) {
    return (
      <img
        src={effectiveUrl}
        alt={alt}
        className={`object-contain rounded-lg ${sizeClasses} ${className}`}
        onError={(e) => {
          // Fallback to School icon on error
          e.currentTarget.style.display = 'none';
        }}
      />
    );
  }

  // Garuda Emblem (สพฐ. / ราชการ)
  if (effectiveType === 'garuda') {
    return (
      <svg
        viewBox="0 0 100 100"
        className={`shrink-0 ${sizeClasses} ${className}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="50" cy="50" r="46" fill="#FDF8E7" stroke="#D97706" strokeWidth="2.5" />
        <circle cx="50" cy="50" r="40" stroke="#B45309" strokeWidth="1" strokeDasharray="3 2" />
        {/* Crown & Head */}
        <path d="M50 16 L54 28 L64 28 L56 36 L59 48 L50 42 L41 48 L44 36 L36 28 L46 28 Z" fill="#D97706" />
        {/* Torso & Wings */}
        <path
          d="M50 36 C42 42 22 46 18 36 C22 52 38 56 46 56 L46 68 L54 68 L54 56 C62 56 78 52 82 36 C78 46 58 42 50 36 Z"
          fill="#B45309"
        />
        {/* Tail feathers */}
        <circle cx="50" cy="62" r="11" fill="#D97706" />
        <path d="M44 60 Q50 52 56 60 Q50 68 44 60 Z" fill="#FEF08A" />
        <path d="M32 72 C42 80 58 80 68 72" stroke="#B45309" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  // Education Wheel / Flame (กระทรวงศึกษาธิการ)
  if (effectiveType === 'education') {
    return (
      <svg
        viewBox="0 0 100 100"
        className={`shrink-0 ${sizeClasses} ${className}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="50" cy="50" r="46" fill="#EFF6FF" stroke="#1D4ED8" strokeWidth="2.5" />
        <circle cx="50" cy="50" r="41" stroke="#3B82F6" strokeWidth="1" strokeDasharray="4 2" />
        <path
          d="M50 18 C50 18 64 34 64 50 C64 58 58 64 50 64 C42 64 36 58 36 50 C36 34 50 18 50 18 Z"
          fill="#F59E0B"
        />
        <path
          d="M50 30 C50 30 58 40 58 50 C58 54 55 58 50 58 C45 58 42 54 42 50 C42 40 50 30 50 30 Z"
          fill="#DC2626"
        />
        <circle cx="50" cy="50" r="6" fill="#FEF08A" />
        <path d="M30 74 H70 V78 H30 Z" fill="#1D4ED8" />
        <path d="M36 66 L50 74 L64 66" stroke="#1D4ED8" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      </svg>
    );
  }

  // Official Seal / Wreath
  if (effectiveType === 'seal') {
    return (
      <svg
        viewBox="0 0 100 100"
        className={`shrink-0 ${sizeClasses} ${className}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="50" cy="50" r="46" fill="#F0FDF4" stroke="#059669" strokeWidth="2.5" />
        <circle cx="50" cy="50" r="38" stroke="#10B981" strokeWidth="1.5" strokeDasharray="3 3" />
        <path
          d="M50 28 L54 40 L66 40 L56 48 L60 60 L50 52 L40 60 L44 48 L34 40 L46 40 Z"
          fill="#059669"
        />
        <circle cx="50" cy="50" r="4" fill="#A7F3D0" />
        <path
          d="M24 64 C24 76 36 84 50 84 C64 84 76 76 76 64"
          stroke="#047857"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // Default / None: Crisp Building Icon
  return (
    <div
      className={`rounded-xl bg-gradient-to-br from-indigo-500 to-sky-600 text-white flex items-center justify-center shadow-xs ${sizeClasses} ${className}`}
    >
      <School className="w-3/5 h-3/5" />
    </div>
  );
};
