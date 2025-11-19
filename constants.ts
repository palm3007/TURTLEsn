
import { Room, BotPersona, ThemeColor, Wallpaper, UserSettings } from './types';

// Helper to generate Picsum URL
export const getAvatarUrl = (id: number, size: number = 100) => 
  `https://picsum.photos/id/${id + 50}/${size}/${size}`;

export const AVATAR_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

export const DEFAULT_SETTINGS: UserSettings = {
  fontSize: 'base',
  themeColor: 'blue',
  wallpaper: 'default',
  isGlass: true,
  useTor: false,
  privacy: {
    allowCalls: true,
    showTyping: true,
    showOnlineStatus: true,
    sendReadReceipts: true,
    allowDirectMessages: 'EVERYONE',
    autoDeleteAfter: undefined
  }
};

export const ROOMS: Room[] = [];

export const THEME_COLORS: Record<ThemeColor, { primary: string; hover: string; text: string; border: string; ring: string }> = {
  blue: { primary: 'bg-blue-600', hover: 'hover:bg-blue-500', text: 'text-blue-400', border: 'border-blue-500', ring: 'focus:ring-blue-500' },
  purple: { primary: 'bg-purple-600', hover: 'hover:bg-purple-500', text: 'text-purple-400', border: 'border-purple-500', ring: 'focus:ring-purple-500' },
  green: { primary: 'bg-emerald-600', hover: 'hover:bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-500', ring: 'focus:ring-emerald-500' },
  orange: { primary: 'bg-orange-600', hover: 'hover:bg-orange-500', text: 'text-orange-400', border: 'border-orange-500', ring: 'focus:ring-orange-500' },
  pink: { primary: 'bg-pink-600', hover: 'hover:bg-pink-500', text: 'text-pink-400', border: 'border-pink-500', ring: 'focus:ring-pink-500' },
};

export const WALLPAPERS: Record<Wallpaper, string> = {
  'default': 'bg-gray-900',
  'gradient-blue': 'bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900',
  'gradient-purple': 'bg-gradient-to-bl from-gray-900 via-purple-900 to-gray-900',
  'abstract': 'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-gray-700 via-gray-900 to-black',
  'stars': 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-800 via-gray-950 to-black',
};
