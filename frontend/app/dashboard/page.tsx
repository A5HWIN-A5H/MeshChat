'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { Hash, MessageSquare, Plus, Send, LogOut } from 'lucide-react';

interface Community {
  id: string;
  name: string;
  description: string;
}

interface Channel {
  id: string;
  name: string;
  type: string;
}

interface Message {
  id: string;
  channelId: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    username: string;
  };
}

export default function DashboardPage() {
  const { token, user, logout } = useAuthStore();
  const router = useRouter();

  const [communities, setCommunities] = useState<Community[]>([]);
  const [activeCommunity, setActiveCommunity] = useState<Community | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!token) {
      router.push('/login');
    }
  }, [token, router]);

  // Fetch communities on load
  useEffect(() => {
    if (!token) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/communities`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.communities && data.communities.length > 0) {
          setCommunities(data.communities);
          setActiveCommunity(data.communities[0]);
        }
      })
      .catch(console.error);
  }, [token]);

  // Fetch channels when active community changes
  useEffect(() => {
    if (!token || !activeCommunity) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/communities/${activeCommunity.id}/channels`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.channels && data.channels.length > 0) {
          setChannels(data.channels);
          setActiveChannel(data.channels[0]);
        } else {
          setChannels([]);
          setActiveChannel(null);
        }
      })
      .catch(console.error);
  }, [token, activeCommunity]);

  // Fetch messages & open WebSocket when active channel changes
  useEffect(() => {
    if (!token || !activeChannel) return;

    // 1. Fetch history via REST
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/channels/${activeChannel.id}/messages`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.messages) {
          setMessages(data.messages.reverse());
        }
      })
      .catch(console.error);

    // 2. Open WebSocket connection
    const wsUrl = `ws://localhost:4000/ws/channels/${activeChannel.id}?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.event === 'NEW_MESSAGE') {
        setMessages((prev) => [...prev, payload.data]);
      }
    };

    return () => {
      ws.close();
    };
  }, [token, activeChannel]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !wsRef.current) return;

    wsRef.current.send(JSON.stringify({ content: inputMessage }));
    setInputMessage('');
  };

  if (!user) return null;

  return (
    <div className="flex h-screen bg-[#313338] text-[#dbdee1] overflow-hidden">
      {/* 1. Community Sidebar */}
      <div className="w-[72px] bg-[#1e1f22] flex flex-col items-center py-3 space-y-3">
        <div className="w-12 h-12 rounded-3xl bg-[#5865f2] flex items-center justify-center font-bold text-white cursor-pointer hover:rounded-2xl transition-all">
          MC
        </div>
        <hr className="w-8 border-[#35363c]" />
        {communities.map((comm) => (
          <button
            key={comm.id}
            onClick={() => setActiveCommunity(comm)}
            className={`w-12 h-12 rounded-3xl flex items-center justify-center font-semibold transition-all ${
              activeCommunity?.id === comm.id
                ? 'rounded-2xl bg-[#5865f2] text-white'
                : 'bg-[#35363c] text-[#dbdee1] hover:rounded-2xl hover:bg-[#5865f2] hover:text-white'
            }`}
            title={comm.name}
          >
            {comm.name.substring(0, 2).toUpperCase()}
          </button>
        ))}
      </div>

      {/* 2. Channel Sidebar */}
      <div className="w-60 bg-[#2b2d31] flex flex-col">
        <div className="h-12 border-b border-[#1f2023] px-4 flex items-center font-bold text-white shadow-sm">
          {activeCommunity ? activeCommunity.name : 'MeshChat'}
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="text-xs font-bold text-[#949ba4] uppercase px-2 mb-1">Text Channels</div>
          {channels.map((chan) => (
            <button
              key={chan.id}
              onClick={() => setActiveChannel(chan)}
              className={`w-full flex items-center px-2 py-1.5 rounded text-sm font-medium transition-colors ${
                activeChannel?.id === chan.id
                  ? 'bg-[#404249] text-white'
                  : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
              }`}
            >
              <Hash className="w-4 h-4 mr-1.5" />
              {chan.name}
            </button>
          ))}
        </div>
        <div className="h-14 bg-[#232428] px-3 flex items-center justify-between">
          <div className="text-sm font-medium text-white truncate">@{user.username}</div>
          <button
            onClick={() => {
              logout();
              router.push('/login');
            }}
            className="text-[#949ba4] hover:text-white"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. Main Chat Window */}
      <div className="flex-1 flex flex-col bg-[#313338]">
        {/* Chat Header */}
        <div className="h-12 border-b border-[#1f2023] px-4 flex items-center shadow-sm">
          <Hash className="w-5 h-5 text-[#80848e] mr-2" />
          <span className="font-bold text-white">{activeChannel ? activeChannel.name : 'select-channel'}</span>
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className="flex flex-col">
              <div className="flex items-baseline space-x-2">
                <span className="font-semibold text-white text-sm hover:underline cursor-pointer">
                  {msg.sender?.username || 'User'}
                </span>
                <span className="text-xs text-[#949ba4]">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-[#dbdee1] text-sm mt-1 whitespace-pre-wrap">{msg.content}</p>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Box */}
        <div className="p-4 bg-[#313338]">
          <form onSubmit={handleSendMessage} className="bg-[#383a40] rounded-lg px-4 py-2.5 flex items-center">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={activeChannel ? `Message #${activeChannel.name}` : 'Select a channel first'}
              disabled={!activeChannel}
              className="w-full bg-transparent text-[#dbdee1] placeholder-[#6d6f78] focus:outline-none text-sm"
            />
            <button
              type="submit"
              disabled={!activeChannel || !inputMessage.trim()}
              className="ml-2 text-[#949ba4] hover:text-white disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}