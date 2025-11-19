
import React, { useState, useEffect, useRef } from 'react';
import { Room, Message, User, UserSettings } from '../types';
import { sendMessageToBot } from '../services/geminiService';
import { THEME_COLORS, WALLPAPERS } from '../constants';
import Avatar from './Avatar';

interface ChatRoomProps {
  room: Room;
  currentUser: User;
  settings: UserSettings;
  onMenuClick: () => void;
  onStartCall: () => void;
  onSendMessageP2P?: (text: string) => void;
  onInviteToGroup?: (roomId: string, peerId: string) => void;
}

const ChatRoom: React.FC<ChatRoomProps> = ({ 
  room, 
  currentUser, 
  settings, 
  onMenuClick, 
  onStartCall,
  onSendMessageP2P,
  onInviteToGroup
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [invitePeerId, setInvitePeerId] = useState('');
  
  // Media Recording State
  const [recordingMode, setRecordingMode] = useState<'AUDIO' | 'VIDEO'>('AUDIO');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const theme = THEME_COLORS[settings.themeColor];
  // If Glass is enabled, we might ignore the specific wallpaper and show transparency, 
  // OR we let the wallpaper show through.
  const wallpaperClass = WALLPAPERS[settings.wallpaper];

  const isGlass = settings.isGlass;
  const headerClass = isGlass ? "bg-gray-900/40 backdrop-blur-xl border-b border-white/10" : "bg-gray-900/80 backdrop-blur-md border-b border-gray-700";
  const inputAreaClass = isGlass ? "bg-gray-900/40 backdrop-blur-xl border-t border-white/10" : "bg-gray-900/80 backdrop-blur-md border-t border-gray-800";
  const messageBubbleMe = isGlass ? `${theme.primary} bg-opacity-80 backdrop-blur-md text-white border border-white/10` : `${theme.primary} text-white`;
  const messageBubbleOther = isGlass ? "bg-black/40 backdrop-blur-md text-white border border-white/10" : "bg-gray-800/90 backdrop-blur-sm text-gray-100 border border-gray-700";

  // Permissions
  const isReadOnly = room.type === 'CHANNEL' && !room.isAdmin;

  useEffect(() => {
    setMessages([]);
    const initialMsg: Message = {
      id: 'system-welcome',
      text: room.isP2P 
        ? `Безопасный чат "${room.name}". ${room.isAdmin ? 'Вы администратор.' : ''}`
        : `Вы вошли в комнату "${room.name}".`,
      senderId: 'system',
      timestamp: Date.now(),
      isSystem: true
    };
    setMessages([initialMsg]);
  }, [room.id]);

  useEffect(() => {
    const handleP2PMessage = (e: CustomEvent) => {
      if (e.detail.roomId === room.id) {
        const msg = e.detail.message;
        // If message contains JSON string in text (hack for P2P attachment transport via text field)
        if (msg.text.startsWith('{"attachment":')) {
            try {
                const parsed = JSON.parse(msg.text);
                msg.attachment = parsed.attachment;
                msg.text = ""; // Clear text so we render attachment
            } catch(e){}
        }
        setMessages(prev => [...prev, msg]);
      }
    };
    
    window.addEventListener('p2p-message' as any, handleP2PMessage);
    return () => window.removeEventListener('p2p-message' as any, handleP2PMessage);
  }, [room.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, isRecording]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      senderId: currentUser.id,
      timestamp: Date.now(),
      isEncrypted: room.isP2P,
      senderName: currentUser.nickname,
      senderAvatar: currentUser.customAvatar || currentUser.avatarId.toString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    if (room.isP2P) {
      if (onSendMessageP2P) onSendMessageP2P(userMsg.text);
    } else {
      setIsTyping(true);
      try {
        const botResponseText = await sendMessageToBot(room.id, userMsg.text, room.botPersona);
        setTimeout(() => {
          const botMsg: Message = {
            id: (Date.now() + 1).toString(),
            text: botResponseText,
            senderId: 'bot-' + room.id,
            timestamp: Date.now()
          };
          setIsTyping(false);
          setMessages(prev => [...prev, botMsg]);
        }, 1000);
      } catch (error) { setIsTyping(false); }
    }
  };

  // --- Media Recording Logic ---

  const startRecording = async () => {
    if (!room.isP2P) {
       alert("Голосовые и видео сообщения доступны только в P2P чатах");
       return;
    }
    
    try {
      const constraints = recordingMode === 'VIDEO' 
        ? { video: { facingMode: "user", aspectRatio: 1 }, audio: true } 
        : { audio: true };
        
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (recordingMode === 'VIDEO' && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }

      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recordingMode === 'VIDEO' ? 'video/webm' : 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
           const base64 = reader.result as string;
           sendMediaMessage(base64);
        };
        // Cleanup
        stream.getTracks().forEach(t => t.stop());
        if (videoPreviewRef.current) videoPreviewRef.current.srcObject = null;
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      
      setRecordingDuration(0);
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingDuration(p => p + 1);
      }, 1000);

    } catch (e) {
      console.error("Failed to start recording", e);
      alert("Не удалось получить доступ к микрофону или камере.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const sendMediaMessage = (base64Data: string) => {
     const userMsg: Message = {
        id: Date.now().toString(),
        text: '',
        senderId: currentUser.id,
        timestamp: Date.now(),
        isEncrypted: true,
        senderName: currentUser.nickname,
        senderAvatar: currentUser.customAvatar,
        attachment: {
           type: recordingMode,
           data: base64Data,
           duration: recordingDuration
        }
     };
     
     setMessages(prev => [...prev, userMsg]);

     // Send via P2P service wrapped in JSON because our sendMessage takes text
     if (onSendMessageP2P) {
        const payload = JSON.stringify({ 
           attachment: userMsg.attachment 
        });
        onSendMessageP2P(payload);
     }
  };

  const toggleRecordingMode = () => {
     setRecordingMode(prev => prev === 'AUDIO' ? 'VIDEO' : 'AUDIO');
  };

  // --- End Media Recording Logic ---

  const handleInvite = () => {
    if (invitePeerId.trim() && onInviteToGroup) {
      onInviteToGroup(room.id, invitePeerId.trim());
      setInvitePeerId('');
      setIsInviteOpen(false);
    }
  };

  return (
    <div className={`flex flex-col h-full w-full relative ${isGlass ? '' : wallpaperClass}`}>
      {/* Glass Background Layer if needed, or transparent */}
      {isGlass && <div className={`absolute inset-0 z-[-1] ${wallpaperClass} opacity-50`}></div>}

      {/* Circular Video Preview Overlay */}
      {isRecording && recordingMode === 'VIDEO' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
           <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-white shadow-2xl animate-pulse">
              <video ref={videoPreviewRef} autoPlay muted playsInline className="w-full h-full object-cover transform -scale-x-100" />
           </div>
           <div className="absolute bottom-20 text-white font-mono text-xl font-bold animate-bounce">
              {new Date(recordingDuration * 1000).toISOString().substr(14, 5)}
           </div>
           <div className="absolute bottom-10 text-gray-300 text-sm">Отпустите кнопку для отправки</div>
        </div>
      )}

      {/* Header */}
      <header className={`h-16 flex items-center px-4 justify-between shrink-0 z-10 shadow-sm ${headerClass}`}>
        <div className="flex items-center min-w-0">
          <button onClick={onMenuClick} className="md:hidden mr-3 text-gray-400 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <div className="flex items-center gap-3 min-w-0">
             {room.botPersona.customAvatar ? (
               <img src={`data:image/jpeg;base64,${room.botPersona.customAvatar}`} className="w-8 h-8 rounded-full object-cover ring-2 ring-gray-700" alt="avatar"/>
             ) : (
               <Avatar avatarId={room.botPersona.avatarId} size="sm" />
             )}
             <div className="min-w-0">
               <h3 className="text-white font-bold flex items-center gap-2 truncate">
                 {room.name}
                 {room.isP2P && <span className="text-[10px] px-1.5 rounded bg-green-900/50 border border-green-500/30 text-green-300 backdrop-blur-sm">E2EE</span>}
               </h3>
               <p className={`text-xs truncate ${settings.useTor ? 'text-purple-300' : 'text-gray-400'}`}>
                 {room.isP2P 
                   ? (room.isConnected ? (settings.useTor ? 'Tor Relay Connected' : 'Подключено') : 'Ожидание...') 
                   : `${room.onlineCount} онлайн`}
               </p>
             </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          {room.isP2P && room.isAdmin && (room.type === 'GROUP' || room.type === 'CHANNEL') && (
            <div className="relative">
              <button 
                onClick={() => setIsInviteOpen(!isInviteOpen)}
                className={`p-2.5 rounded-full text-gray-400 hover:text-white ${isGlass ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-800 hover:bg-gray-700'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25v1.75a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25v-1.75z" />
                </svg>
              </button>
              {isInviteOpen && (
                <div className={`absolute right-0 top-12 w-64 rounded-xl p-3 shadow-xl z-50 border border-gray-600 ${isGlass ? 'bg-gray-900/90 backdrop-blur-xl' : 'bg-gray-800'}`}>
                  <input 
                    type="text"
                    value={invitePeerId}
                    onChange={e => setInvitePeerId(e.target.value)}
                    className="w-full bg-black/30 border border-gray-500 rounded px-2 py-1 text-sm text-white mb-2"
                    placeholder="turtle-..."
                  />
                  <button onClick={handleInvite} className="w-full bg-blue-600 text-white text-xs py-1.5 rounded font-bold hover:bg-blue-500">Пригласить</button>
                </div>
              )}
            </div>
          )}
          
          <button 
            onClick={onStartCall}
            disabled={room.isP2P && !room.isConnected}
            className={`p-2.5 rounded-full text-gray-400 hover:text-white transition-colors border ${theme.ring} disabled:opacity-50 ${isGlass ? 'bg-white/10 hover:bg-white/20 border-white/10' : 'bg-gray-800 border-gray-700'}`}
          >
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
               <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
             </svg>
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 relative z-0">
        {messages.map((msg) => {
          if (msg.isSystem) {
            return (
              <div key={msg.id} className="flex justify-center my-4">
                <span className={`text-xs text-center text-gray-300 px-3 py-1 rounded-full border shadow-sm max-w-[90%] ${isGlass ? 'bg-black/30 backdrop-blur-sm border-white/10' : 'bg-gray-900/60 border-gray-800'}`}>
                  {msg.text}
                </span>
              </div>
            );
          }

          const isMe = msg.senderId === currentUser.id;
          let displayName = msg.senderName || room.botPersona.name;
          let avatarId = room.botPersona.avatarId;
          let customAvatar = room.botPersona.customAvatar;

          if (isMe) {
            displayName = currentUser.nickname;
            avatarId = currentUser.avatarId;
            customAvatar = currentUser.customAvatar;
          } else if (room.isP2P && room.type !== 'DIRECT') {
             if (msg.senderAvatar && msg.senderAvatar.length > 100) customAvatar = msg.senderAvatar;
             else if (msg.senderAvatar) avatarId = parseInt(msg.senderAvatar);
          }

          return (
            <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex max-w-[85%] md:max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`flex-shrink-0 ${isMe ? 'ml-3' : 'mr-3'}`}>
                  {customAvatar ? (
                    <img src={`data:image/jpeg;base64,${customAvatar}`} className="w-8 h-8 rounded-full object-cover shadow-lg" alt="avatar"/>
                  ) : (
                    <Avatar avatarId={avatarId} size="sm" />
                  )}
                </div>
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                   <span className="text-xs text-gray-300/80 mb-1 px-1 shadow-sm flex items-center gap-1 font-medium drop-shadow-md">
                     {displayName}
                   </span>
                   
                   {/* Attachment Rendering */}
                   {msg.attachment ? (
                      msg.attachment.type === 'VIDEO' ? (
                         <div className={`rounded-full overflow-hidden w-48 h-48 border-4 ${isMe ? 'border-blue-600' : 'border-gray-700'} shadow-lg bg-black`}>
                             <video src={msg.attachment.data} className="w-full h-full object-cover transform -scale-x-100" controls />
                         </div>
                      ) : (
                         <div className={`p-3 rounded-2xl flex items-center gap-3 min-w-[200px] ${isMe ? theme.primary : 'bg-gray-800'}`}>
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-white">
                                 <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                               </svg>
                            </div>
                            <audio src={msg.attachment.data} controls className="w-32 h-8" />
                         </div>
                      )
                   ) : (
                      <div className={`
                         px-4 py-2.5 rounded-2xl text-${settings.fontSize} leading-relaxed shadow-md break-words
                         ${isMe ? `rounded-tr-sm ${messageBubbleMe}` : `rounded-tl-sm ${messageBubbleOther}`}
                       `}>
                         {msg.text}
                      </div>
                   )}

                   <span className="text-[10px] text-gray-400 mt-1 px-1 drop-shadow-md">
                     {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                   </span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {!isReadOnly ? (
        <div className={`p-4 shrink-0 z-10 ${inputAreaClass}`}>
          <div className="flex items-center gap-2 max-w-4xl mx-auto">
             {room.isP2P && (
               <div className="relative flex items-center">
                  <button 
                     onClick={toggleRecordingMode}
                     className="text-gray-400 hover:text-white p-2 mr-1"
                     title={recordingMode === 'AUDIO' ? 'Нажмите для переключения на видео' : 'Нажмите для переключения на аудио'}
                  >
                      {recordingMode === 'AUDIO' ? (
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                         </svg>
                      ) : (
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                           <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                         </svg>
                      )}
                  </button>
                  <button
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onTouchStart={startRecording}
                    onTouchEnd={stopRecording}
                    className={`
                      p-3 rounded-full transition-all duration-200 shadow-lg active:scale-125
                      ${isRecording 
                         ? 'bg-red-600 text-white ring-4 ring-red-900' 
                         : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}
                    `}
                  >
                     <div className={`w-3 h-3 rounded-full bg-current ${isRecording ? 'animate-pulse' : ''}`} />
                  </button>
               </div>
             )}

             <form onSubmit={handleSendMessage} className="flex-1 flex items-center gap-2">
               <input
                 type="text"
                 value={inputText}
                 onChange={(e) => setInputText(e.target.value)}
                 placeholder={room.isP2P && !room.isConnected ? "Ожидание подключения..." : "Сообщение..."}
                 disabled={(room.isP2P && !room.isConnected) || isRecording}
                 className={`flex-1 text-white placeholder-gray-400 border rounded-full px-5 py-3 focus:outline-none focus:ring-2 focus:border-transparent transition-all disabled:opacity-50 ${isGlass ? 'bg-black/20 border-white/10 focus:bg-black/40' : `bg-gray-800 border-gray-700 ${theme.ring}`}`}
               />
               {inputText.trim() && (
                 <button
                   type="submit"
                   disabled={!inputText.trim() || (room.isP2P && !room.isConnected)}
                   className={`${theme.primary} ${theme.hover} disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-full p-3 transition-colors shadow-lg`}
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                     <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                   </svg>
                 </button>
               )}
             </form>
          </div>
        </div>
      ) : (
        <div className={`p-4 border-t text-center text-gray-500 text-sm ${inputAreaClass}`}>
          Только администраторы могут писать в этот канал.
        </div>
      )}
    </div>
  );
};

export default ChatRoom;
