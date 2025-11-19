
import React, { useState } from 'react';

interface InviteFriendModalProps {
  onClose: () => void;
  myPeerId?: string;
}

type Platform = 'win10' | 'win11' | 'mac_intel' | 'mac_silicon' | 'linux' | 'android';

const InviteFriendModal: React.FC<InviteFriendModalProps> = ({ onClose, myPeerId }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [copied, setCopied] = useState(false);

  const platforms = [
    { id: 'win10', name: 'Windows 10', icon: 'M0 0h24v24H0z' }, // Placeholder logic for icons below
    { id: 'win11', name: 'Windows 11', icon: '' },
    { id: 'mac_intel', name: 'macOS (Intel)', icon: '' },
    { id: 'mac_silicon', name: 'macOS (Apple Silicon)', icon: '' },
    { id: 'linux', name: 'Linux', icon: '' },
    { id: 'android', name: 'Android', icon: '' },
  ];

  const getPlatformIcon = (id: string) => {
    switch (id) {
      case 'win10':
      case 'win11':
        return (
          <svg className="w-8 h-8 mb-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
          </svg>
        );
      case 'mac_intel':
      case 'mac_silicon':
        return (
          <svg className="w-8 h-8 mb-2" fill="currentColor" viewBox="0 0 24 24">
             <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.68-.83 1.14-1.99 1.01-3.15-1.07.06-2.37.72-3.13 1.6-.67.85-1.26 2.02-1.1 3.17 1.2.09 2.42-.73 3.22-1.62z"/>
          </svg>
        );
      case 'linux':
        return (
          <svg className="w-8 h-8 mb-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 20.75c-2.5 0-3.5-1.75-3.5-1.75s-.5 1.5-2.5 1.5c-2.25 0-2.5-2.25-2.5-2.25s-1.25.5-2 0c-.75-.5-.5-2.25-.5-2.25s-.75-.5 0-1.25c.75-.75 2.5-1 2.5-1s-.25-2.25 1.25-3.5c1.5-1.25 3.25-1.25 3.25-1.25s-.5-2 1-3c1.5-1 3.5 0 3.5 0s1.5-1 3.5 0c1.5 1 1 3 1 3s1.75 0 3.25 1.25c1.5 1.25 1.25 3.5 1.25 3.5s1.75.25 2.5 1c.75.75 0 1.25 0 1.25s.25 1.75-.5 2.25c-.75.5-2 0-2 0s-.25 2.25-2.5 2.25c-2 0-2.5-1.5-2.5-1.5s-1 1.75-3.5 1.75z"/>
          </svg>
        );
      case 'android':
        return (
          <svg className="w-8 h-8 mb-2" fill="currentColor" viewBox="0 0 24 24">
             <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0004.5511-.4482.9997-.9993.9997M6.4766 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0004.5511-.4482.9997-.9993.9997M12 1.2324c-4.926 0-8.9916 3.4624-9.9305 8.0716h19.8609C20.9916 4.6948 16.926 1.2324 12 1.2324M22.702 9.9076h1.2412v10.3652c0 1.2767-1.0355 2.3118-2.3121 2.3118h-.6207V12.219c.9466-.5597 1.5743-1.5298 1.6916-2.3114M1.298 9.9076h1.2412v12.6774h-.6207c-1.2766 0-2.3121-1.0351-2.3121-2.3118V9.9076h.0004zM3.1603 22.587h17.6795v-2.3643H3.1603v2.3643z"/>
          </svg>
        );
      default: return null;
    }
  };

  const handleSelect = (id: Platform) => {
    setSelectedPlatform(id);
    setStep(2);
  };

  const getDownloadLink = () => {
    // In a real app, these would be real files. Since this is a web PWA, we link to the app itself 
    // or simulated endpoints.
    const baseUrl = window.location.origin;
    const extension = selectedPlatform === 'win10' || selectedPlatform === 'win11' ? '.exe' 
                    : selectedPlatform === 'android' ? '.apk'
                    : selectedPlatform === 'linux' ? '.deb'
                    : '.dmg';
    
    return `${baseUrl}/download/turtlesn_${selectedPlatform}${extension}?add_friend=${myPeerId}`;
  };

  const handleCopy = () => {
    const link = getDownloadLink();
    const message = `Привет! Скачай TURTLEsn для ${selectedPlatform} и напиши мне.\n\nСсылка: ${link}\n\nМой Turtle ID: ${myPeerId}`;
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-2xl font-bold text-white mb-2 text-center">Пригласить друга</h2>
        
        {step === 1 && (
          <>
             <p className="text-gray-400 text-center mb-6">Выберите устройство, которое использует ваш друг:</p>
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
               {platforms.map(p => (
                 <button
                   key={p.id}
                   onClick={() => handleSelect(p.id as Platform)}
                   className="flex flex-col items-center justify-center p-4 bg-gray-900 border border-gray-700 rounded-xl hover:bg-gray-700 hover:border-blue-500 transition-all group"
                 >
                   <div className="text-gray-500 group-hover:text-blue-400 transition-colors">
                     {getPlatformIcon(p.id)}
                   </div>
                   <span className="text-sm font-medium text-gray-300 group-hover:text-white">{p.name}</span>
                 </button>
               ))}
             </div>
          </>
        )}

        {step === 2 && (
          <div className="text-center space-y-6 animate-fade-in">
             <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-green-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
             </div>
             <div>
               <h3 className="text-xl font-bold text-white">Ссылка готова!</h3>
               <p className="text-gray-400 text-sm mt-2">
                 Отправьте эту ссылку другу. Она содержит установочный файл для 
                 <span className="text-blue-400 font-bold mx-1">
                    {platforms.find(p => p.id === selectedPlatform)?.name}
                 </span> 
                 и ваш ID для автоматического добавления в контакты.
               </p>
             </div>

             <div className="bg-black/30 p-4 rounded-lg border border-gray-700 break-all font-mono text-xs text-gray-400">
               {getDownloadLink()}
             </div>

             <div className="flex gap-3">
               <button 
                 onClick={() => setStep(1)}
                 className="flex-1 py-3 rounded-xl bg-gray-700 text-white font-semibold hover:bg-gray-600 transition-colors"
               >
                 Назад
               </button>
               <button 
                 onClick={handleCopy}
                 className={`flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2
                    ${copied ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}
                 `}
               >
                 {copied ? (
                   <>
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                     </svg>
                     Скопировано
                   </>
                 ) : (
                   <>
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5" />
                     </svg>
                     Копировать
                   </>
                 )}
               </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InviteFriendModal;
