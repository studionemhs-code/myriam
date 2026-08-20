import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Send, ImagePlus, FileText } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { notifyUser } from '@/lib/notify';

const MAX_SIZE = 100 * 1024 * 1024;

export default function ChatConversation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);
  const scrollRef = useRef(null);

  const loadMessages = useCallback(async () => {
    try {
      const list = await base44.entities.ChatMessage.filter({ conversation_id: id }, 'created_date', 200);
      setMessages(list);
      if (user) {
        const unread = list.filter((m) => m.sender_id !== user.id && !m.read_by?.includes(user.id));
        if (unread.length) {
          await base44.entities.ChatMessage.bulkUpdate(unread.map((m) => ({ id: m.id, read_by: [...(m.read_by || []), user.id] })));
        }
      }
    } catch (e) { /* ignore */ }
  }, [id, user]);

  const loadConversation = async () => {
    try {
      const list = await base44.entities.ChatConversation.filter({ id });
      setConversation(list[0] || null);
    } catch (e) { /* ignore */ }
  };

  useEffect(() => {
    if (!user) return;
    loadConversation();
    loadMessages();
    const unsub = base44.entities.ChatMessage.subscribe(() => loadMessages());
    return unsub;
  }, [user, id, loadMessages]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!text.trim() || !conversation) return;
    setSending(true);
    try {
      await base44.entities.ChatMessage.create({
        conversation_id: id,
        sender_id: user.id,
        sender_name: user.full_name || 'Eu',
        sender_photo: user.photo_url || '',
        text: text.trim(),
        participants: conversation.participants,
        read_by: [user.id]
      });
      await base44.entities.ChatConversation.update(id, {
        last_message_text: text.trim(),
        last_message_date: new Date().toISOString(),
        last_sender_id: user.id
      });
      setText('');
      const otherId = conversation.participants.find((p) => p !== user.id);
      if (otherId) {
        await notifyUser({ user_id: otherId, category: 'myriam', title: 'Nova mensagem', body: text.trim().slice(0, 100), link: `/chat/${id}` });
      }
    } finally { setSending(false); }
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !conversation) return;
    if (file.size > MAX_SIZE) { setError('Arquivo muito grande (máx 100MB)'); return; }
    setError('');
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const fileType = file.type.startsWith('video') ? 'video' : file.type.startsWith('image') ? 'image' : 'document';
      await base44.entities.ChatMessage.create({
        conversation_id: id,
        sender_id: user.id,
        sender_name: user.full_name || 'Eu',
        sender_photo: user.photo_url || '',
        text: '',
        file_url,
        file_type: fileType,
        participants: conversation.participants,
        read_by: [user.id]
      });
      const label = fileType === 'image' ? '📷 Foto' : fileType === 'video' ? '🎥 Vídeo' : '📎 Documento';
      await base44.entities.ChatConversation.update(id, {
        last_message_text: label,
        last_message_date: new Date().toISOString(),
        last_sender_id: user.id
      });
      const otherId = conversation.participants.find((p) => p !== user.id);
      if (otherId) await notifyUser({ user_id: otherId, category: 'myriam', title: 'Nova mensagem', body: 'Você recebeu uma mídia', link: `/chat/${id}` });
    } catch (e) { setError('Falha no upload'); } finally { setUploading(false); }
  };

  if (!conversation) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>;
  }

  const otherIdx = conversation.participants.indexOf(user.id) === 0 ? 1 : 0;
  const otherName = conversation.participant_names?.[otherIdx] || 'Alma';
  const otherPhoto = conversation.participant_photos?.[otherIdx] || '';

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 140px)' }}>
      <div className="mb-3 flex items-center gap-3 border-b border-border pb-3">
        <button onClick={() => navigate('/myriam')} className="text-muted-foreground"><ChevronLeft className="h-5 w-5" /></button>
        {otherPhoto ? <img src={otherPhoto} className="h-10 w-10 rounded-full object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-marian/15 text-sm text-marian">{(otherName || 'A')[0]}</div>}
        <p className="font-display text-lg">{otherName}</p>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto pb-4">
        {messages.map((m) => {
          const mine = m.sender_id === user.id;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${mine ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm bg-muted'}`}>
                {m.text && <p className="text-sm">{m.text}</p>}
                {m.file_url && m.file_type === 'image' && <img src={m.file_url} className="mt-1 max-h-48 rounded-lg" />}
                {m.file_url && m.file_type === 'video' && <video src={m.file_url} className="mt-1 max-h-48 rounded-lg" controls />}
                {m.file_url && m.file_type === 'document' && <a href={m.file_url} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-2 text-sm underline"><FileText className="h-4 w-4" /> Documento</a>}
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {error && <p className="mb-2 text-center text-sm text-destructive">{error}</p>}
      <div className="flex items-center gap-2 border-t border-border pt-3">
        <label className="cursor-pointer text-muted-foreground hover:text-primary">
          <ImagePlus className="h-5 w-5" />
          <input ref={fileRef} type="file" accept="image/*,video/*,application/pdf,.doc,.docx" onChange={onFile} className="hidden" />
        </label>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Mensagem..."
          className="flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm outline-none focus:border-primary"
        />
        <button onClick={send} disabled={sending || uploading || !text.trim()} className="rounded-full bg-primary p-2.5 text-primary-foreground disabled:opacity-40">
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}