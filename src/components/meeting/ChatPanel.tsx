import React, { useState, useRef, useEffect } from 'react';
import { Send, Lock, Unlock, ShieldCheck, Smile } from 'lucide-react';
import { User } from '../../context/AuthContext';
import { encryptText, decryptText } from '../../utils/crypto';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isEncrypted?: boolean;
}

interface ChatPanelProps {
  roomId: string;
  user: User;
  messages: ChatMessage[];
  roomPasskey?: string;
  onSendMessage: (msg: ChatMessage) => void;
}

const EMOJI_LIST = ['👍', '👏', '❤️', '🎉', '💡', '🔥'];

export const ChatPanel: React.FC<ChatPanelProps> = ({
  user,
  messages,
  roomPasskey = '',
  onSendMessage
}) => {
  const [inputText, setInputText] = useState('');
  const [useEncryption, setUseEncryption] = useState<boolean>(Boolean(roomPasskey));
  const [decryptedMessages, setDecryptedMessages] = useState<Map<string, string>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Decrypt encrypted messages if passkey changes or new messages arrive
  useEffect(() => {
    let isMounted = true;
    async function processMessages() {
      const map = new Map<string, string>();
      for (const msg of messages) {
        if (msg.isEncrypted && msg.text.startsWith('enc:v1:')) {
          const plain = await decryptText(msg.text, roomPasskey);
          map.set(msg.id, plain);
        } else {
          map.set(msg.id, msg.text);
        }
      }
      if (isMounted) {
        setDecryptedMessages(map);
      }
    }
    processMessages();
    return () => { isMounted = false; };
  }, [messages, roomPasskey]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, decryptedMessages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const rawText = inputText.trim();
    setInputText('');

    let finalPayloadText = rawText;
    let encryptedFlag = false;

    if (useEncryption && roomPasskey) {
      finalPayloadText = await encryptText(rawText, roomPasskey);
      encryptedFlag = true;
    }

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      senderId: user.id,
      senderName: user.name,
      text: finalPayloadText,
      timestamp: Date.now(),
      isEncrypted: encryptedFlag
    };

    onSendMessage(newMsg);
  };

  const handleEmojiClick = (emoji: string) => {
    setInputText(prev => prev + emoji);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 overflow-hidden">
      {/* Encryption Header Banner */}
      <div className="px-4 py-2.5 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="font-medium">In-Meeting Chat</span>
        </div>

        {roomPasskey ? (
          <button
            onClick={() => setUseEncryption(!useEncryption)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors ${
              useEncryption
                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 font-mono'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
            title="Toggle Web Crypto AES-GCM Client-Side Encryption"
          >
            {useEncryption ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            <span>{useEncryption ? 'E2EE Active' : 'Plaintext'}</span>
          </button>
        ) : (
          <span className="text-slate-500 font-mono text-[11px]">Real-Time Sync</span>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-12">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mb-2 text-slate-400">
              💬
            </div>
            <p className="text-sm font-medium text-slate-300">No messages yet</p>
            <p className="text-xs text-slate-500 mt-1">Send a message to everyone in the room.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === user.id;
            const displayText = decryptedMessages.get(msg.id) || msg.text;
            const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-xs font-medium text-slate-400">
                    {isMe ? 'You' : msg.senderName}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                    {timeStr}
                  </span>
                  {msg.isEncrypted && (
                    <span title="End-to-End Encrypted via Web Crypto">
                      <Lock className="w-2.5 h-2.5 text-emerald-400" />
                    </span>
                  )}
                </div>

                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words shadow-sm ${
                    isMe
                      ? 'bg-indigo-600 text-white rounded-tr-xs'
                      : 'bg-slate-800 text-slate-100 rounded-tl-xs border border-slate-700/60'
                  }`}
                >
                  {displayText}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Bar */}
      <div className="px-4 py-1.5 bg-slate-950/50 border-t border-slate-800/80 flex items-center gap-1 overflow-x-auto">
        <span className="text-[11px] text-slate-500 mr-1 flex items-center gap-1">
          <Smile className="w-3.5 h-3.5" />
        </span>
        {EMOJI_LIST.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => handleEmojiClick(emoji)}
            className="hover:bg-slate-800 p-1 rounded transition-colors text-base"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Input box */}
      <form onSubmit={handleSend} className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={useEncryption && roomPasskey ? "Type encrypted message..." : "Type a message..."}
          className="flex-1 bg-slate-900 border border-slate-700 focus:border-indigo-500 focus:outline-none rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-xl transition-colors shadow-sm"
          title="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
