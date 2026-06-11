import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { X, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

// فلتر لمنع مشاركة الأرقام
const filterPhoneNumbers = (text) => {
  const phoneRegex = /01[0-2,5]{1}[0-9]{8}/g;
  return text.replace(phoneRegex, '***');
};

const ChatPopup = ({ requestId, currentUser, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [chatId, setChatId] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  // 1. إنشاء أو جلب الشات
  useEffect(() => {
    const initChat = async () => {
      let { data: chat, error } = await supabase
        .from('chats')
        .select('id')
        .eq('request_id', requestId)
        .maybeSingle();

      if (error) {
        setError('فشل الاتصال بقاعدة البيانات.');
        return;
      }

      if (!chat) {
        const { data: newChat, error: insertErr } = await supabase
          .from('chats')
          .insert({ request_id: requestId })
          .select('id')
          .single();

        if (insertErr) {
          setError('فشل إنشاء المحادثة.');
          return;
        }
        chat = newChat;
      }

      setChatId(chat.id);

      // تحميل الرسائل
      const { data: msgs, error: msgsErr } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chat.id)
        .order('created_at', { ascending: true });

      if (!msgsErr && msgs) setMessages(msgs);
    };

    initChat();
  }, [requestId]);

  // 2. اشتراك Realtime لاستقبال الرسائل الجديدة
  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel(`chat-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel).catch(console.error);
    };
  }, [chatId]);

  // 3. التمرير لأسفل عند وصول رسالة جديدة
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 4. إرسال رسالة
  const handleSend = async () => {
    if (!newMsg.trim() || !chatId || !currentUser?.id) return;

    setSending(true);
    setError('');

    const filtered = filterPhoneNumbers(newMsg);

    const { error } = await supabase.from('messages').insert({
      chat_id: chatId,
      sender_id: currentUser.id,
      sender_type: currentUser.userType,
      message: newMsg,
      filtered_message: filtered,
    });

    if (error) {
      console.error('فشل إرسال الرسالة:', error);
      setError('فشل الإرسال: ' + error.message);
    } else {
      setNewMsg('');
    }

    setSending(false);
  };

  return (
    <div className="fixed bottom-4 right-4 w-80 h-96 bg-card rounded-2xl shadow-2xl border flex flex-col z-50">
      {/* رأس المحادثة */}
      <div className="flex justify-between items-center p-3 border-b">
        <h3 className="font-bold text-sm">محادثة الطلب #{requestId}</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X size={16} />
        </Button>
      </div>

      {/* جسم المحادثة */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {error && <p className="text-xs text-red-500 text-center">{error}</p>}
        {messages.length === 0 && !error && (
          <p className="text-xs text-center text-muted-foreground">لا توجد رسائل. ابدأ المحادثة.</p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-2 rounded-lg text-sm ${
                msg.sender_id === currentUser?.id ? 'bg-primary text-white' : 'bg-muted'
              }`}
            >
              {msg.filtered_message}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* حقل الإرسال */}
      <div className="p-3 border-t flex gap-2">
        <Input
          value={newMsg}
          onChange={(e) => setNewMsg(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="اكتب رسالة..."
          disabled={sending}
        />
        <Button size="sm" onClick={handleSend} disabled={sending || !newMsg.trim()}>
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </Button>
      </div>
    </div>
  );
};

export default ChatPopup;