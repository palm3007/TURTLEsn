
import React, { useState } from 'react';
import { Room, RoomType } from '../types';
import Avatar from './Avatar';

interface ChatListProps {
  rooms: Room[];
  currentRoomId: string | null;
  onSelectRoom: (room: Room) => void;
  currentUser: { nickname: string; avatarId: number; peerId?: string };
  onOpenSettings: () => void;
  onFindUser: (query: string) => void;
  isMobileMenuOpen: boolean;
  closeMobileMenu: () => void;
  onCreateRoom: () => void;
  onInviteFriend: () => void;
  isGlass: boolean;
  useTor: boolean;
}

const ChatList: React.FC<ChatListProps> = ({ 
  rooms, 
  currentRoomId, 
  onSelectRoom, 
  currentUser, 
  onOpenSettings,
  onFindUser,
  isMobileMenuOpen,
  closeMobileMenu,
  onCreateRoom,
  onInviteFriend,
  isGlass,
  useTor
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  const filteredRooms = rooms.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isSearching = searchTerm.length > 0;

  const copyPeerId = () => {
    if (currentUser.peerId) {
      navigator.clipboard.writeText(currentUser.peerId);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const getRoomIcon = (type: RoomType) => {
    switch(type) {
      case 'CHANNEL': return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-yellow-500 ml-1">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" clipRule="evenodd" />
        </svg> 
      ); 
      case 'GROUP': return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-blue-500 ml-1">
          <path d="M7 8a3 3 0 100-6 3 3 0 000 6zM14.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.532-2.433 2.87 2.87 0 00-1.952 1.3 6 6 0 00-9.01 2.308zM11.136 16.975a3 3 0 115.728 0 3 3 0 00-5.728 0z" />
        </svg>
      );
      default: return null;
    }
  }
  
  const bgClass = isGlass 
    ? "bg-gray-900/50 backdrop-blur-xl border-r border-white/10" 
    : "bg-gray-800 border-r border-gray-700";

  const cardBgClass = isGlass
    ? "bg-white/5 border border-white/10"
    : "bg-gray-900/50 border border-gray-700/50";

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-30 w-80 transform transition-transform duration-300 ease-in-out flex flex-col
      ${bgClass}
      ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      md:translate-x-0 md:static
    `}>
      {/* Header */}
      <div className={`p-4 border-b ${isGlass ? 'border-white/10' : 'border-gray-700'}`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            TURTLEsn
            {useTor && (
               <span className="flex h-2 w-2 relative" title="Tor Routing Active">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
               </span>
            )}
          </h2>
          <div className="flex items-center gap-2">
             <button
               onClick={onCreateRoom}
               className={`p-1.5 rounded-lg transition-colors ${isGlass ? 'hover:bg-white/10 text-gray-300' : 'bg-gray-700 text-gray-300 hover:text-white'}`}
               title="Создать Группу/Канал"
             >
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
               </svg>
             </button>
             <button 
               onClick={closeMobileMenu}
               className="md:hidden text-gray-400 hover:text-white"
             >
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
               </svg>
             </button>
          </div>
        </div>
        
        {/* My ID Card */}
        <div className={`${cardBgClass} rounded-lg p-3 mb-4`}>
          <p className="text-xs text-gray-400 mb-1 uppercase font-semibold tracking-wider">
             {useTor ? 'Мой ID (Tor Protected)' : 'Мой ID (для друзей)'}
          </p>
          <div className="flex items-center justify-between group cursor-pointer" onClick={copyPeerId}>
             <span className={`text-xs font-mono truncate mr-2 select-all ${useTor ? 'text-purple-300' : 'text-blue-300'}`}>
               {currentUser.peerId || 'Подключение...'}
             </span>
             {currentUser.peerId && (
               <button className="text-gray-500 group-hover:text-white transition-colors">
                  {copySuccess ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="green" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                    </svg>
                  )}
               </button>
             )}
          </div>
        </div>

        <div className="relative">
          <input 
            type="text"
            placeholder="Поиск ID или названия..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full text-sm rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder-gray-500 ${isGlass ? 'bg-black/20 border border-white/5 text-white' : 'bg-gray-900 border border-gray-700'}`}
          />
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 absolute left-3 top-2.5 text-gray-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
      </div>

      {/* Rooms List */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-1">
        
        {/* ZERO STATE: No Chats */}
        {!isSearching && rooms.length === 0 && (
           <div className="flex flex-col items-center justify-center h-64 p-6 text-center animate-fade-in">
              <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mb-4">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-8 h-8 text-gray-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                 </svg>
              </div>
              <h3 className="text-white font-semibold mb-2">Нет чатов</h3>
              <p className="text-xs text-gray-400 mb-4">Ваш список сообщений пуст. Пригласите друга, чтобы начать общение.</p>
              <button
                 onClick={onInviteFriend}
                 className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-blue-900/20 transition-all"
              >
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25v1.75a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25v-1.75z" />
                 </svg>
                 Добавить друга
              </button>
           </div>
        )}

        {/* Found User Action */}
        {isSearching && filteredRooms.length === 0 && (
          <button
            onClick={() => {
              onFindUser(searchTerm);
              setSearchTerm('');
              closeMobileMenu();
            }}
            className="w-full flex items-center p-3 rounded-xl bg-blue-900/30 border border-blue-800/50 hover:bg-blue-900/50 transition-colors mb-2 text-left group"
          >
             <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-600/20 group-hover:scale-105 transition-transform">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
               </svg>
             </div>
             <div className="ml-3">
               <h3 className="text-sm font-semibold text-blue-200">Найти: {searchTerm}</h3>
               <p className="text-xs text-blue-400 truncate">Добавить ID или создать чат</p>
             </div>
          </button>
        )}

        {filteredRooms.map((room) => {
          const isActive = currentRoomId === room.id;
          const activeClass = isGlass 
             ? (isActive ? 'bg-white/10 shadow-lg border border-white/5' : 'hover:bg-white/5')
             : (isActive ? 'bg-gray-700/60 ring-1 ring-gray-600 shadow-md' : 'hover:bg-gray-700/30');

          return (
            <button
              key={room.id}
              onClick={() => {
                onSelectRoom(room);
                closeMobileMenu();
              }}
              className={`w-full flex items-center p-3 rounded-xl transition-all text-left group relative ${activeClass}`}
            >
              <div className="relative">
                 {room.botPersona.customAvatar ? (
                    <img src={`data:image/jpeg;base64,${room.botPersona.customAvatar}`} className="w-8 h-8 rounded-full object-cover" alt="avatar"/>
                 ) : (
                    <Avatar avatarId={room.botPersona.avatarId} size="sm" />
                 )}
                 {/* Status Indicator */}
                 <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-gray-800 rounded-full ${
                   room.isP2P 
                      ? (room.isConnected ? 'bg-green-500' : 'bg-red-500') 
                      : 'bg-green-500'
                 }`}></div>
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                  <h3 className={`text-sm font-semibold truncate flex items-center ${isActive ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                    {room.name}
                    {getRoomIcon(room.type)}
                  </h3>
                  {room.isP2P && (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-3 h-3 shrink-0 ml-1 ${useTor ? 'text-purple-400' : 'text-emerald-400'}`}>
                      <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate group-hover:text-gray-400">
                  {room.isP2P && !room.isConnected ? 'Нет связи' : room.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* User Profile / Footer */}
      <div className={`p-4 border-t ${isGlass ? 'border-white/10 bg-black/20' : 'border-gray-700 bg-gray-800/50'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center min-w-0">
            {currentUser.avatarId ? (
               <Avatar avatarId={currentUser.avatarId} size="sm" />
            ) : null}
            <div className="ml-3 truncate">
              <p className="text-sm font-medium text-white truncate">{currentUser.nickname}</p>
              <p className="text-xs text-green-400 flex items-center">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5 animate-pulse"></span>
                {useTor ? 'Tor Включен' : 'В сети'}
              </p>
            </div>
          </div>
          <button 
            onClick={() => {
              onOpenSettings();
              closeMobileMenu();
            }}
            className={`ml-2 p-2 text-gray-400 hover:text-white rounded-lg transition-colors ${isGlass ? 'hover:bg-white/10' : 'hover:bg-gray-700'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default ChatList;
