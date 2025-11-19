
import React, { useState } from 'react';
import { AVATAR_OPTIONS, THEME_COLORS, WALLPAPERS } from '../constants';
import Avatar from './Avatar';
import { User, UserSettings, ThemeColor, Wallpaper } from '../types';
import { generateAIAvatar } from '../services/geminiService';
import AboutModal from './AboutModal';

interface SettingsScreenProps {
  currentUser: User;
  currentSettings: UserSettings;
  onSave: (updates: Partial<User>, settings: UserSettings) => void;
  onBack: () => void;
  onLogout: () => void;
  onSwitchAccount: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ 
  currentUser, 
  currentSettings, 
  onSave, 
  onBack, 
  onLogout,
  onSwitchAccount
}) => {
  const [nickname, setNickname] = useState(currentUser.nickname);
  const [selectedAvatar, setSelectedAvatar] = useState(currentUser.avatarId);
  const [customAvatar, setCustomAvatar] = useState<string | undefined>(currentUser.customAvatar);
  const [fontSize, setFontSize] = useState<UserSettings['fontSize']>(currentSettings.fontSize);
  const [themeColor, setThemeColor] = useState<ThemeColor>(currentSettings.themeColor);
  const [wallpaper, setWallpaper] = useState<Wallpaper>(currentSettings.wallpaper);
  const [privacy, setPrivacy] = useState(currentSettings.privacy);
  const [isGlass, setIsGlass] = useState(currentSettings.isGlass);
  const [useTor, setUseTor] = useState(currentSettings.useTor);
  
  const [isSaved, setIsSaved] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  const handleSave = () => {
    onSave(
      { nickname, avatarId: selectedAvatar, customAvatar },
      { fontSize, themeColor, wallpaper, privacy, isGlass, useTor }
    );
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleGenerateAvatar = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const base64 = await generateAIAvatar(aiPrompt);
      if (base64) {
        setCustomAvatar(base64);
      }
    } catch (e) {
      alert('Не удалось сгенерировать аватар.');
    } finally {
      setIsGenerating(false);
    }
  };

  const theme = THEME_COLORS[themeColor];
  const containerClass = isGlass ? "bg-gray-900/60 backdrop-blur-xl border border-white/10 shadow-2xl" : "bg-gray-800 border border-gray-700";

  return (
    <div className={`flex-1 h-full text-gray-100 overflow-y-auto p-6 md:p-8 ${isGlass ? 'bg-transparent' : 'bg-gray-900'} relative`}>
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
      
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* Header */}
        <div className={`flex items-center justify-between border-b pb-4 ${isGlass ? 'border-white/10' : 'border-gray-800'}`}>
          <h2 className="text-2xl font-bold drop-shadow-lg">Настройки</h2>
          <button 
            onClick={onBack}
            className={`p-2 text-gray-400 hover:text-white rounded-lg transition-colors ${isGlass ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-800'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Visual Style Toggle */}
        <section className={`${containerClass} rounded-2xl p-6`}>
           <h3 className={`text-lg font-medium mb-4 ${theme.text}`}>Интерфейс</h3>
           <div className="flex items-center justify-between">
              <div>
                 <p className="text-white text-sm font-medium">Стеклянный режим (Glassmorphism)</p>
                 <p className="text-xs text-gray-400">Включить полупрозрачность и размытие</p>
              </div>
              <button 
                onClick={() => setIsGlass(!isGlass)}
                className={`w-12 h-6 rounded-full p-1 transition-colors ${isGlass ? 'bg-blue-500' : 'bg-gray-600'}`}
              >
                 <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${isGlass ? 'translate-x-6' : ''}`} />
              </button>
           </div>
        </section>

        {/* Network Security (Tor) */}
        <section className={`${containerClass} rounded-2xl p-6 border-l-4 ${useTor ? 'border-l-purple-500' : 'border-l-gray-600'}`}>
           <h3 className={`text-lg font-medium mb-4 flex items-center gap-2 ${useTor ? 'text-purple-400' : 'text-gray-400'}`}>
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
               <path d="M12 2a10 10 0 00-10 10c0 5.523 4.477 10 10 10s10-4.477 10-10A10 10 0 0012 2zm0 18a8 8 0 110-16 8 8 0 010 16zm0-14a6 6 0 100 12 6 6 0 000-12zm0 10a4 4 0 110-8 4 4 0 010 8z" />
             </svg>
             Маршрутизация Tor
           </h3>
           <div className="flex items-center justify-between">
              <div>
                 <p className="text-white text-sm font-medium">Использовать Tor Routing</p>
                 <p className="text-xs text-gray-400">
                   {useTor ? 'Активно: Ваш IP скрыт через Relay-узлы' : 'Выключено: Прямое P2P соединение (Быстрее)'}
                 </p>
              </div>
              <button 
                onClick={() => setUseTor(!useTor)}
                className={`w-12 h-6 rounded-full p-1 transition-colors ${useTor ? 'bg-purple-600' : 'bg-gray-600'}`}
              >
                 <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${useTor ? 'translate-x-6' : ''}`} />
              </button>
           </div>
        </section>

        {/* Profile Section */}
        <section className={`${containerClass} rounded-2xl p-6`}>
          <h3 className={`text-lg font-medium mb-4 ${theme.text}`}>Профиль</h3>
          
          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-3">Аватар</label>
            
            {/* AI Generator in Settings */}
            <div className="flex gap-2 mb-4">
                <input 
                  type="text" 
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  placeholder="Сгенерировать новый: Киберпанк кот..."
                  className="flex-1 bg-gray-900/50 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:ring-1 outline-none"
                />
                <button 
                   type="button"
                   onClick={handleGenerateAvatar}
                   disabled={isGenerating || !aiPrompt}
                   className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white px-4 rounded-lg text-sm"
                >
                  {isGenerating ? '...' : 'Создать'}
                </button>
            </div>

            <div className="flex flex-wrap gap-4">
               {/* Custom Avatar Slot */}
               {customAvatar && (
                  <div 
                    className="relative rounded-full overflow-hidden cursor-pointer ring-4 ring-purple-500 w-16 h-16"
                    onClick={() => { /* keep selected */ }}
                  >
                     <img src={`data:image/jpeg;base64,${customAvatar}`} className="w-full h-full object-cover" />
                     <button 
                       onClick={(e) => { e.stopPropagation(); setCustomAvatar(undefined); }}
                       className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 text-xs text-white"
                     >Сброс</button>
                  </div>
               )}
               
               {!customAvatar && AVATAR_OPTIONS.slice(0,6).map((id) => (
                  <Avatar 
                    key={id}
                    avatarId={id} 
                    size="md" 
                    selected={selectedAvatar === id}
                    onClick={() => setSelectedAvatar(id)}
                  />
               ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Никнейм</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className={`w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 ${theme.ring} transition-all`}
            />
          </div>
        </section>

        {/* Privacy Section */}
        <section className={`${containerClass} rounded-2xl p-6`}>
          <h3 className={`text-lg font-medium mb-4 ${theme.text}`}>Конфиденциальность</h3>
          
          <div className="space-y-4">
             {/* Incoming Calls */}
             <div className="flex items-center justify-between">
                <div>
                   <p className="text-white text-sm font-medium">Входящие звонки</p>
                   <p className="text-xs text-gray-500">Разрешить пользователям звонить вам</p>
                </div>
                <button 
                  onClick={() => setPrivacy(p => ({ ...p, allowCalls: !p.allowCalls }))}
                  className={`w-12 h-6 rounded-full p-1 transition-colors ${privacy.allowCalls ? 'bg-green-500' : 'bg-gray-700'}`}
                >
                   <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${privacy.allowCalls ? 'translate-x-6' : ''}`} />
                </button>
             </div>

             {/* Direct Messages Policy */}
             <div className="flex items-center justify-between border-t border-gray-700 pt-4">
                <div>
                   <p className="text-white text-sm font-medium">Кто может писать мне</p>
                   <p className="text-xs text-gray-500">Защита от спама и незнакомцев</p>
                </div>
                <div className="flex bg-gray-800 rounded-lg p-0.5">
                    <button 
                        onClick={() => setPrivacy(p => ({ ...p, allowDirectMessages: 'EVERYONE' }))}
                        className={`px-3 py-1.5 text-xs rounded-md transition-all ${privacy.allowDirectMessages === 'EVERYONE' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                        Все
                    </button>
                    <button 
                        onClick={() => setPrivacy(p => ({ ...p, allowDirectMessages: 'CONTACTS_ONLY' }))}
                        className={`px-3 py-1.5 text-xs rounded-md transition-all ${privacy.allowDirectMessages === 'CONTACTS_ONLY' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                        Контакты
                    </button>
                </div>
             </div>

             {/* Online Status */}
             <div className="flex items-center justify-between border-t border-gray-700 pt-4">
                <div>
                   <p className="text-white text-sm font-medium">Статус "В сети"</p>
                   <p className="text-xs text-gray-500">Показывать другим, когда вы онлайн</p>
                </div>
                <button 
                  onClick={() => setPrivacy(p => ({ ...p, showOnlineStatus: !p.showOnlineStatus }))}
                  className={`w-12 h-6 rounded-full p-1 transition-colors ${privacy.showOnlineStatus ? 'bg-green-500' : 'bg-gray-700'}`}
                >
                   <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${privacy.showOnlineStatus ? 'translate-x-6' : ''}`} />
                </button>
             </div>

             {/* Show Typing */}
             <div className="flex items-center justify-between border-t border-gray-700 pt-4">
                <div>
                   <p className="text-white text-sm font-medium">Индикатор печати</p>
                   <p className="text-xs text-gray-500">Показывать, когда вы набираете текст</p>
                </div>
                <button 
                  onClick={() => setPrivacy(p => ({ ...p, showTyping: !p.showTyping }))}
                  className={`w-12 h-6 rounded-full p-1 transition-colors ${privacy.showTyping ? 'bg-green-500' : 'bg-gray-700'}`}
                >
                   <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${privacy.showTyping ? 'translate-x-6' : ''}`} />
                </button>
             </div>

             {/* Read Receipts */}
             <div className="flex items-center justify-between border-t border-gray-700 pt-4">
                <div>
                   <p className="text-white text-sm font-medium">Отчеты о прочтении</p>
                   <p className="text-xs text-gray-500">Уведомлять собеседника о прочтении сообщений</p>
                </div>
                <button 
                  onClick={() => setPrivacy(p => ({ ...p, sendReadReceipts: !p.sendReadReceipts }))}
                  className={`w-12 h-6 rounded-full p-1 transition-colors ${privacy.sendReadReceipts ? 'bg-green-500' : 'bg-gray-700'}`}
                >
                   <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${privacy.sendReadReceipts ? 'translate-x-6' : ''}`} />
                </button>
             </div>
          </div>
        </section>

        {/* Appearance Section */}
        <section className={`${containerClass} rounded-2xl p-6`}>
          <h3 className={`text-lg font-medium mb-4 ${theme.text}`}>Внешний вид</h3>
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-3">Цвет темы</label>
            <div className="flex gap-4">
              {(Object.keys(THEME_COLORS) as ThemeColor[]).map((color) => (
                <button
                  key={color}
                  onClick={() => setThemeColor(color)}
                  className={`w-8 h-8 rounded-full transition-all ${THEME_COLORS[color].primary} ${themeColor === color ? 'ring-2 ring-offset-2 ring-offset-gray-900 ring-white' : 'opacity-50 hover:opacity-100'}`}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-3">Размер текста</label>
            <div className="flex bg-gray-900/50 rounded-lg p-1 border border-gray-700">
              {(['sm', 'base', 'lg'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setFontSize(size)}
                  className={`flex-1 py-2 rounded-md text-xs font-medium transition-all ${
                    fontSize === size 
                      ? `bg-gray-700 text-white shadow` 
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Account Actions */}
        <div className="space-y-3 pt-2 pb-10">
          <button
            onClick={handleSave}
            className={`w-full ${theme.primary} ${theme.hover} text-white font-bold py-3 rounded-xl transition-all flex justify-center items-center gap-2 shadow-lg`}
          >
            {isSaved ? 'Сохранено!' : 'Сохранить настройки'}
          </button>
          
          <div className="grid grid-cols-2 gap-3">
             <button
               onClick={onSwitchAccount}
               className="bg-gray-800 border border-gray-600 hover:border-gray-400 text-gray-300 font-semibold py-3 rounded-xl transition-all"
             >
               Сменить аккаунт
             </button>
             <button
               onClick={onLogout}
               className="bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/40 font-semibold py-3 rounded-xl transition-all"
             >
               Выйти
             </button>
          </div>
          
          <button
             onClick={() => setShowAbout(true)}
             className="w-full py-3 text-gray-500 hover:text-white transition-colors text-sm flex items-center justify-center gap-2"
          >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              О программе
          </button>
        </div>

      </div>
    </div>
  );
};

export default SettingsScreen;
