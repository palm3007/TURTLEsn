
import React, { useState } from 'react';
import { AVATAR_OPTIONS } from '../constants';
import Avatar from './Avatar';
import { StoredAccount } from '../types';
import { generateAIAvatar } from '../services/geminiService';
import AboutModal from './AboutModal';

interface AuthScreenProps {
  onComplete: (nickname: string, avatarId: number, customAvatar?: string, passwordHash?: string) => void;
  onSelectAccount: (account: StoredAccount) => void;
  savedAccounts: StoredAccount[];
  onDeleteAccount: (id: string) => void;
}

// Helper for hashing
async function hashPassword(password: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const AuthScreen: React.FC<AuthScreenProps> = ({ 
  onComplete, 
  onSelectAccount, 
  savedAccounts,
  onDeleteAccount 
}) => {
  const [mode, setMode] = useState<'LIST' | 'REGISTER' | 'LOGIN'>(savedAccounts.length > 0 ? 'LIST' : 'REGISTER');
  
  // Form State
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0]);
  const [error, setError] = useState('');
  const [showAbout, setShowAbout] = useState(false);
  
  // Avatar Gen State
  const [activeTab, setActiveTab] = useState<'presets' | 'ai'>('presets');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [customAvatar, setCustomAvatar] = useState<string | undefined>(undefined);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nickname.trim()) {
      setError('Придумайте никнейм!');
      return;
    }
    if (nickname.length < 3) {
      setError('Никнейм слишком короткий');
      return;
    }
    if (!password.trim()) {
      setError('Придумайте пароль для защиты аккаунта');
      return;
    }
    
    // Check if nickname exists locally
    if (savedAccounts.some(acc => acc.user.nickname.toLowerCase() === nickname.toLowerCase())) {
      setError('Такой никнейм уже есть на этом устройстве. Попробуйте войти.');
      return;
    }

    const hash = await hashPassword(password);
    onComplete(nickname, selectedAvatar, customAvatar, hash);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nickname.trim() || !password.trim()) {
      setError('Введите никнейм и пароль');
      return;
    }

    const hash = await hashPassword(password);
    const account = savedAccounts.find(acc => 
      acc.user.nickname.toLowerCase() === nickname.toLowerCase() && 
      acc.passwordHash === hash
    );

    if (account) {
      onSelectAccount(account);
    } else {
      setError('Неверный никнейм или пароль');
    }
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
      setError('Не удалось сгенерировать. Попробуйте другой запрос.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQuickLogin = (acc: StoredAccount) => {
     if (acc.passwordHash) {
       // If account has password, switch to login mode and prefill nickname
       setNickname(acc.user.nickname);
       setMode('LOGIN');
       setError('Введите пароль для входа');
     } else {
       onSelectAccount(acc);
     }
  };

  const generateStrongPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let newPass = "";
    const length = 16;
    for (let i = 0; i < length; i++) {
        newPass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(newPass);
    setShowPassword(true); // Show it so user can copy
  };

  // --- RENDER: Account List ---
  if (mode === 'LIST') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4 relative">
        {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
        
        <button 
          onClick={() => setShowAbout(true)}
          className="absolute top-4 right-4 text-gray-400 hover:text-white flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-white/10 transition-all"
        >
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
             <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
           </svg>
           <span className="text-sm">О программе</span>
        </button>

        <div className="w-full max-w-md bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-700 p-8 relative">
           <h1 className="text-3xl font-bold text-center text-white mb-2">TURTLEsn</h1>
           <p className="text-gray-400 text-center text-sm mb-8">Выберите профиль или войдите</p>
           
           <div className="space-y-3 max-h-64 overflow-y-auto no-scrollbar mb-6">
             {savedAccounts.map(acc => (
               <div key={acc.user.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-900/50 border border-gray-700 hover:border-blue-500 transition-colors group">
                 <div 
                    className="flex items-center flex-1 cursor-pointer"
                    onClick={() => handleQuickLogin(acc)}
                 >
                   <div className="mr-4 relative">
                     {acc.user.customAvatar ? (
                        <img src={`data:image/jpeg;base64,${acc.user.customAvatar}`} className="w-12 h-12 rounded-full object-cover" />
                     ) : (
                        <Avatar avatarId={acc.user.avatarId} size="md" />
                     )}
                     {acc.passwordHash && (
                       <div className="absolute -bottom-1 -right-1 bg-gray-800 rounded-full p-0.5">
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-yellow-500">
                           <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                         </svg>
                       </div>
                     )}
                   </div>
                   <div>
                     <h3 className="font-bold text-white">{acc.user.nickname}</h3>
                     <p className="text-xs text-gray-500">
                       {acc.passwordHash ? 'Защищен паролем' : 'Без пароля'}
                     </p>
                   </div>
                 </div>
                 <button 
                   onClick={(e) => {
                     e.stopPropagation();
                     if(window.confirm('Удалить этот аккаунт с устройства?')) onDeleteAccount(acc.user.id);
                   }}
                   className="p-2 text-gray-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                     <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                   </svg>
                 </button>
               </div>
             ))}
           </div>

           <div className="flex flex-col gap-3">
             <button 
               onClick={() => {
                 setMode('LOGIN');
                 setError('');
                 setNickname('');
                 setPassword('');
               }}
               className="w-full py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-semibold transition-all"
             >
               Войти по паролю
             </button>
             <button 
               onClick={() => {
                 setMode('REGISTER');
                 setError('');
                 setNickname('');
                 setPassword('');
               }}
               className="w-full py-3 rounded-xl border-2 border-dashed border-gray-600 text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-all font-semibold"
             >
               Создать новый профиль
             </button>
           </div>
        </div>
      </div>
    );
  }

  // --- RENDER: Login ---
  if (mode === 'LOGIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4 relative">
        {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
        <button 
          onClick={() => setShowAbout(true)}
          className="absolute top-4 right-4 text-gray-400 hover:text-white flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-white/10 transition-all"
        >
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
             <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
           </svg>
        </button>

        <div className="w-full max-w-md bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-700 p-8">
          <button 
            onClick={() => setMode('LIST')}
            className="mb-6 text-sm text-gray-400 hover:text-white flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Назад
          </button>
          
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Вход в аккаунт</h2>
          
          <form onSubmit={handleLogin} className="space-y-4">
             <div>
               <label className="block text-gray-400 text-sm mb-1">Никнейм</label>
               <input 
                 type="text" 
                 value={nickname}
                 onChange={e => setNickname(e.target.value)}
                 className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
               />
             </div>
             <div>
               <label className="block text-gray-400 text-sm mb-1">Пароль</label>
               <input 
                 type="password" 
                 value={password}
                 onChange={e => setPassword(e.target.value)}
                 className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
               />
             </div>

             {error && <p className="text-red-500 text-sm text-center">{error}</p>}

             <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-all mt-4"
             >
               Войти
             </button>

             <p className="text-center text-gray-500 text-sm mt-4 cursor-pointer hover:text-white" onClick={() => setMode('REGISTER')}>
               Нет аккаунта? Создать
             </p>
          </form>
        </div>
      </div>
    );
  }

  // --- RENDER: Register ---
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4 relative">
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
      <button 
          onClick={() => setShowAbout(true)}
          className="absolute top-4 right-4 text-gray-400 hover:text-white flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-white/10 transition-all"
        >
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
             <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
           </svg>
      </button>

      <div className="w-full max-w-md bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-700">
        <div className="p-8">
          <button 
            onClick={() => setMode('LIST')}
            className="mb-4 text-sm text-gray-400 hover:text-white flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Назад
          </button>
          
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-2">
              Новая регистрация
            </h1>
            <p className="text-gray-400 text-xs">Анонимно. Пароль хранится только у вас.</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            
            {/* Avatar Section */}
            <div className="bg-gray-900/30 rounded-xl p-3 border border-gray-700/50">
              <div className="flex space-x-2 mb-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('presets')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded transition-all ${activeTab === 'presets' ? 'bg-gray-700 text-white' : 'text-gray-500'}`}
                >
                  Готовые
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('ai')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded transition-all ${activeTab === 'ai' ? 'bg-purple-600 text-white' : 'text-gray-500'}`}
                >
                  AI Генерация
                </button>
              </div>

              <div className="flex justify-center min-h-[80px]">
                {activeTab === 'presets' ? (
                  <div className="grid grid-cols-5 gap-2">
                    {AVATAR_OPTIONS.slice(0,5).map((id) => (
                      <div key={id} className="flex justify-center">
                        <Avatar 
                          avatarId={id} 
                          size="sm" 
                          selected={!customAvatar && selectedAvatar === id}
                          onClick={() => {
                            setCustomAvatar(undefined);
                            setSelectedAvatar(id);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-2 w-full">
                     <input 
                       type="text" 
                       value={aiPrompt}
                       onChange={e => setAiPrompt(e.target.value)}
                       placeholder="Кот хакер..."
                       className="flex-1 bg-gray-800 border border-gray-700 text-white text-xs rounded px-2 outline-none"
                     />
                     <button 
                        type="button"
                        onClick={handleGenerateAvatar}
                        disabled={isGenerating || !aiPrompt}
                        className="bg-blue-600 text-white px-3 rounded text-xs"
                     >
                       Go
                     </button>
                  </div>
                )}
              </div>
              {customAvatar && activeTab === 'ai' && (
                 <div className="flex justify-center mt-2">
                   <img src={`data:image/jpeg;base64,${customAvatar}`} className="w-16 h-16 rounded-full object-cover ring-2 ring-purple-500" />
                 </div>
              )}
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1">Никнейм</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="TurtleUser"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1">Пароль</label>
              <div className="relative">
                <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="********"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-4 pr-24 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-2 text-gray-500 hover:text-gray-300 transition-colors"
                        title={showPassword ? "Скрыть" : "Показать"}
                    >
                        {showPassword ? (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1.651 1.651 0 000-1.185A10.004 10.004 0 009.999 3a9.956 9.956 0 00-4.744 1.194L3.28 2.22zM7.752 6.69l1.092 1.092a2.5 2.5 0 013.374 3.373l1.091 1.092a4 4 0 00-5.557-5.557z" clipRule="evenodd" />
                                <path d="M10.748 13.93l2.523 2.523a9.987 9.987 0 01-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 010-1.186A10.007 10.007 0 012.839 6.02L6.07 9.252a4 4 0 004.678 4.678z" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                                <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                            </svg>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={generateStrongPassword}
                        className="p-2 text-blue-500 hover:text-blue-400 transition-colors"
                        title="Сгенерировать надежный пароль"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                           <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                           <path d="M13.5 10a.5.5 0 00-1 0v.5h-1a.5.5 0 000 1h1v.5a.5.5 0 001 0v-.5h1a.5.5 0 000-1h-1v-.5z" />
                        </svg>
                    </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Рекомендуем использовать генератор для надежности</p>
            </div>

            {error && <p className="text-red-400 text-xs text-center">{error}</p>}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 rounded-lg shadow-lg transition-all"
            >
              Зарегистрироваться
            </button>
            
            <p className="text-center text-gray-500 text-sm cursor-pointer hover:text-white" onClick={() => setMode('LOGIN')}>
               Уже есть аккаунт? Войти
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
