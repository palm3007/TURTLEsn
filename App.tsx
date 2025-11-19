
import React, { useState, useEffect, useRef } from 'react';
import { User, Room, AppState, UserSettings, BotPersona, Message, StoredAccount, RoomType } from './types';
import { ROOMS, DEFAULT_SETTINGS } from './constants';
import AuthScreen from './components/AuthScreen';
import ChatList from './components/ChatList';
import ChatRoom from './components/ChatRoom';
import SettingsScreen from './components/SettingsScreen';
import CallOverlay from './components/CallOverlay';
import CreateRoomModal from './components/CreateRoomModal';
import InviteFriendModal from './components/InviteFriendModal';
import { GeminiLiveService } from './services/liveService';
import { P2PService } from './services/p2pService';
import { DataConnection, MediaConnection } from 'peerjs';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.AUTH);
  const [storedAccounts, setStoredAccounts] = useState<StoredAccount[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<Room[]>(ROOMS);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  
  const [isCalling, setIsCalling] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  const liveServiceRef = useRef<GeminiLiveService | null>(null);
  const p2pServiceRef = useRef<P2PService>(new P2PService());
  const localStreamRef = useRef<MediaStream | null>(null);

  // Background Image for Glassmorphism
  const bgImage = "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?ixlib=rb-4.0.3&auto=format&fit=crop&w=2071&q=80"; // Starry night

  useEffect(() => {
    const savedAccountsJson = localStorage.getItem('ghost_accounts');
    if (savedAccountsJson) {
      try {
        const accounts = JSON.parse(savedAccountsJson) as StoredAccount[];
        setStoredAccounts(accounts);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (storedAccounts.length > 0) {
      localStorage.setItem('ghost_accounts', JSON.stringify(storedAccounts));
    } else {
      localStorage.setItem('ghost_accounts', JSON.stringify([]));
    }
  }, [storedAccounts]);

  // Initialize or Re-initialize P2P if Tor settings change
  useEffect(() => {
    if (currentUser) {
      // If P2P is already running, we might need to destroy and recreate if settings change substantially
      // For now, we only init if not present. Real-world dynamic switching would require disconnect/reconnect logic.
      if (currentUser.peerId) {
          // Already initialized
      } else {
         initP2P(settings.useTor);
      }
    }
  }, [currentUser?.id, settings.useTor]);

  const initP2P = (useTor: boolean) => {
      p2pServiceRef.current.destroy();
      p2pServiceRef.current = new P2PService(); // Reset instance

      p2pServiceRef.current.init(currentUser!.nickname, useTor).then((id) => {
        console.log(`Initialized P2P ID (Tor: ${useTor}):`, id);
        setCurrentUser(prev => prev ? ({ ...prev, peerId: id }) : null);
      });

      p2pServiceRef.current.onConnection = (conn, meta) => {
        // Handle new direct connections
        setRooms(prev => {
           const exists = prev.find(r => r.peerId === conn.peer && r.type === 'DIRECT');
           if (exists) return prev.map(r => r.peerId === conn.peer ? { ...r, isConnected: true } : r);
           return prev;
        });
      };

      p2pServiceRef.current.onInvite = (payload) => {
        const { roomId, name, description, type, peerId: hostId, botPersona } = payload;
        
        // Privacy Check: Block invites if only contacts allowed and host is not a contact
        // Note: For this demo, "Contacts" are loosely defined as people you already have a room with.
        if (settings.privacy.allowDirectMessages === 'CONTACTS_ONLY') {
           const isContact = rooms.some(r => r.peerId === hostId);
           if (!isContact) {
             console.log("Blocked invite from stranger due to privacy settings");
             return;
           }
        }

        setRooms(prev => {
           if (prev.some(r => r.id === roomId)) return prev;
           const newRoom: Room = {
             id: roomId,
             name,
             description,
             type,
             onlineCount: 1,
             botPersona,
             isPrivate: true,
             isP2P: true,
             peerId: hostId, 
             isConnected: false 
           };
           p2pServiceRef.current.connect(hostId, {
             nickname: currentUser!.nickname,
             avatarId: currentUser!.avatarId,
             customAvatar: currentUser!.customAvatar
           });
           return [newRoom, ...prev];
        });
        alert(`Приглашение: ${type === 'GROUP' ? 'группа' : 'канал'} "${name}"`);
      };

      p2pServiceRef.current.onData = (peerId, text, type, roomId, senderInfo) => {
        if (type === 'CHAT') {
           handleIncomingP2PMessage(peerId, text);
        } else if (type === 'GROUP_MSG') {
           handleGroupMessage(roomId!, text, senderInfo, peerId);
        }
      };

      p2pServiceRef.current.onStatusChange = (peerId, isConnected) => {
         setRooms(prev => prev.map(r => {
           if (r.peerId === peerId) return { ...r, isConnected };
           return r;
         }));
      };

      p2pServiceRef.current.onIncomingCall = (call) => handleIncomingCall(call);
  };

  // Routing logic for Group Messages (Star Topology)
  const handleGroupMessage = (roomId: string, text: string, senderInfo: any, fromPeerId: string) => {
     const room = rooms.find(r => r.id === roomId);
     if (!room) return;

     const message: Message = {
        id: Date.now().toString() + Math.random(),
        text,
        senderId: `peer-${fromPeerId}`, 
        senderName: senderInfo?.nickname || 'Unknown',
        senderAvatar: senderInfo?.customAvatar || senderInfo?.avatarId?.toString(),
        timestamp: Date.now(),
        isEncrypted: true
     };

     const event = new CustomEvent('p2p-message', { detail: { roomId, message } });
     window.dispatchEvent(event);

     if (room.isAdmin && room.participants) {
        p2pServiceRef.current.broadcast(
           room.participants.filter(p => p !== fromPeerId), 
           text, 
           roomId, 
           senderInfo
        );
     }
  };

  const handleIncomingP2PMessage = (peerId: string, text: string) => {
     const roomId = `p2p-${peerId}`;
     
     // Privacy Check: Block new conversations from strangers if strictly contacts only
     if (settings.privacy.allowDirectMessages === 'CONTACTS_ONLY') {
        const isKnown = rooms.some(r => r.peerId === peerId);
        if (!isKnown) {
            console.log(`Blocked message from stranger ${peerId}`);
            return;
        }
     }

     setRooms(prev => {
       if (!prev.some(r => r.id === roomId)) {
          const newRoom: Room = {
             id: roomId,
             name: "Новый контакт", 
             description: "Личный чат",
             onlineCount: 1,
             botPersona: { name: "Аноним", avatarId: 0, systemInstruction: "", temperature: 0 },
             isPrivate: true, isP2P: true, peerId, isConnected: true, type: 'DIRECT'
          };
          return [newRoom, ...prev];
       }
       return prev;
     });

     const message: Message = {
       id: Date.now().toString() + Math.random(),
       text,
       senderId: `peer-${peerId}`,
       timestamp: Date.now(),
       isEncrypted: true
     };

     const event = new CustomEvent('p2p-message', { detail: { roomId, message } });
     window.dispatchEvent(event);
  };

  const handleIncomingCall = (call: MediaConnection) => {
    if (!settings.privacy.allowCalls) {
      call.close();
      return;
    }
    if (window.confirm(`Входящий звонок. Принять?`)) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
        localStreamRef.current = stream;
        call.answer(stream);
        call.on('stream', (rs) => {
           setRemoteStream(rs);
           setIsCalling(true);
        });
        call.on('close', () => handleEndCall());
      });
    } else {
      call.close();
    }
  };

  const loginUser = (account: StoredAccount) => {
    setCurrentUser(account.user);
    setSettings(account.settings);
    const savedRooms = account.rooms || [];
    setRooms(savedRooms); 
    setStoredAccounts(prev => prev.map(a => a.user.id === account.user.id ? { ...a, lastActive: Date.now() } : a));
    setAppState(AppState.CHAT_LIST);
    setCurrentRoom(savedRooms.length > 0 ? savedRooms[0] : null);
  };

  const handleAuthComplete = (nickname: string, avatarId: number, customAvatar?: string, passwordHash?: string) => {
    const newUser: User = { id: `user-${Date.now()}`, nickname, avatarId, isSelf: true, customAvatar };
    const newAccount: StoredAccount = { user: newUser, settings: DEFAULT_SETTINGS, lastActive: Date.now(), passwordHash, rooms: [] };
    setStoredAccounts(prev => [...prev, newAccount]);
    setCurrentUser(newUser);
    setSettings(DEFAULT_SETTINGS);
    setAppState(AppState.CHAT_LIST);
    setRooms([]);
    setCurrentRoom(null);
  };

  const handleLogout = () => {
    p2pServiceRef.current.destroy();
    setCurrentUser(null);
    setCurrentRoom(null);
    setAppState(AppState.AUTH);
  };

  const handleSwitchAccount = () => handleLogout();

  const handleDeleteAccount = (id: string) => setStoredAccounts(prev => prev.filter(a => a.user.id !== id));

  const handleUpdateSettings = (userUpdates: Partial<User>, newSettings: UserSettings) => {
    if (currentUser) {
      // Check if Tor setting changed, requires P2P restart
      if (newSettings.useTor !== settings.useTor) {
         // Force P2P re-init in useEffect by updating currentUser peerId via null briefly or handling logic in useEffect
         // Simplest is to update state, the useEffect detects change in settings.useTor
      }
      
      const updatedUser = { ...currentUser, ...userUpdates };
      setCurrentUser(updatedUser);
      setSettings(newSettings);
      setStoredAccounts(prev => prev.map(acc => acc.user.id === updatedUser.id ? { ...acc, user: updatedUser, settings: newSettings } : acc));
    }
  };

  const handleRoomSelect = (room: Room) => {
    setCurrentRoom(room);
    setAppState(AppState.CHAT_ROOM);
    if (room.isP2P && room.peerId && !room.isConnected) {
        p2pServiceRef.current.connect(room.peerId, {
             nickname: currentUser?.nickname,
             avatarId: currentUser?.avatarId,
             customAvatar: currentUser?.customAvatar
        });
    }
  };

  const handleCreateRoom = (name: string, description: string, type: 'GROUP' | 'CHANNEL', avatarId: number, customAvatar?: string) => {
    const newRoom: Room = {
      id: `group-${Date.now()}`,
      name,
      description,
      type,
      onlineCount: 1,
      botPersona: {
        name,
        avatarId,
        customAvatar,
        systemInstruction: '',
        temperature: 0
      },
      isPrivate: true,
      isP2P: true,
      peerId: currentUser?.peerId, // I am the host
      isAdmin: true,
      isConnected: true,
      participants: [currentUser!.peerId!]
    };

    setRooms(prev => [newRoom, ...prev]);
    setCurrentRoom(newRoom);
    setShowCreateModal(false);
    setAppState(AppState.CHAT_ROOM);
    
    setStoredAccounts(prev => prev.map(acc => acc.user.id === currentUser?.id ? { ...acc, rooms: [newRoom, ...(acc.rooms || [])] } : acc));
  };

  const handleInviteToGroup = (roomId: string, peerId: string) => {
     const room = rooms.find(r => r.id === roomId);
     if (!room || !room.isAdmin) return;

     p2pServiceRef.current.connect(peerId, {
       nickname: currentUser?.nickname,
       avatarId: currentUser?.avatarId
     });

     p2pServiceRef.current.sendInvite(peerId, {
        roomId: room.id,
        name: room.name,
        description: room.description,
        type: room.type,
        peerId: currentUser?.peerId,
        botPersona: room.botPersona
     });

     setRooms(prev => prev.map(r => {
        if (r.id === roomId) {
           const parts = r.participants || [];
           if (!parts.includes(peerId)) return { ...r, participants: [...parts, peerId] };
        }
        return r;
     }));
  };

  const handleFindUser = async (query: string) => {
    if (query.startsWith('turtle-') || query.startsWith('ghost-')) { // Support both new and legacy
      const connected = await p2pServiceRef.current.connect(query, {
        nickname: currentUser?.nickname,
        avatarId: currentUser?.avatarId,
        customAvatar: currentUser?.customAvatar
      });
      
      if (connected) {
         const id = `p2p-${query}`;
         const newRoom: Room = {
            id,
            name: query.substring(0, 8) + '...',
            description: 'P2P Чат',
            type: 'DIRECT',
            onlineCount: 1,
            botPersona: { name: 'User', avatarId: 101, systemInstruction: '', temperature: 0 },
            isPrivate: true, isP2P: true, peerId: query, isConnected: true
         };
         setRooms(prev => {
            if (prev.some(r => r.id === id)) return prev;
            return [newRoom, ...prev];
         });
         setCurrentRoom(newRoom);
         setAppState(AppState.CHAT_ROOM);
      }
      return;
    }
    const newBot: BotPersona = { name: query, avatarId: 105, systemInstruction: `Name: ${query}`, temperature: 0.7 };
    const newRoom: Room = { id: `ai-${Date.now()}`, name: query, description: 'AI Chat', type: 'DIRECT', onlineCount: 1, botPersona: newBot, isPrivate: true };
    setRooms(prev => [newRoom, ...prev]);
    setCurrentRoom(newRoom);
    setAppState(AppState.CHAT_ROOM);
  };

  const handleP2PSendMessage = (text: string) => {
    if (!currentRoom?.isP2P) return;

    const senderInfo = {
       nickname: currentUser?.nickname,
       avatarId: currentUser?.avatarId,
       customAvatar: currentUser?.customAvatar
    };

    if (currentRoom.type === 'DIRECT' && currentRoom.peerId) {
       p2pServiceRef.current.sendMessage(currentRoom.peerId, text, 'CHAT', undefined, senderInfo);
    } else if ((currentRoom.type === 'GROUP' || currentRoom.type === 'CHANNEL') && currentRoom.peerId) {
       if (currentRoom.isAdmin && currentRoom.participants) {
          p2pServiceRef.current.broadcast(currentRoom.participants, text, currentRoom.id, senderInfo);
       } else {
          p2pServiceRef.current.sendMessage(currentRoom.peerId, text, 'GROUP_MSG', currentRoom.id, senderInfo);
       }
    }
  };

  const handleStartCall = async () => {
     if (!currentRoom) return;
     setIsCalling(true);
     if (currentRoom.isP2P && currentRoom.peerId) {
        try {
           const stream = await navigator.mediaDevices.getUserMedia({video:true, audio:true});
           localStreamRef.current = stream;
           const call = p2pServiceRef.current.startCall(currentRoom.peerId, stream); 
           if (call) {
              call.on('stream', rs => setRemoteStream(rs));
              call.on('close', handleEndCall);
           }
        } catch(e) { handleEndCall(); }
     } else {
        liveServiceRef.current = new GeminiLiveService();
        await liveServiceRef.current.start(currentRoom.botPersona, () => { setIsCalling(false); liveServiceRef.current = null; });
     }
  };

  const handleEndCall = () => {
     localStreamRef.current?.getTracks().forEach(t => t.stop());
     localStreamRef.current = null;
     setRemoteStream(null);
     liveServiceRef.current?.stop();
     setIsCalling(false);
  };

  const handleToggleVideo = async (enabled: boolean, videoEl: HTMLVideoElement) => {
     if (currentRoom?.isP2P) {
        localStreamRef.current?.getVideoTracks().forEach(t => t.enabled = enabled);
     }
  };

  if (appState === AppState.AUTH) {
    return <AuthScreen onComplete={handleAuthComplete} savedAccounts={storedAccounts} onSelectAccount={loginUser} onDeleteAccount={handleDeleteAccount} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden relative text-gray-100">
      {/* Global Background for Glassmorphism */}
      {settings.isGlass ? (
        <div className="absolute inset-0 z-0">
           <img src={bgImage} className="w-full h-full object-cover opacity-60" alt="bg" />
           <div className="absolute inset-0 bg-gradient-to-br from-gray-900/80 via-black/70 to-purple-900/60"></div>
        </div>
      ) : (
        <div className="absolute inset-0 z-0 bg-gray-900"></div>
      )}

      {/* Modals */}
      {showCreateModal && <CreateRoomModal onClose={() => setShowCreateModal(false)} onCreate={handleCreateRoom} />}
      {showInviteModal && <InviteFriendModal onClose={() => setShowInviteModal(false)} myPeerId={currentUser?.peerId} />}
      {isCalling && currentRoom && (
        <CallOverlay roomName={currentRoom.name} botPersona={currentRoom.botPersona} onHangup={handleEndCall} isP2P={currentRoom.isP2P} remoteStream={remoteStream} onToggleVideo={handleToggleVideo} />
      )}

      {/* Content Layer */}
      <div className="relative z-10 flex w-full h-full">
          <ChatList
            rooms={rooms}
            currentRoomId={appState === AppState.CHAT_ROOM ? currentRoom?.id || null : null}
            onSelectRoom={handleRoomSelect}
            currentUser={currentUser!}
            onOpenSettings={() => setAppState(AppState.SETTINGS)}
            onFindUser={handleFindUser}
            isMobileMenuOpen={isMobileMenuOpen}
            closeMobileMenu={() => setIsMobileMenuOpen(false)}
            onCreateRoom={() => setShowCreateModal(true)}
            onInviteFriend={() => setShowInviteModal(true)}
            isGlass={settings.isGlass}
            useTor={settings.useTor}
          />

          <main className="flex-1 flex flex-col h-full relative z-10">
            {appState === AppState.SETTINGS ? (
              <SettingsScreen currentUser={currentUser!} currentSettings={settings} onSave={handleUpdateSettings} onBack={() => setAppState(currentRoom ? AppState.CHAT_ROOM : AppState.CHAT_LIST)} onLogout={handleLogout} onSwitchAccount={handleSwitchAccount} />
            ) : (
              <>
                {currentRoom && currentUser ? (
                  <ChatRoom 
                    room={currentRoom} 
                    currentUser={currentUser}
                    settings={settings}
                    onMenuClick={() => setIsMobileMenuOpen(true)}
                    onStartCall={handleStartCall}
                    onSendMessageP2P={handleP2PSendMessage}
                    onInviteToGroup={handleInviteToGroup}
                  />
                ) : (
                  <div className={`flex-1 flex items-center justify-center text-gray-400 ${settings.isGlass ? 'bg-transparent' : 'bg-gray-900'}`}>
                     <div className="text-center">
                       <p className="text-xl font-semibold text-gray-300 mb-2">TURTLEsn</p>
                       <p className="text-sm">Выберите чат или создайте группу</p>
                     </div>
                  </div>
                )}
              </>
            )}
          </main>
      </div>
    </div>
  );
};

export default App;
