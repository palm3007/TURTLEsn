import React, { useEffect, useState, useRef } from 'react';
import { BotPersona } from '../types';
import Avatar from './Avatar';

interface CallOverlayProps {
  roomName: string;
  botPersona: BotPersona;
  onHangup: () => void;
  isP2P?: boolean;
  remoteStream?: MediaStream | null;
  onToggleVideo?: (enabled: boolean, videoEl: HTMLVideoElement) => Promise<void>;
}

const CallOverlay: React.FC<CallOverlayProps> = ({ 
  roomName, 
  botPersona, 
  onHangup, 
  isP2P, 
  remoteStream, 
  onToggleVideo 
}) => {
  const [duration, setDuration] = useState(0);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setDuration(d => d + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleVideo = async () => {
    const newState = !isVideoEnabled;
    setIsVideoEnabled(newState);
    
    if (newState) {
       // Wait for render
       setTimeout(async () => {
         if (localVideoRef.current && onToggleVideo) {
            await onToggleVideo(true, localVideoRef.current);
         }
       }, 100);
    } else {
      if (onToggleVideo && localVideoRef.current) {
        await onToggleVideo(false, localVideoRef.current);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col items-center justify-center text-white overflow-hidden">
      
      {/* Remote Video Layer (P2P) or Local Video (AI Call) */}
      {((isP2P && remoteStream) || (isVideoEnabled && !isP2P)) && (
        <div className="absolute inset-0 z-0">
           <video 
             ref={isP2P ? remoteVideoRef : localVideoRef}
             autoPlay 
             muted={!isP2P} // Mute local, unmute remote
             playsInline
             className="w-full h-full object-cover"
           />
           <div className="absolute inset-0 bg-black/40"></div>
        </div>
      )}

      {/* P2P Local Video PIP */}
      {isP2P && isVideoEnabled && (
         <div className="absolute top-4 right-4 w-32 h-48 bg-black rounded-xl overflow-hidden border border-gray-700 z-20 shadow-2xl">
            <video
               ref={localVideoRef}
               autoPlay
               muted
               playsInline
               className="w-full h-full object-cover transform -scale-x-100"
            />
         </div>
      )}

      {/* Animated Background (only if no main video) */}
      {!(isP2P && remoteStream) && !(!isP2P && isVideoEnabled) && (
        <div className="absolute inset-0 overflow-hidden z-0">
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        </div>
      )}

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center space-y-8 w-full h-full justify-center">
        
        {/* Avatar / Person Info */}
        <div className={`flex flex-col items-center transition-all duration-500 ${((isP2P && remoteStream) || isVideoEnabled) ? 'scale-75 -mt-32 p-6 bg-gray-900/60 backdrop-blur-md rounded-3xl border border-gray-700/50' : 'space-y-8'}`}>
          <div className="relative">
            <div className={`absolute inset-0 bg-blue-500/20 rounded-full ${((isP2P && remoteStream) || isVideoEnabled) ? '' : 'animate-ping'}`}></div>
            {botPersona.customAvatar ? (
              <img src={`data:image/jpeg;base64,${botPersona.customAvatar}`} className={`rounded-full object-cover border-4 border-gray-800 ${isVideoEnabled ? "w-16 h-16" : "w-24 h-24"}`} alt="avatar"/>
            ) : (
              <Avatar avatarId={botPersona.avatarId} size={isVideoEnabled ? "lg" : "xl"} />
            )}
          </div>

          <div className="text-center space-y-1 mt-4">
            <h2 className="text-2xl font-bold text-white drop-shadow-md">{botPersona.name}</h2>
            <p className="text-gray-300 text-sm drop-shadow-md flex items-center justify-center gap-2">
              {roomName}
              {isP2P && <span className="text-[10px] bg-green-500 text-black px-1 rounded font-bold">P2P</span>}
            </p>
            <p className="text-gray-300 font-mono text-xs opacity-80 mt-2">{formatTime(duration)}</p>
          </div>

          {/* Visualizer */}
          {!((isP2P && remoteStream) || isVideoEnabled) && (
            <div className="flex items-center space-x-1 h-12 mt-4">
               {[...Array(8)].map((_, i) => (
                 <div 
                   key={i} 
                   className="w-1.5 bg-blue-400 rounded-full animate-pulse"
                   style={{ 
                     height: `${Math.random() * 100}%`,
                     animationDuration: `${0.5 + Math.random() * 0.5}s` 
                   }} 
                 />
               ))}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="absolute bottom-10 flex items-center space-x-6">
          <button className="p-4 bg-gray-700/80 backdrop-blur-sm rounded-full hover:bg-gray-600 transition-colors">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
               <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
             </svg>
          </button>
          
          {onToggleVideo && (
            <button 
              onClick={toggleVideo}
              className={`p-4 rounded-full transition-all duration-300 ${isVideoEnabled ? 'bg-white text-gray-900 hover:bg-gray-200' : 'bg-gray-700/80 text-white hover:bg-gray-600 backdrop-blur-sm'}`}
            >
               {isVideoEnabled ? (
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                   <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5l15 15" />
                 </svg>
               ) : (
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 01-2.25-2.25V9m12.841 9.091L16.5 19.5m-1.409-1.409c.407-.407.659-.97.659-1.591v-9a2.25 2.25 0 00-2.25-2.25h-9c-.621 0-1.184.252-1.591.659m12.182 12.182L2.909 5.909" />
                 </svg>
               )}
            </button>
          )}

          <button 
            onClick={onHangup}
            className="p-6 bg-red-600 rounded-full hover:bg-red-500 shadow-lg shadow-red-600/30 transition-all transform hover:scale-105"
          >
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
               <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
               <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
             </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallOverlay;