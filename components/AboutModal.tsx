
import React from 'react';

interface AboutModalProps {
  onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-gray-900/80 border border-white/10 rounded-2xl w-full max-w-lg p-8 shadow-2xl relative overflow-hidden">
        
        {/* Background decorations */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl"></div>

        <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                    TURTLEsn
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">v1.0.0 • Secure • Serverless</p>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="space-y-4 text-gray-300 text-sm leading-relaxed">
                <p>
                    <strong className="text-white">TURTLEsn</strong> — это децентрализованный мессенджер нового поколения, созданный для полной анонимности и свободы общения.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-4">
                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                        <h4 className="text-blue-400 font-bold mb-1 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            Serverless P2P
                        </h4>
                        <p className="text-xs text-gray-400">Сообщения и звонки передаются напрямую между устройствами. Никаких центральных серверов, хранящих вашу переписку.</p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                        <h4 className="text-green-400 font-bold mb-1 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            E2E Шифрование
                        </h4>
                        <p className="text-xs text-gray-400">Военный стандарт шифрования (AES-GCM + ECDH). Ключи генерируются на устройстве и никогда не покидают его.</p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                        <h4 className="text-purple-400 font-bold mb-1 flex items-center gap-2">
                             <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                            Tor Routing
                        </h4>
                        <p className="text-xs text-gray-400">Режим повышенной анонимности скрывает ваш IP-адрес, маршрутизируя трафик через Relay-узлы.</p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                        <h4 className="text-pink-400 font-bold mb-1 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                            AI Integration
                        </h4>
                        <p className="text-xs text-gray-400">Встроенный Gemini AI для генерации аватаров и создания умных собеседников.</p>
                    </div>
                </div>

                <p className="text-xs text-gray-500 text-center mt-6">
                    Данные хранятся только в локальном хранилище (Local Storage) вашего браузера. При очистке кэша данные могут быть утеряны. Рекомендуем помнить свои пароли.
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AboutModal;
