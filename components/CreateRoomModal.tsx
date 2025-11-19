
import React, { useState } from 'react';
import { AVATAR_OPTIONS } from '../constants';
import Avatar from './Avatar';
import { generateAIAvatar } from '../services/geminiService';

interface CreateRoomModalProps {
  onClose: () => void;
  onCreate: (name: string, description: string, type: 'GROUP' | 'CHANNEL', avatarId: number, customAvatar?: string) => void;
}

const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'GROUP' | 'CHANNEL'>('GROUP');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0]);
  const [customAvatar, setCustomAvatar] = useState<string | undefined>(undefined);
  
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateAvatar = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const base64 = await generateAIAvatar(aiPrompt);
      if (base64) setCustomAvatar(base64);
    } catch (e) {
      alert('Ошибка генерации');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name, description, type, selectedAvatar, customAvatar);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Создать чат</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Type Selection */}
          <div className="flex bg-gray-900 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setType('GROUP')}
              className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all ${type === 'GROUP' ? 'bg-gray-700 text-white shadow' : 'text-gray-400'}`}
            >
              Группа
            </button>
            <button
              type="button"
              onClick={() => setType('CHANNEL')}
              className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all ${type === 'CHANNEL' ? 'bg-gray-700 text-white shadow' : 'text-gray-400'}`}
            >
              Канал
            </button>
          </div>

          {/* Avatar */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">Аватар чата</label>
            <div className="flex items-center gap-3">
                {customAvatar ? (
                    <img src={`data:image/jpeg;base64,${customAvatar}`} className="w-14 h-14 rounded-full object-cover ring-2 ring-blue-500" />
                ) : (
                    <div className="w-14 h-14 flex justify-center items-center">
                        <Avatar avatarId={selectedAvatar} size="md" selected />
                    </div>
                )}
                
                <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="AI Генерация..." 
                          value={aiPrompt}
                          onChange={e => setAiPrompt(e.target.value)}
                          className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white"
                        />
                        <button 
                          type="button"
                          onClick={handleGenerateAvatar}
                          disabled={isGenerating}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-xs"
                        >Go</button>
                    </div>
                    <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
                        {AVATAR_OPTIONS.slice(0, 5).map(id => (
                            <div key={id} onClick={() => {setCustomAvatar(undefined); setSelectedAvatar(id);}}>
                                <Avatar avatarId={id} size="sm" selected={selectedAvatar === id && !customAvatar} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          </div>

          {/* Info */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Название</label>
            <input 
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Например: Обсуждение проекта"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Описание</label>
            <input 
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="О чем этот чат?"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-3 rounded-xl transition-all"
          >
            Создать {type === 'GROUP' ? 'Группу' : 'Канал'}
          </button>

        </form>
      </div>
    </div>
  );
};

export default CreateRoomModal;
