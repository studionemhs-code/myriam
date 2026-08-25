import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Send, ImagePlus, FileText, Camera, Check, CheckCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { notifyUser } from '@/lib/notify';
import AudioRecorder from '@/components/myriam/AudioRecorder';
import AudioBubble from '@/components/myriam/AudioBubble';
import MessageContextMenu from '@/components/myriam/MessageContextMenu';
import ReplyBar from '@/components/myriam/ReplyBar';

const MAX_SIZE = 100 * 1024 * 1024;

export default function ChatConversation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [menuMsg, setMenuMsg] = useState(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const fileRef = useRef(null);
  const cameraPhotoRef = useRef(null);
  const scrollRef = useRef(null);
  const typingTimerRef = useRef(null);
  const lastTypingSentRef = useRef(0);

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

  // Initial load + realtime subscription (efficient merge)
  useEffect(() => {
    if (!user) return;
    loadConversation();
    loadMessages();
    const unsubMsg = base44.entities.ChatMessage.subscribe((event) => {
      if (!event || event.data?.conversation_id !== id) return;
      setMessages((prev) => {
        if (event.type === 'delete') return prev.filter((m) => m.id !== event.id);
        const idx = prev.findIndex((m) => m.id === event.id);
        if (idx === -1) {
          // New message — replace optimistic temp if matches
          const tempMatch = prev.find((m) => m._temp && m.text === event.data.text && m.sender_id === event.data.sender_id && Math.abs(new Date(event.data.created_date) - new Date(m.created_date)) < 5000);
          if (tempMatch) {
            return prev.map((m) => (m.id === tempMatch.id ? { ...event.data } : m));
          }
          return [...prev, event.data];
        }
        const next = [...prev];
        next[idx] = event.data;
        return next;
      });
      // Mark as read if from other
      if (event.type === 'create' && event.data.sender_id !== user.id && !event.data.read_by?.includes(user.id)) {
        base44.entities.ChatMessage.update(event.data.id, { read_by: [...(event.data.read_by || []), user.id] }).catch(() => {});
      }
    });
    const unsubConv = base44.entities.ChatConversation.subscribe((event) => {
      if (event?.id === id) {
        setConversation(event.data);
        if (event.data.typing_user_id && event.data.typing_user_id !== user.id) {
          const ts = new Date(event.data.typing_date).getTime();
          if (Date.now() - ts < 4000) setOtherTyping(true);
          else setOtherTyping(false);
        } else {
          setOtherTyping(false);
        }
      }
    });
    return () => { unsubMsg(); unsubConv(); };
  }, [user, id, loadMessages]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Typing indicator cleanup
  useEffect(() => {
    const interval = setInterval(() => {
      setOtherTyping((prev) => {
        if (prev && conversation?.typing_date) {
          if (Date.now() - new Date(conversation.typing_date).getTime() > 4000) return false;
        }
        return prev;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [conversation]);

  const sendTyping = async () => {
    const now = Date.now();
    if (now - lastTypingSentRef.current < 1000) return;
    lastTypingSentRef.current = now;
    try {
      await base44.entities.ChatConversation.update(id, { typing_user_id: user.id, typing_date: new Date().toISOString() });
    } catch { /* ignore */ }
  };

  const clearTyping = async () => {
    try {
      await base44.entities.ChatConversation.update(id, { typing_user_id: '', typing_date: new Date().toISOString() });
    } catch { /* ignore */ }
  };

  const onType = (e) => {
    setText(e.target.value);
    if (e.target.value.trim()) sendTyping();
    else clearTyping();
  };

  const send = async () => {
    if (!text.trim() || !conversation) return;
    const content = text.trim();
    const tempId = `temp-${Date.now()}`;
    const tempMsg = {
      id: tempId,
      _temp: true,
      conversation_id: id,
      sender_id: user.id,
      sender_name: user.display_name || user.full_name || 'Eu',
      sender_photo: user.photo_url || '',
      text: content,
      participants: conversation.participants,
      read_by: [user.id],
      created_date: new Date().toISOString(),
      reply_to_id: replyTo?.id,
      reply_to_text: replyTo?.reply_to_text || replyTo?.text || '',
      reply_to_sender_name: replyTo?.reply_to_sender_name || replyTo?.sender_name || ''
    };
    setMessages((prev) => [...prev, tempMsg]);
    setText('');
    setReplyTo(null);
    clearTyping();
    try {
      const created = await base44.entities.ChatMessage.create({
        conversation_id: id,
        sender_id: user.id,
        sender_name: user.display_name || user.full_name || 'Eu',
        sender_photo: user.photo_url || '',
        text: content,
        participants: conversation.participants,
        read_by: [user.id],
        reply_to_id: tempMsg.reply_to_id,
        reply_to_text: tempMsg.reply_to_text,
        reply_to_sender_name: tempMsg.reply_to_sender_name
      });
      setMessages((prev) => prev.map((m) => m.id === tempId ? { ...created, _pending: false } : m));
      await base44.entities.ChatConversation.update(id, {
        last_message_text: content,
        last_message_date: new Date().toISOString(),
        last_sender_id: user.id
      });
      const otherId = conversation.participants.find((p) => p !== user.id);
      if (otherId) {
        await notifyUser({ user_id: otherId, category: 'myriam', title: 'Nova mensagem', body: content.slice(0, 100), link: `/chat/${id}` });
      }
    } catch (e) {
      setMessages((prev) => prev.map((m) => m.id === tempId ? { ...m, _error: true, _temp: false } : m));
    }
  };

  const resend = async (msg) => {
    const content = msg.text;
    setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, _error: false, _temp: true } : m));
    try {
      const created = await base44.entities.ChatMessage.create({
        conversation_id: id,
        sender_id: user.id,
        sender_name: msg.sender_name,
        sender_photo: msg.sender_photo,
        text: content,
        participants: conversation.participants,
        read_by: [user.id],
        reply_to_id: msg.reply_to_id,
        reply_to_text: msg.reply_to_text,
        reply_to_sender_name: msg.reply_to_sender_name
      });
      setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...created } : m));
      await base44.entities.ChatConversation.update(id, {
        last_message_text: content,
        last_message_date: new Date().toISOString(),
        last_sender_id: user.id
      });
    } catch (e) {
      setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, _error: true, _temp: false } : m));
    }
  };

  const onFile = async (file, fromCamera) => {
    if (!file || !conversation) return;
    if (file.size > MAX_SIZE) { setError('Arquivo muito grande (máx 100MB)'); return; }
    setError('');
    setUploading(true);
    const fileType = file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : file.type.startsWith('image') ? 'image' : 'document';
    const tempId = `temp-${Date.now()}`;
    const tempUrl = URL.createObjectURL(file);
    const tempMsg = {
      id: tempId,
      _temp: true,
      conversation_id: id,
      sender_id: user.id,
      sender_name: user.display_name || user.full_name || 'Eu',
      sender_photo: user.photo_url || '',
      text: '',
      file_url: tempUrl,
      file_type: fileType,
      participants: conversation.participants,
      read_by: [user.id],
      created_date: new Date().toISOString()
    };
    setMessages((prev) => [...prev, tempMsg]);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const created = await base44.entities.ChatMessage.create({
        conversation_id: id,
        sender_id: user.id,
        sender_name: user.display_name || user.full_name || 'Eu',
        sender_photo: user.photo_url || '',
        text: '',
        file_url,
        file_type: fileType,
        participants: conversation.participants,
        read_by: [user.id]
      });
      setMessages((prev) => prev.map((m) => m.id === tempId ? { ...created } : m));
      URL.revokeObjectURL(tempUrl);
      const label = fileType === 'image' ? '📷 Foto' : fileType === 'video' ? '🎥 Vídeo' : fileType === 'audio' ? '🎤 Áudio' : '📎 Documento';
      await base44.entities.ChatConversation.update(id, {
        last_message_text: label,
        last_message_date: new Date().toISOString(),
        last_sender_id: user.id
      });
      const otherId = conversation.participants.find((p) => p !== user.id);
      if (otherId) await notifyUser({ user_id: otherId, category: 'myriam', title: 'Nova mensagem', body: 'Você recebeu uma mídia', link: `/chat/${id}` });
    } catch (e) {
      setMessages((prev) => prev.map((m) => m.id === tempId ? { ...m, _error: true, _temp: false } : m));
      URL.revokeObjectURL(tempUrl);
    } finally { setUploading(false); }
  };

  const saveEdit = async (msg) => {
    if (!editText.trim()) return;
    try {
      await base44.entities.ChatMessage.update(msg.id, { text: editText.trim(), edited: true, edited_date: new Date().toISOString() });
      setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, text: editText.trim(), edited: true, edited_date: new Date().toISOString() } : m));
      setEditingId(null);
      setEditText('');
    } catch (e) { alert('Erro ao editar.'); }
  };

  const deleteMessage = async (msg) => {
    if (!confirm('Excluir esta mensagem?')) return;
    try {
      await base44.entities.ChatMessage.delete(msg.id);
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    } catch (e) { alert('Erro ao excluir.'); }
  };

  const scrollToMessage = (msgId) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-gold');
      setTimeout(() => el.classList.remove('ring-2', 'ring-gold'), 1500);
    }
  };

  if (!conversation) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>;
  }

  const otherIdx = conversation.participants.indexOf(user.id) === 0 ? 1 : 0;
  const otherName = conversation.participant_names?.[otherIdx] || 'Alma';
  const otherPhoto = conversation.participant_photos?.[otherIdx] || '';
  const otherId = conversation.participants.find((p) => p !== user.id);

  const getReadStatus = (m) => {
    if (m.sender_id !== user.id || m._temp) return null;
    const readByOther = m.read_by?.includes(otherId);
    return readByOther ? 'read' : 'sent';
  };

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 140px)' }}>
      {/* Header */}
      <div className="mb-3 flex items-center gap-3 border-b border-border pb-3">
        <button onClick={() => navigate('/myriam')} className="text-muted-foreground"><ChevronLeft className="h-5 w-5" /></button>
        {otherPhoto ? <img src={otherPhoto} className="h-10 w-10 rounded-full object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-marian/15 text-sm text-marian">{(otherName || 'A')[0]}</div>}
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg leading-tight">{otherName}</p>
          <p className="text-xs text-muted-foreground">{otherTyping ? <span className="text-gold">digitando...</span> : 'online'}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-1.5 overflow-y-auto pb-4">
        {messages.map((m) => {
          const mine = m.sender_id === user.id;
          const readStatus = getReadStatus(m);
          const isEditing = editingId === m.id;
          return (
            <div key={m.id} id={`msg-${m.id}`} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`group max-w-[80%] rounded-2xl px-3 py-2 transition ${mine ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm bg-muted'} ${m._temp ? 'opacity-60' : ''} ${m._error ? 'border-2 border-destructive' : ''}`}
                onContextMenu={(e) => { e.preventDefault(); setMenuMsg(m); }}
              >
                {/* Reply quote */}
                {m.reply_to_id && (
                  <button
                    onClick={() => scrollToMessage(m.reply_to_id)}
                    className={`mb-1.5 w-full rounded-lg border-l-2 px-2 py-1 text-left ${mine ? 'border-gold bg-primary-foreground/10' : 'border-gold bg-primary/10'}`}
                  >
                    <p className="truncate text-[11px] font-medium text-gold">{m.reply_to_sender_name || 'Alma'}</p>
                    <p className={`truncate text-[11px] ${mine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{m.reply_to_text || 'Mensagem'}</p>
                  </button>
                )}

                {/* Text or edit */}
                {isEditing ? (
                  <div className="min-w-[200px]">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={2}
                      autoFocus
                      className={`w-full resize-none rounded-lg border bg-background px-2 py-1.5 text-sm text-foreground outline-none ${mine ? 'border-primary-foreground/30' : 'border-input'}`}
                    />
                    <div className="mt-1 flex gap-2">
                      <button onClick={() => saveEdit(m)} className="inline-flex items-center gap-1 rounded bg-gold px-2 py-0.5 text-[11px] text-deep">
                        <Check className="h-3 w-3" /> Salvar
                      </button>
                      <button onClick={() => { setEditingId(null); setEditText(''); }} className="text-[11px] text-primary-foreground/70">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  m.text && <p className="whitespace-pre-wrap break-words text-sm">{m.text}</p>
                )}

                {/* Media */}
                {m.file_url && m.file_type === 'image' && <img src={m.file_url} className="mt-1 max-h-60 rounded-lg" />}
                {m.file_url && m.file_type === 'video' && <video src={m.file_url} className="mt-1 max-h-60 rounded-lg" controls />}
                {m.file_url && m.file_type === 'audio' && <AudioBubble url={m.file_url} duration={m.audio_duration} mine={mine} />}
                {m.file_url && m.file_type === 'document' && <a href={m.file_url} target="_blank" rel="noreferrer" className={`mt-1 flex items-center gap-2 text-sm underline ${mine ? 'text-primary-foreground' : ''}`}><FileText className="h-4 w-4" /> Documento</a>}

                {/* Footer: edited + read status */}
                {!isEditing && (
                  <div className="mt-0.5 flex items-center justify-end gap-1.5">
                    {m.edited && <span className={`text-[10px] italic ${mine ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>editada</span>}
                    {m._error ? (
                      <button onClick={() => resend(m)} className="text-[10px] text-destructive underline">reenviar</button>
                    ) : readStatus === 'read' ? (
                      <CheckCheck className="h-3.5 w-3.5 text-gold" />
                    ) : readStatus === 'sent' ? (
                      <CheckCheck className="h-3.5 w-3.5 text-primary-foreground/50" />
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {/* Context menu */}
      {menuMsg && (
        <MessageContextMenu
          message={menuMsg}
          isMine={menuMsg.sender_id === user.id}
          onReply={() => setReplyTo(menuMsg)}
          onEdit={() => { setEditingId(menuMsg.id); setEditText(menuMsg.text); }}
          onDelete={() => deleteMessage(menuMsg)}
          onClose={() => setMenuMsg(null)}
        />
      )}

      {error && <p className="mb-2 text-center text-sm text-destructive">{error}</p>}

      {/* Reply bar */}
      <ReplyBar replyTo={replyTo} onClose={() => setReplyTo(null)} />

      {/* Input bar */}
      <div className="flex items-center gap-1.5 border-t border-border pt-3">
        <label className="cursor-pointer text-muted-foreground hover:text-primary">
          <ImagePlus className="h-5 w-5" />
          <input ref={fileRef} type="file" accept="image/*,video/*,audio/*,application/pdf,.doc,.docx" onChange={(e) => onFile(e.target.files?.[0])} className="hidden" />
        </label>
        <label className="cursor-pointer text-muted-foreground hover:text-primary">
          <Camera className="h-5 w-5" />
          <input ref={cameraPhotoRef} type="file" accept="image/*" capture="environment" onChange={(e) => onFile(e.target.files?.[0], true)} className="hidden" />
        </label>
        <AudioRecorder user={user} conversation={conversation} onSent={() => {}} onError={(msg) => setError(msg)} />
        <input
          value={text}
          onChange={onType}
          placeholder="Mensagem..."
          className="flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm outline-none focus:border-primary"
        />
        <button onClick={send} disabled={!text.trim() || uploading} className="rounded-full bg-primary p-2.5 text-primary-foreground disabled:opacity-40">
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}