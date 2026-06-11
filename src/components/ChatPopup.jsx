import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { X, Send } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

// فلتر لمنع الأرقام
const filterPhoneNumbers = (text) => {
  const phoneRegex = /01[0-2,5]{1}[0-9]{8}/g;
  return text.replace(phoneRegex, '***');
};

const ChatPopup = ({ requestId, currentUser, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [chatId, setChatId] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    const initChat = async () => {
      // جلب أو إنشاء chat
      let { data: chat, error } = await supabase
        .from('chats')
        .select('id')
        .eq('request_id', requestId)
        .maybeSingle();

      if (!chat) {
        const { data: newChat, error: insertErr } = await supabase
          .from('chats')
          .insert({ request_id: requestId })
          .select('id')
          .single();
        if (insertErr) return;
        chat = newChat;
      }
      setChatId(chat.id);

      // تحميل الرسائل
      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chat.id)
        .order('created_at', { ascending: true });
      if (msgs) setMessages(msgs);
    };

    initChat();

    // اشتراك Realtime (اختياري)
    const channel = supabase
      .channel(`chat-${requestId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`,
      }, payload => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMsg.trim() || !chatId) return;
    const filtered = filterPhoneNumbers(newMsg);
    const { error } = await supabase.from('messages').insert({
      chat_id: chatId,
      sender_id: currentUser.id,
      sender_type: currentUser.userType,
      message: newMsg,
      filtered_message: filtered,
    });
    if (error) {
      console.error('فشل الإرسال:', error);
    } else {
      setNewMsg('');
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-80 h-96 bg-card rounded-2xl shadow-2xl border flex flex-col z-50">
      <div className="flex justify-between items-center p-3 border-b">
        <h3 className="font-bold text-sm">محادثة الطلب #{requestId}</h3>
        <Button variant="ghost" size="sm" onClick={onClose}><X size={16} /></Button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.sender_id === currentUser.id ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-2 rounded-lg text-sm ${msg.sender_id === currentUser.id ? 'bg-primary text-white' : 'bg-muted'}`}>
              {msg.filtered_message}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t flex gap-2">
        <Input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="اكتب رسالة..." />
        <Button size="sm" onClick={handleSend}><Send size={16} /></Button>
      </div>
    </div>
  );
};

export default ChatPopup;