
export interface User {
  id: string;
  nickname: string;
  avatarId: number; // 1-20 mapped to picsum
  isSelf: boolean;
  customAvatar?: string; // Base64 string
  peerId?: string; // P2P ID
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: number;
  isSystem?: boolean;
  isEncrypted?: boolean;
  senderName?: string; // For group chats to display who sent it
  senderAvatar?: string; // Base64 or ID
  attachment?: {
    type: 'AUDIO' | 'VIDEO';
    data: string; // Base64
    duration?: number;
  };
}

export type RoomType = 'DIRECT' | 'GROUP' | 'CHANNEL';

export interface Room {
  id: string;
  name: string;
  description: string;
  onlineCount: number;
  botPersona: BotPersona; // The AI personality managing this room OR Group Info
  isPrivate?: boolean;
  isP2P?: boolean; // True if this is a real user chat
  peerId?: string; // The peer ID of the other user OR the Admin of the group
  isConnected?: boolean; // Is P2P connection active
  
  // Group/Channel specific
  type: RoomType;
  participants?: string[]; // List of PeerIDs (only relevant for Admin/Host)
  isAdmin?: boolean; // If true, I am the host of this group
}

export interface BotPersona {
  name: string;
  avatarId: number;
  systemInstruction: string;
  temperature: number;
  voiceName?: string;
  customAvatar?: string;
}

export enum AppState {
  AUTH = 'AUTH',
  CHAT_LIST = 'CHAT_LIST',
  CHAT_ROOM = 'CHAT_ROOM',
  SETTINGS = 'SETTINGS'
}

export type ThemeColor = 'blue' | 'purple' | 'green' | 'orange' | 'pink';
export type Wallpaper = 'default' | 'gradient-blue' | 'gradient-purple' | 'abstract' | 'stars';

export interface PrivacySettings {
  allowCalls: boolean; // true = everyone, false = nobody
  showTyping: boolean;
  showOnlineStatus: boolean; // New: Hide "Online" status
  sendReadReceipts: boolean; // New: Send read receipts
  allowDirectMessages: 'EVERYONE' | 'CONTACTS_ONLY'; // New: Spam protection
  autoDeleteAfter?: number; // in seconds, undefined = never
}

export interface UserSettings {
  fontSize: 'sm' | 'base' | 'lg';
  themeColor: ThemeColor;
  wallpaper: Wallpaper;
  privacy: PrivacySettings;
  isGlass: boolean; // Glassmorphism UI toggle
  useTor: boolean; // Tor routing (Relay only mode)
}

export interface P2PMessagePayload {
  type: 'CHAT' | 'KEY_EXCHANGE' | 'INFO' | 'INVITE' | 'GROUP_MSG' | 'FILE_CHUNK';
  payload: any;
  senderInfo?: { nickname: string, avatarId: number, customAvatar?: string, peerId?: string };
  roomId?: string; // For routing group messages
}

export interface StoredAccount {
  user: User;
  settings: UserSettings;
  lastActive: number;
  passwordHash?: string; // Optional password protection
  rooms?: Room[]; // Persist chat rooms/groups
}
