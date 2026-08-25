'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { getPrivateKey, encryptMessage, decryptMessage } from '@/utils/crypto';
import { Hash, Send, LogOut, ShieldCheck, Plus, Compass, X, Search } from 'lucide-react';

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

  const [isHydrated, setIsHydrated] = useState(false);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [activeCommunity, setActiveCommunity] = useState<Community | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');

  // Modal states
  const [showCreateCommunity, setShowCreateCommunity] = useState(false);
  const [showExploreCommunities, setShowExploreCommunities] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);

  const [newCommName, setNewCommName] = useState('');
  const [newCommDesc, setNewCommDesc] = useState('');
  const [newChanName, setNewChanName] = useState('');
  
  // Explore states
  const [exploreList, setExploreList] = useState<Community[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mark when hydration from localStorage completes
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated && !token) {
      router.push('/login');
    }
  }, [isHydrated, token, router]);

  const fetchCommunities = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/communities`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.communities) {
        setCommunities(data.communities);
        if (data.communities.length > 0 && !activeCommunity) {
          setActiveCommunity(data.communities[0]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isHydrated && token) {
      fetchCommunities();
    }
  }, [isHydrated, token]);

  // Fetch all existing communities for discovery
  const fetchAllCommunities = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/communities/explore`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.communities) {
        setExploreList(data.communities);
      }
    } catch (err) {
      console.error(err);
    }
  };

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
    if (!token || !activeChannel || !user) return;

    const privKey = getPrivateKey(user.id);

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/channels/${activeChannel.id}/messages`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then(async (data) => {
        if (data.messages) {
          const decryptedMessages = await Promise.all(
            data.messages.map(async (msg: Message) => {
              const decryptedContent = privKey ? await decryptMessage(privKey, msg.content) : msg.content;
              return { ...msg, content: decryptedContent };
            })
          );
          setMessages(decryptedMessages.reverse());
        }
      })
      .catch(console.error);

    const wsUrl = `ws://localhost:4000/ws/channels/${activeChannel.id}?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = async (event) => {
      const payload = JSON.parse(event.data);
      if (payload.event === 'NEW_MESSAGE') {
        const incomingMsg: Message = payload.data;
        const privKey = getPrivateKey(user.id);
        const decryptedContent = privKey ? await decryptMessage(privKey, incomingMsg.content) : incomingMsg.content;
        
        setMessages((prev) => [...prev, { ...incomingMsg, content: decryptedContent }]);
      }
    };

    return () => {
      ws.close();
    };
  }, [token, activeChannel, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !wsRef.current || !user || !token) return;

    try {
      const keyRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${user.id}/keys`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const keyData = await keyRes.json();
      
      let ciphertext = inputMessage;
      if (keyData.user?.publicKey) {
        ciphertext = await encryptMessage(keyData.user.publicKey, inputMessage);
      }

      wsRef.current.send(JSON.stringify({ content: ciphertext }));
      setInputMessage('');
    } catch (err) {
      console.error('Encryption transmission failed:', err);
    }
  };

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommName.trim() || !token) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/communities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newCommName, description: newCommDesc })
      });
      const data = await res.json();
      if (res.ok) {
        setNewCommName('');
        setNewCommDesc('');
        setShowCreateCommunity(false);
        await fetchCommunities();
        setActiveCommunity(data.community);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleJoinCommunity = async (communityId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/communities/${communityId}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setShowExploreCommunities(false);
        await fetchCommunities();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChanName.trim() || !activeCommunity || !token) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/communities/${activeCommunity.id}/channels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newChanName, type: 'TEXT' })
      });
      if (res.ok) {
        setNewChanName('');
        setShowCreateChannel(false);
        const chanRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/communities/${activeCommunity.id}/channels`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const chanData = await chanRes.json();
        if (chanData.channels) setChannels(chanData.channels);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredExploreList = exploreList.filter((comm) =>
    comm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    comm.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isHydrated || !token || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#313338] text-white">
        Loading MeshChat...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#313338] text-[#dbdee1] overflow-hidden relative">
      {/* 1. Community Sidebar */}
      <div className="w-[72px] bg-[#1e1f22] flex flex-col items-center py-3 space-y-3">
        <div className="w-12 h-12 rounded-3xl bg-[#5865f2] flex items-center justify-center font-bold text-white cursor-pointer hover:rounded-2xl transition-all shadow-md">
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

        {/* Explore / Search Communities Button */}
        <button
          onClick={() => {
            fetchAllCommunities();
            setShowExploreCommunities(true);
          }}
          className="w-12 h-12 rounded-3xl bg-[#35363c] text-[#949ba4] flex items-center justify-center hover:rounded-2xl hover:bg-[#5865f2] hover:text-white transition-all"
          title="Explore Communities"
        >
          <Compass className="w-6 h-6" />
        </button>

        {/* Add Community Button */}
        <button
          onClick={() => setShowCreateCommunity(true)}
          className="w-12 h-12 rounded-3xl bg-[#35363c] text-emerald-400 flex items-center justify-center hover:rounded-2xl hover:bg-emerald-500 hover:text-white transition-all"
          title="Create a Community"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* 2. Channel Sidebar */}
      <div className="w-60 bg-[#2b2d31] flex flex-col">
        <div className="h-12 border-b border-[#1f2023] px-4 flex items-center justify-between font-bold text-white shadow-sm">
          <span className="truncate">{activeCommunity ? activeCommunity.name : 'MeshChat'}</span>
          {activeCommunity && (
            <button
              onClick={() => setShowCreateChannel(true)}
              className="text-[#949ba4] hover:text-white"
              title="Create Channel"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}
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
          <div className="flex items-center space-x-2 truncate">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-sm font-medium text-white truncate">@{user.username}</span>
          </div>
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
        <div className="h-12 border-b border-[#1f2023] px-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center">
            <Hash className="w-5 h-5 text-[#80848e] mr-2" />
            <span className="font-bold text-white">{activeChannel ? activeChannel.name : 'select-channel'}</span>
          </div>
          <div className="flex items-center space-x-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>End-to-End Encrypted</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className="flex flex-col">
              <div className="flex items-baseline space-x-2">
                <span className="font-semibold text-white text-sm">{msg.sender?.username || 'User'}</span>
                <span className="text-xs text-[#949ba4]">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-[#dbdee1] text-sm mt-1 whitespace-pre-wrap">{msg.content}</p>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-[#313338]">
          <form onSubmit={handleSendMessage} className="bg-[#383a40] rounded-lg px-4 py-2.5 flex items-center">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={activeChannel ? `Message #${activeChannel.name} (Encrypted)` : 'Select a channel first'}
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

      {/* --- MODALS --- */}

      {/* Explore / Search Communities Modal */}
      {showExploreCommunities && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#313338] w-full max-w-lg rounded-lg p-6 shadow-2xl border border-[#232428] text-[#dbdee1] flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white flex items-center">
                <Compass className="w-6 h-6 mr-2 text-[#5865f2]" /> Explore Communities
              </h2>
              <button onClick={() => setShowExploreCommunities(false)} className="text-[#949ba4] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-3 w-4 h-4 text-[#949ba4]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search communities by name or topic..."
                className="w-full rounded bg-[#1e1f22] pl-9 pr-3 py-2.5 text-white placeholder-[#949ba4] text-sm border-none focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
              />
            </div>

            {/* Community List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredExploreList.length === 0 ? (
                <div className="text-center py-8 text-[#949ba4] text-sm">No communities found.</div>
              ) : (
                filteredExploreList.map((comm) => {
                  const isMember = communities.some((c) => c.id === comm.id);
                  return (
                    <div key={comm.id} className="bg-[#2b2d31] p-4 rounded-lg flex items-center justify-between border border-[#1f2023]">
                      <div>
                        <h3 className="font-bold text-white text-base">{comm.name}</h3>
                        <p className="text-xs text-[#949ba4] mt-0.5">{comm.description || 'No description provided.'}</p>
                      </div>
                      {isMember ? (
                        <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded font-medium">
                          Joined
                        </span>
                      ) : (
                        <button
                          onClick={() => handleJoinCommunity(comm.id)}
                          className="bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs px-4 py-2 rounded font-medium transition-colors"
                        >
                          Join
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Community Modal */}
      {showCreateCommunity && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#313338] w-full max-w-md rounded-lg p-6 shadow-2xl border border-[#232428] text-[#dbdee1]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Create a Community</h2>
              <button onClick={() => setShowCreateCommunity(false)} className="text-[#949ba4] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCommunity} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#949ba4] mb-2">Community Name</label>
                <input
                  type="text"
                  value={newCommName}
                  onChange={(e) => setNewCommName(e.target.value)}
                  placeholder="e.g. AI Researchers"
                  required
                  className="w-full rounded bg-[#1e1f22] p-3 text-white border-none focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#949ba4] mb-2">Description</label>
                <input
                  type="text"
                  value={newCommDesc}
                  onChange={(e) => setNewCommDesc(e.target.value)}
                  placeholder="What is this community about?"
                  className="w-full rounded bg-[#1e1f22] p-3 text-white border-none focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateCommunity(false)}
                  className="px-4 py-2 rounded text-white hover:underline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded bg-[#5865f2] text-white font-medium hover:bg-[#4752c4] transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Channel Modal */}
      {showCreateChannel && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#313338] w-full max-w-md rounded-lg p-6 shadow-2xl border border-[#232428] text-[#dbdee1]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Create Text Channel</h2>
              <button onClick={() => setShowCreateChannel(false)} className="text-[#949ba4] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateChannel} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#949ba4] mb-2">Channel Name</label>
                <input
                  type="text"
                  value={newChanName}
                  onChange={(e) => setNewChanName(e.target.value)}
                  placeholder="e.g. general-chat"
                  required
                  className="w-full rounded bg-[#1e1f22] p-3 text-white border-none focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateChannel(false)}
                  className="px-4 py-2 rounded text-white hover:underline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded bg-[#5865f2] text-white font-medium hover:bg-[#4752c4] transition-colors"
                >
                  Create Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}