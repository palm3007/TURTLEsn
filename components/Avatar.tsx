import React from 'react';
import { getAvatarUrl } from '../constants';

interface AvatarProps {
  avatarId: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  selected?: boolean;
  onClick?: () => void;
}

const Avatar: React.FC<AvatarProps> = ({ avatarId, size = 'md', selected = false, onClick }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  return (
    <div 
      className={`relative rounded-full overflow-hidden cursor-pointer transition-all duration-200 ${sizeClasses[size]} ${selected ? 'ring-4 ring-blue-500 scale-110' : 'hover:scale-105'}`}
      onClick={onClick}
    >
      <img 
        src={getAvatarUrl(avatarId)} 
        alt="avatar" 
        className="w-full h-full object-cover"
        loading="lazy"
      />
    </div>
  );
};

export default Avatar;