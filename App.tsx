
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { useLocalStorage } from './hooks/useLocalStorage';
import { type Chat, type Message } from './types';
import { generateResponse } from './services/geminiService';

const App: React.FC = () => {
  const [chats, setChats] = useLocalStorage<Chat[]>('ai-agent-chats', []);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeChatId && chats.length > 0) {
      setActiveChatId(chats[0].id);
    }
     if (chats.length === 0) {
        setActiveChatId(null);
    }
  }, [activeChatId, chats]);

  const handleNewChat = useCallback(() => {
    const newChat: Chat = {
      id: `chat-${Date.now()}`,
      title: 'New Project',
      messages: [],
      createdAt: new Date().toISOString(),
    };
    setChats(prevChats => [newChat, ...prevChats]);
    setActiveChatId(newChat.id);
  }, [setChats]);

  const handleSelectChat = useCallback((id: string) => {
    setActiveChatId(id);
  }, []);

  const handleDeleteChat = useCallback((id: string) => {
    setChats(prev => {
        const newChats = prev.filter(chat => chat.id !== id);
        if (activeChatId === id) {
            setActiveChatId(newChats.length > 0 ? newChats[0].id : null);
        }
        return newChats;
    });
  }, [activeChatId, setChats]);

  const handleSendMessage = async (prompt: string) => {
    if (!activeChatId) return;

    const userMessage: Message = { role: 'user', content: prompt };

    setChats(prevChats =>
      prevChats.map(chat =>
        chat.id === activeChatId
          ? {
              ...chat,
              title: chat.messages.length === 0 ? prompt.substring(0, 40) : chat.title,
              messages: [...chat.messages, userMessage],
            }
          : chat
      )
    );

    try {
        const currentChat = chats.find(c => c.id === activeChatId);
        const history = currentChat ? currentChat.messages.map(m => ({ role: m.role, parts: [{ text: m.content }] })) : [];
        
        const { text, sources } = await generateResponse(prompt, history);

        const modelMessage: Message = { role: 'model', content: text, sources };

        setChats(prevChats =>
            prevChats.map(chat =>
                chat.id === activeChatId
                ? { ...chat, messages: [...chat.messages, modelMessage] }
                : chat
            )
        );
    } catch (error) {
        console.error("Failed to get response from Gemini:", error);
        const errorMessage: Message = { role: 'model', content: "Sorry, I couldn't process that request. Please try again." };
        setChats(prevChats =>
            prevChats.map(chat =>
                chat.id === activeChatId
                ? { ...chat, messages: [...chat.messages, errorMessage] }
                : chat
            )
        );
    }
  };

  const activeChat = useMemo(() => chats.find(chat => chat.id === activeChatId), [chats, activeChatId]);

  return (
    <div className="flex h-screen w-full bg-gray-900 text-gray-100 font-sans">
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
      />
      <main className="flex-1 flex flex-col h-screen">
        <ChatWindow 
            key={activeChatId} 
            chat={activeChat} 
            onSendMessage={handleSendMessage}
            onNewChat={handleNewChat} 
        />
      </main>
    </div>
  );
};

export default App;
