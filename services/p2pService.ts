
import Peer, { DataConnection, MediaConnection } from 'peerjs';
import { P2PMessagePayload } from '../types';
import { EncryptionService } from './encryptionService';

const CHUNK_SIZE = 16 * 1024; // 16KB chunks for safe WebRTC transfer

interface FileTransferState {
  totalChunks: number;
  receivedChunks: number;
  chunks: string[]; // Array of base64 fragments
  type: string; // 'CHAT' | 'GROUP_MSG'
  roomId?: string;
  senderInfo?: any;
  messageId: string;
}

export class P2PService {
  private peer: Peer | null = null;
  private connections: Record<string, DataConnection> = {}; // peerId -> conn
  private encryptionServices: Record<string, EncryptionService> = {}; // peerId -> service
  
  // Reassembly buffer: messageId -> state
  private transferBuffers: Record<string, FileTransferState> = {};
  
  public myPeerId: string = '';
  
  // Callbacks
  public onConnection?: (conn: DataConnection, meta: any) => void;
  public onData?: (peerId: string, data: any, type: string, roomId?: string, senderInfo?: any) => void;
  public onIncomingCall?: (call: MediaConnection) => void;
  public onStatusChange?: (peerId: string, isConnected: boolean) => void;
  public onInvite?: (payload: any) => void;

  constructor() {}

  init(nickname: string, useTor: boolean = false): Promise<string> {
    return new Promise((resolve, reject) => {
      // Generate a random ID prefixed with "turtle-"
      const id = `turtle-${Math.floor(Math.random() * 1000000).toString(16)}`;
      
      // Tor Mode Simulation: 
      // Setting iceTransportPolicy to 'relay' forces traffic through TURN servers, 
      // preventing local IP leakage. This is the closest we can get to Tor anonymity 
      // in a pure client-side WebRTC app without a local Tor proxy binary.
      const config = useTor ? {
        config: {
           iceTransportPolicy: 'relay' as RTCIceTransportPolicy,
           iceServers: [
             { urls: 'stun:stun.l.google.com:19302' },
             // In a real production Tor-app, you would list specific TURN servers here
           ]
        },
        debug: 1
      } : { debug: 1 };

      this.peer = new Peer(id, config);

      this.peer.on('open', (id) => {
        this.myPeerId = id;
        resolve(id);
      });

      this.peer.on('connection', async (conn) => {
        this.setupConnection(conn);
      });

      this.peer.on('call', (call) => {
        if (this.onIncomingCall) {
          this.onIncomingCall(call);
        }
      });

      this.peer.on('error', (err) => {
        console.error('P2P Error:', err);
      });
    });
  }

  async connect(peerId: string, myMetadata: any): Promise<boolean> {
    if (!this.peer || peerId === this.myPeerId) return false;
    if (this.connections[peerId]) return true; // Already connected
    
    // Initialize encryption for this connection
    const encService = new EncryptionService();
    const myPublicKey = await encService.generateKeyPair();
    this.encryptionServices[peerId] = encService;

    const conn = this.peer.connect(peerId, {
      metadata: { ...myMetadata, publicKey: myPublicKey }
    });

    this.setupConnection(conn);
    return true;
  }

  private setupConnection(conn: DataConnection) {
    conn.on('open', async () => {
      console.log(`✅ Connected to ${conn.peer}`);
      this.connections[conn.peer] = conn;
      
      // If this is an incoming connection, we need to respond with our public key
      if (!this.encryptionServices[conn.peer]) {
         const encService = new EncryptionService();
         const myPublicKey = await encService.generateKeyPair();
         this.encryptionServices[conn.peer] = encService;

         // Process the incoming metadata for their key
         if (conn.metadata && conn.metadata.publicKey) {
            await encService.deriveSharedKey(conn.metadata.publicKey);
         }

         // Send back our info and key
         this.sendDirect(conn.peer, {
           type: 'KEY_EXCHANGE',
           payload: { publicKey: myPublicKey }
         });
      }

      if (this.onStatusChange) this.onStatusChange(conn.peer, true);
    });

    conn.on('data', async (data: any) => {
      const msg = data as P2PMessagePayload;
      
      if (msg.type === 'KEY_EXCHANGE') {
        const encService = this.encryptionServices[conn.peer];
        if (encService && msg.payload.publicKey) {
          await encService.deriveSharedKey(msg.payload.publicKey);
          if (this.onConnection) this.onConnection(conn, msg.senderInfo);
        }
      } else if (msg.type === 'INVITE') {
        if (this.onInvite) this.onInvite(msg.payload);
      } else if (msg.type === 'FILE_CHUNK') {
        this.handleFileChunk(conn.peer, msg.payload);
      } else if (msg.type === 'CHAT' || msg.type === 'GROUP_MSG') {
        // Decrypt standard small message
        const encService = this.encryptionServices[conn.peer];
        if (encService) {
           try {
             const decryptedText = await encService.decrypt(msg.payload.iv, msg.payload.data);
             if (this.onData) this.onData(conn.peer, decryptedText, msg.type, msg.roomId, msg.senderInfo);
           } catch (e) {
             console.error("Failed to decrypt message", e);
           }
        }
      }
    });

    conn.on('close', () => {
      console.log(`❌ Disconnected from ${conn.peer}`);
      delete this.connections[conn.peer];
      delete this.encryptionServices[conn.peer];
      if (this.onStatusChange) this.onStatusChange(conn.peer, false);
    });

    conn.on('error', (err) => {
      console.error("Connection Error", err);
    });
  }

  async sendMessage(peerId: string, text: string, type: 'CHAT' | 'GROUP_MSG' = 'CHAT', roomId?: string, senderInfo?: any) {
    const conn = this.connections[peerId];
    const encService = this.encryptionServices[peerId];
    
    if (conn && conn.open && encService) {
      try {
        const encrypted = await encService.encrypt(text);
        
        // Serialize encrypted object to string to check size
        const serialized = JSON.stringify(encrypted);
        
        if (serialized.length < CHUNK_SIZE * 2) {
            // Send directly if small
            const payload: P2PMessagePayload = {
                type: type,
                payload: encrypted,
                roomId,
                senderInfo
            };
            conn.send(payload);
        } else {
            // Send as chunks
            await this.sendAsChunks(peerId, serialized, type, roomId, senderInfo);
        }
        return true;
      } catch (e) {
        console.error("Send failed", e);
        return false;
      }
    }
    return false;
  }

  private async sendAsChunks(peerId: string, dataString: string, type: string, roomId: string | undefined, senderInfo: any) {
      const conn = this.connections[peerId];
      const messageId = Math.random().toString(36).substring(7);
      const totalLength = dataString.length;
      const totalChunks = Math.ceil(totalLength / CHUNK_SIZE);

      for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, totalLength);
          const chunk = dataString.substring(start, end);

          conn.send({
              type: 'FILE_CHUNK',
              payload: {
                  messageId,
                  chunkIndex: i,
                  totalChunks,
                  data: chunk,
                  origType: type,
                  roomId,
                  senderInfo
              }
          });
          
          // Small delay to prevent buffer overflow
          if (i % 10 === 0) await new Promise(r => setTimeout(r, 5));
      }
  }

  private handleFileChunk(peerId: string, payload: any) {
      const { messageId, chunkIndex, totalChunks, data, origType, roomId, senderInfo } = payload;
      
      if (!this.transferBuffers[messageId]) {
          this.transferBuffers[messageId] = {
              totalChunks,
              receivedChunks: 0,
              chunks: new Array(totalChunks).fill(''),
              type: origType,
              roomId,
              senderInfo,
              messageId
          };
      }

      const buffer = this.transferBuffers[messageId];
      if (buffer.chunks[chunkIndex] === '') {
        buffer.chunks[chunkIndex] = data;
        buffer.receivedChunks++;
      }

      if (buffer.receivedChunks === buffer.totalChunks) {
          // Complete
          const fullString = buffer.chunks.join('');
          delete this.transferBuffers[messageId];

          try {
             const encrypted = JSON.parse(fullString);
             const encService = this.encryptionServices[peerId];
             if (encService) {
                 encService.decrypt(encrypted.iv, encrypted.data).then(decryptedText => {
                     if (this.onData) this.onData(peerId, decryptedText, buffer.type, buffer.roomId, buffer.senderInfo);
                 });
             }
          } catch (e) {
             console.error("Reassembly failed", e);
          }
      }
  }

  async broadcast(peerIds: string[], text: string, roomId: string, senderInfo: any) {
    for (const peerId of peerIds) {
      if (peerId !== this.myPeerId) {
        await this.sendMessage(peerId, text, 'GROUP_MSG', roomId, senderInfo);
      }
    }
  }

  sendInvite(peerId: string, roomInfo: any) {
    this.sendDirect(peerId, {
      type: 'INVITE',
      payload: roomInfo
    });
  }

  private sendDirect(peerId: string, payload: P2PMessagePayload) {
    const conn = this.connections[peerId];
    if (conn && conn.open) {
      conn.send(payload);
    }
  }

  startCall(peerId: string, stream: MediaStream): MediaConnection | null {
    if (!this.peer) return null;
    return this.peer.call(peerId, stream);
  }

  destroy() {
    this.peer?.destroy();
    this.peer = null;
  }
}
