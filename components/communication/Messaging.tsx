import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useStudio } from './CommunicationProvider';
import { Avatar, formatDate } from './CommunicationParts';
import { EmployeeDialog, EmployeeEmpty, EmployeeIcon, EmployeeSearch } from '@/components/staff/EmployeeUI';
import HelixLoader from '@/components/HelixLoader';
import CustomSelectField from '@/components/staff/CustomSelectField';
import {taskRequest} from '@/lib/tasks/client';
import { archiveConversation, archiveMessage, canDirectMessage, communicationCollections as C, deleteStudioConversation, deleteStudioMessage, markChatRead, openDirectMessage, reactToMessage, sendStudioMessage, setChatBackground, setTyping, watchMessages, watchStudio } from '@/lib/services/communicationService';
import { formatFileSize, getFileMaterialIcon, MAX_FILE_SIZE_BYTES, uploadFileToStorage } from '@/lib/services/fileUploadService';
import { getStaffByUid, getStaffById } from '@/lib/services/staffService';
import type { StaffMember } from '@/types/staff';
import type { ChatBackground, StudioConversation, StudioMessage, StudioMessageAttachment, StudioPerson } from '@/types/communication';
import ImageLightboxModal from '@/components/common/ImageLightboxModal';
import s from './Communication.module.css';

type Reaction = { id: string; uid: string; messageId: string; emoji: string };
type Typing = { id: string; uid: string; name: string; expiresAt: number };
const emojis = ['👍', '❤️', '😂', '🎉', '🙏', '👀'];

const CHAT_THEMES: { value: ChatBackground; name: string; tag: string }[] = [
  { value: 'aurora', name: 'Aurora', tag: 'Flowing light' },
  { value: 'cyber', name: 'Cyber Matrix', tag: 'Circuit nodes' },
  { value: 'neon', name: 'Neon Dusk', tag: 'Synthwave glow' },
  { value: 'grid', name: 'Blueprint', tag: 'Studio grid' },
  { value: 'hex', name: 'Hex Lattice', tag: 'Honeycomb' },
  { value: 'stars', name: 'Cosmic Stars', tag: 'Constellation' },
  { value: 'topo', name: 'Topo Waves', tag: 'Contour flow' },
  { value: 'nebula', name: 'Deep Space', tag: 'Galaxy nebula' },
  { value: 'paper', name: 'Parchment', tag: 'Warm texture' },
  { value: 'calm', name: 'Minimal Calm', tag: 'Pure clean' },
];

const EMOJI_CATEGORIES = [
  {
    id: 'smileys',
    label: 'Smileys',
    icon: 'sentiment_satisfied',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇',
      '🥰', '😍', '🤩', '😘', '😗', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗',
      '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
      '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶',
      '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐'
    ],
  },
  {
    id: 'gestures',
    label: 'Gestures',
    icon: 'front_hand',
    emojis: [
      '👍', '👎', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆',
      '👇', '☝️', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪', '🤳', '👋', '🤚',
      '🖐️', '✋', '🖖', '👀', '👁️', '👂', '👃', '🧠', '🫀', '🫁'
    ],
  },
  {
    id: 'work',
    label: 'Work & Tech',
    icon: 'laptop_mac',
    emojis: [
      '💻', '🖥️', '📱', '⌨️', '🖱️', '🖨️', '📦', '📊', '📈', '📉', '📋', '📁', '📂',
      '📑', '📄', '📜', '📝', '✏️', '📌', '📍', '📎', '🔍', '🔎', '🔒', '🔓', '🔑',
      '⚙️', '🛠️', '🔧', '🔨', '⚡', '💡', '🚀', '🎯', '🏆', '🥇', '🥈', '🥉', '⏱️',
      '⏰', '⏳', '📅', '📆', '💼', '☕', '🏢'
    ],
  },
  {
    id: 'symbols',
    label: 'Symbols',
    icon: 'favorite',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞',
      '💓', '💗', '💖', '💘', '💝', '✨', '⭐', '🌟', '💫', '🔥', '💥', '🎉', '🎊',
      '🎈', '💯', '✅', '✔️', '☑️', '❌', '❎', '⚠️', '🚫', '⛔', '🔔', '🔕', '💬',
      '💭', '💡', '📣', '📢', '🌐', '🚀', '🌈'
    ],
  },
];

export default function Messaging({ onError }: { onError: (e: string) => void }) {
  const state = useStudio(); const router = useRouter(); const base = state.console ? '/admin' : '/staff';
  const chatId = typeof router.query.chat === 'string' ? router.query.chat : '';
  const selected = state.conversations.find(c => c.id === chatId);
  const [search, setSearch] = useState(''); const [showArchived, setShowArchived] = useState(false);
  const [newChat, setNewChat] = useState(false); const [peopleSearch, setPeopleSearch] = useState(''); const [settings, setSettings] = useState(false);
  const [messages, setMessages] = useState<StudioMessage[]>([]); const [loading, setLoading] = useState(false); const [messageLimit, setMessageLimit] = useState(60);
  const [reactions, setReactions] = useState<Reaction[]>([]); const [typing, setTypingUsers] = useState<Typing[]>([]); const [tick, setTick] = useState(Date.now());
  const [archivedMessages, setArchivedMessages] = useState<string[]>([]); const [showArchivedMessages, setShowArchivedMessages] = useState(false);
  const [draft, setDraft] = useState(''); const [reply, setReply] = useState<StudioMessage | null>(null); const [sending, setSending] = useState(false); const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<{ title: string; text: string; run: () => Promise<unknown> } | null>(null);
  const [viewingProfile, setViewingProfile] = useState<StudioPerson | null>(null);
  const [profileStaff, setProfileStaff] = useState<StaffMember | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const openEmployeeProfile = async (targetPerson: StudioPerson) => {
    setViewingProfile(targetPerson);
    setLoadingProfile(true);
    try {
      const data = (await getStaffByUid(targetPerson.uid)) || (await getStaffById(targetPerson.id));
      setProfileStaff(data);
    } catch (err) {
      console.error('Failed to load employee profile:', err);
      setProfileStaff(null);
    } finally {
      setLoadingProfile(false);
    }
  };

  // File attachments, lightbox and emoji picker
  const [composerAttachments, setComposerAttachments] = useState<StudioMessageAttachment[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<StudioMessageAttachment | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeEmojiCat, setActiveEmojiCat] = useState('smileys');
  const [emojiSearch, setEmojiSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const scrollRef = useRef<HTMLDivElement>(null); const composerRef = useRef<HTMLTextAreaElement>(null); const atBottom = useRef(true); const oldHeight = useRef(0); const lastTyping = useRef(0); const swipe = useRef<{ x: number; y: number } | null>(null);
  const supportPerson = state.people.find(p=>p.role==='support' && p.status==='active');
  const isSupportChat = (chat: StudioConversation) => !state.console && chat.kind==='direct' && !!supportPerson && chat.participantIds.includes(supportPerson.uid);
  const openSupport = async () => { if(busy)return;setBusy(true);try{const result=await taskRequest<{chatId:string|null}>('/api/studio/support',{});if(!result.chatId)throw Error('Dev Support is being prepared. Please contact your administrator.');await router.push(`${base}/messages?chat=${result.chatId}`,undefined,{shallow:true,scroll:false});}catch(e){onError(e instanceof Error?e.message:'Support is unavailable.');}finally{setBusy(false);}};
  const titleFor = (chat: StudioConversation) => isSupportChat(chat) ? 'Dev Support' : chat.kind === 'department' ? chat.title : state.people.find(p => chat.participantIds.includes(p.uid) && p.uid !== state.uid)?.name || 'Private conversation';
  const person = selected?.kind === 'direct' ? state.people.find(p => selected.participantIds.includes(p.uid) && p.uid !== state.uid) : undefined;
  const maySend = !!selected && !!state.me && !state.me.chatSuspended && (selected.kind === 'department' || !!person && canDirectMessage(state.me, person));
  const selectedId = selected?.id;

  useEffect(() => {
    setDraft('');
    setReply(null);
    setComposerAttachments([]);
    setShowEmojiPicker(false);
    setMessageLimit(60);
    setMessages([]);
    setReactions([]);
    setArchivedMessages([]);
    setShowArchivedMessages(false);
    atBottom.current = true;
  }, [chatId]);

  useEffect(() => {
    if (!selectedId || !state.me || state.me.chatSuspended) { setMessages([]); return; }
    setLoading(true);
    return watchMessages(selectedId, rows => { setMessages(rows); setLoading(false); }, () => { setLoading(false); setMessages([]); onError('This conversation is no longer available, or your access has changed.'); }, messageLimit);
  }, [selectedId, messageLimit, state.me?.chatSuspended, onError]);

  useEffect(() => {
    if (!selectedId || !state.me || state.me.chatSuspended) return;
    const stopReactions = watchStudio<Reaction>(`${C.chats}/${selectedId}/reactions`, setReactions, () => onError('Message reactions could not be loaded.'));
    const stopTyping = watchStudio<Typing>(`${C.chats}/${selectedId}/typing`, setTypingUsers, () => setTypingUsers([]));
    const stopArchives = watchStudio<{ id: string; messageId: string; archived: boolean }>(query(collection(db, C.users, state.uid, 'archived_messages'), where('chatId', '==', selectedId)), rows => setArchivedMessages(rows.filter(r => r.archived).map(r => r.messageId)), () => onError('Your archived messages could not be loaded.'));
    const interval = setInterval(() => setTick(Date.now()), 1500);
    return () => { stopReactions(); stopTyping(); stopArchives(); clearInterval(interval); void setTyping(selectedId, state.me!, false).catch(() => {}); };
  }, [selectedId, state.uid, state.me?.chatSuspended, onError]);

  useEffect(() => {
    if (!showEmojiPicker) return;
    const handleOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowEmojiPicker(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [showEmojiPicker]);

  const filteredEmojis = useMemo(() => {
    const q = emojiSearch.trim().toLowerCase();
    if (!q) {
      const cat = EMOJI_CATEGORIES.find(c => c.id === activeEmojiCat) || EMOJI_CATEGORIES[0];
      return cat.emojis;
    }
    return EMOJI_CATEGORIES.flatMap(c => c.emojis);
  }, [activeEmojiCat, emojiSearch]);

  const insertEmoji = (emoji: string) => {
    const el = composerRef.current;
    if (!el) {
      setDraft(prev => prev + emoji);
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const next = el.value.slice(0, start) + emoji + el.value.slice(end);
    setDraft(next);
    setTimeout(() => {
      el.focus();
      const newPos = start + emoji.length;
      el.setSelectionRange(newPos, newPos);
    }, 10);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = '';

    if (composerAttachments.length + files.length > 5) {
      onError('You can attach up to 5 files at a time.');
      return;
    }

    for (const f of files) {
      if (f.size > MAX_FILE_SIZE_BYTES) {
        onError(`"${f.name}" is ${formatFileSize(f.size)}, which exceeds the 10 MB limit.`);
        return;
      }
    }

    setUploadingFiles(true);
    try {
      const targetFolder = chatId ? `chat-attachments/${chatId}` : 'chat-attachments/general';
      const uploadedList: StudioMessageAttachment[] = [];
      for (const f of files) {
        const att = await uploadFileToStorage(f, targetFolder);
        uploadedList.push(att);
      }
      setComposerAttachments(prev => [...prev, ...uploadedList]);
    } catch (err) {
      console.error('Failed to upload attachment:', err);
      onError(err instanceof Error ? err.message : 'Failed to upload attachment. Please try again.');
    } finally {
      setUploadingFiles(false);
    }
  };

  const removeAttachment = (index: number) => {
    setComposerAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const lastMessageId = messages[messages.length - 1]?.id;
  const lastMessageAt = messages[messages.length - 1]?.createdAt;
  useLayoutEffect(() => {
    const scroll = scrollRef.current; if (!scroll) return;
    if (oldHeight.current) { scroll.scrollTop += scroll.scrollHeight - oldHeight.current; oldHeight.current = 0; }
    else if (atBottom.current || messages[messages.length - 1]?.senderId === state.uid) scroll.scrollTop = scroll.scrollHeight;
  }, [messages, state.uid]);
  useEffect(() => {
    if (!selectedId || !lastMessageId || !state.uid) return;
    const read = () => { if (document.visibilityState === 'visible') void markChatRead(state.uid, selectedId, lastMessageAt!).catch(() => onError('Your read status could not be saved.')); };
    read(); document.addEventListener('visibilitychange', read); return () => document.removeEventListener('visibilitychange', read);
  }, [selectedId, lastMessageId, lastMessageAt, state.uid, onError]);
  useEffect(() => {
    if (!selectedId || !state.me || !maySend) return;
    const now = Date.now();
    if (draft.trim() && now - lastTyping.current > 2000) { lastTyping.current = now; void setTyping(selectedId, state.me, true).catch(() => {}); }
    const timer = setTimeout(() => { void setTyping(selectedId, state.me!, false).catch(() => {}); }, draft ? 4500 : 0);
    return () => clearTimeout(timer);
  }, [draft, selectedId, maySend]);
  const run = async (action: () => Promise<unknown>) => { setBusy(true); try { await action(); } catch (e) { onError(e instanceof Error ? e.message : 'The change could not be saved.'); } finally { setBusy(false); } };
  const chooseChat = (id: string) => { void router.push({ pathname: `${base}/messages`, query: { chat: id } }, undefined, { shallow: true, scroll: false }); };
  const beginChat = (target: StudioPerson) => { if (!state.me) return; void run(async () => { const id = await openDirectMessage(state.me!, target); setNewChat(false); chooseChat(id); }); };
  const send = async () => {
    if (!maySend || !state.me || sending || uploadingFiles || (!draft.trim() && composerAttachments.length === 0)) return;
    setSending(true); const sentText = draft; const sentReply = reply;
    const sentAtts = composerAttachments.length > 0 ? [...composerAttachments] : undefined;
    try {
      await sendStudioMessage(chatId, state.me, sentText, sentReply, sentAtts);
      setDraft('');
      setReply(null);
      setComposerAttachments([]);
      setShowEmojiPicker(false);
      atBottom.current = true;
      void setTyping(chatId, state.me, false).catch(() => {});
      if (composerRef.current) composerRef.current.style.height = '36px';
      composerRef.current?.focus();
    }
    catch (e) { onError(e instanceof Error ? e.message : 'Message could not be sent. Your draft is preserved.'); } finally { setSending(false); }
  };
  const replyTo = (message: StudioMessage) => { setReply(message); composerRef.current?.focus({ preventScroll: true }); };
  const typingNames = typing.filter(t => t.uid !== state.uid && t.expiresAt > tick).map(t => t.name);
  const visibleChats = state.conversations.filter(c => (isSupportChat(c) ? !showArchived : !!state.chatStates[c.id]?.archived === showArchived) && titleFor(c).toLowerCase().includes(search.toLowerCase())).sort((a,b)=>Number(isSupportChat(b))-Number(isSupportChat(a)));
  const availablePeople = state.people.filter(p => canDirectMessage(state.me, p) && p.name.toLowerCase().includes(peopleSearch.toLowerCase()));
  if (state.me?.chatSuspended) return <EmployeeEmpty icon="speaker_notes_off" title="Messaging is paused." description="Your administrator has paused your chat access. Other workspace features remain available." />;
  return <><div className={s.messaging} data-chat-open={!!chatId || undefined}>
    <div className={s.chatSidebar}><div className={s.chatSidebarHeading}><div><p className={s.eyebrow}>YOUR CONVERSATIONS</p><h2>A little closer.</h2></div><button className={s.iconButton} title="New message" aria-label="Start a new conversation" disabled={!state.me} onClick={() => setNewChat(true)}><EmployeeIcon>edit_square</EmployeeIcon></button></div><EmployeeSearch value={search} onChange={setSearch} label="Search conversations" placeholder="Find a conversation…" /><div className={s.segment}><button aria-pressed={!showArchived} onClick={() => setShowArchived(false)}>Inbox</button><button aria-pressed={showArchived} onClick={() => setShowArchived(true)}>Archived</button></div><div className={s.chatList}>{!state.console && !showArchived && !state.conversations.some(isSupportChat) && (!search || "dev support".includes(search.toLowerCase())) && <button className={s.chatListItem} disabled={busy} onClick={()=>void openSupport()}><Avatar name="Dev Support" url="/dev_url_logo.png"/><span><strong>Dev Support <span className="material-symbols-outlined" aria-label="Pinned" style={{fontSize:16}}>push_pin</span></strong><small>Contact your support team privately.</small></span></button>}{visibleChats.map(chat => { const other = state.people.find(p => chat.participantIds.includes(p.uid) && p.uid !== state.uid); const unread = chat.lastSenderId !== state.uid && !!chat.lastMessageAt && chat.lastMessageAt > (state.chatStates[chat.id]?.lastReadAt || ''); return <button key={chat.id} className={s.chatListItem} data-selected={chat.id === chatId || undefined} onClick={() => chooseChat(chat.id)}><Avatar name={titleFor(chat)} url={chat.kind === 'department' ? chat.avatarUrl : other?.avatarUrl} /><span><strong>{titleFor(chat)}{isSupportChat(chat) && <span aria-label="Pinned support conversation"> · Pinned</span>}</strong><small>{chat.lastMessage || (chat.kind === 'department' ? 'Your department channel' : 'Say hello and start a conversation.')}</small>{chat.lastMessageAt && <time>{formatDate(chat.lastMessageAt)}</time>}</span>{unread && <span className={s.unreadDot} aria-label="Unread conversation" />}</button>; })}{!visibleChats.length && <div className={s.listEmpty}><EmployeeIcon>{showArchived ? 'inventory_2' : 'forum'}</EmployeeIcon><p>{showArchived ? 'Archived conversations live here.' : 'Start a conversation with admin or a teammate.'}</p>{!showArchived && <button className={s.button} onClick={() => setNewChat(true)}>New message</button>}</div>}</div><Link className={s.sidebarFooter} href={`${base}/departments`}><EmployeeIcon>hub</EmployeeIcon>{state.admin ? 'Manage departments & groups' : 'Explore your departments'}<span>↗</span></Link></div>
    <div className={s.chatMain}>{selected ? <><div className={s.chatTopbar}><button className={`${s.iconButton} ${s.mobileBack}`} onClick={() => void router.push(`${base}/messages`, undefined, { shallow: true, scroll: false })} aria-label="Back to conversations"><EmployeeIcon>arrow_back</EmployeeIcon></button><Avatar name={titleFor(selected)} url={selected.kind === 'department' ? selected.avatarUrl : person?.avatarUrl} /><div className={s.chatIdentity}><h2>{titleFor(selected)}</h2><p>{selected.kind === 'department' ? selected.description || `${selected.participantIds.length} people · Department chat` : person?.role === 'support' ? 'Dev Support · Employee assistance' : person?.role === 'admin' ? 'DevEngine administration' : 'Private conversation'}</p></div><div className={s.chatTopbarActions}>{state.admin && person && <button type="button" className={s.viewProfileBtn} onClick={() => void openEmployeeProfile(person)} title={`View ${person.name}'s profile`} aria-label={`View ${person.name}'s profile`}><EmployeeIcon>badge</EmployeeIcon><span className={s.viewProfileText}>View profile</span></button>}<button className={s.iconButton} aria-label="Conversation settings" title="Conversation settings" onClick={() => setSettings(true)}><EmployeeIcon>settings</EmployeeIcon></button></div></div>
      <div className={s.messageArea} data-background={state.background} ref={scrollRef} onScroll={e => { const el = e.currentTarget; atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100; }}>
        <div className={s.messageCanvas}>{messages.length >= messageLimit && <button className={s.loadMore} disabled={loading} onClick={() => { oldHeight.current = scrollRef.current?.scrollHeight || 0; setMessageLimit(count => count + 60); }}>{loading ? 'Loading…' : 'Load earlier messages'}</button>}{!messages.length && <div className={s.conversationStart}><EmployeeIcon>forum</EmployeeIcon><h3>{loading ? 'Opening conversation…' : 'Good work starts with a hello.'}</h3><p>Reply, react, and keep your team in the loop.</p></div>}
          {messages.filter(m => showArchivedMessages || !archivedMessages.includes(m.id)).map((message, index, list) => {
            const own = message.senderId === state.uid;
            const mine = reactions.find(r => r.messageId === message.id && r.uid === state.uid)?.emoji;
            const reactionCounts = emojis.map(emoji => ({ emoji, count: reactions.filter(r => r.messageId === message.id && r.emoji === emoji).length })).filter(r => r.count);
            const day = new Date(message.createdAt).toLocaleDateString();
            const isGroup = selected.kind === 'department' || selected.participantIds.length > 2;
            const showSender = !own && isGroup;
            const isArchived = archivedMessages.includes(message.id);
            const senderPerson = state.people.find(p => p.uid === message.senderId);
            const senderAvatar = senderPerson?.avatarUrl || (selected.kind === 'direct' && !own ? person?.avatarUrl : undefined);
            const senderName = message.senderName || senderPerson?.name || (selected.kind === 'direct' && !own ? titleFor(selected) : 'Teammate');
            return <div key={message.id}>{(index === 0 || new Date(list[index - 1].createdAt).toLocaleDateString() !== day) && <div className={s.dayDivider}><span>{day}</span></div>}<div className={s.messageRow} data-own={own || undefined} data-archived={isArchived || undefined}>{!own && <div className={s.messageSenderAvatar} title={senderName}><Avatar name={senderName} url={senderAvatar} /></div>}<article className={s.messageBubble} tabIndex={0} onTouchStart={e => { swipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }} onTouchEnd={e => { const start = swipe.current; swipe.current = null; if (start && maySend && Math.abs(e.changedTouches[0].clientX - start.x) > 60 && Math.abs(e.changedTouches[0].clientY - start.y) < 40) replyTo(message); }}>{(showSender || isArchived) && <div className={s.messageSender}>{showSender ? <span>{message.senderName}</span> : <span />}{isArchived && <small>Archived for you</small>}</div>}{message.replyTo && <button className={s.quotedMessage} onClick={() => { const target = document.getElementById(`studio-message-${message.replyTo}`); if (target) target.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }}><strong>{message.replyName}</strong><span>{message.replyText}</span></button>}<div className={s.messageContent}>{message.text && <p id={`studio-message-${message.id}`} className={s.messageText}>{message.text}</p>}{message.attachments && message.attachments.length > 0 && <div className={s.bubbleAttachments}>{message.attachments.map((att, attIdx) => { const isImg = att.type?.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(att.name); return isImg ? <button key={attIdx} type="button" onClick={e => { e.stopPropagation(); setLightboxImage(att); }} className={s.bubbleImageAttachment} title={`View ${att.name} full screen`}><img src={att.url} alt={att.name} loading="lazy" /><span className={s.imageHoverBadge}><EmployeeIcon>zoom_in</EmployeeIcon><span>{formatFileSize(att.size)}</span></span></button> : <a key={attIdx} href={att.url} target="_blank" rel="noopener noreferrer" download={att.name} className={s.bubbleFileAttachment} title={`${att.name} (${formatFileSize(att.size)})`}><span className={s.bubbleFileIcon}><EmployeeIcon>{getFileMaterialIcon(att.name || att.type)}</EmployeeIcon></span><span className={s.bubbleFileInfo}><strong>{att.name}</strong><small>{formatFileSize(att.size)}</small></span><span className={s.bubbleFileDownload}><EmployeeIcon>download</EmployeeIcon></span></a>; })}</div>}<div className={s.messageMeta}><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>{own && <EmployeeIcon>done</EmployeeIcon>}</div></div>{reactionCounts.length > 0 && <div className={s.reactionCounts}>{reactionCounts.map(r => <button disabled={!maySend} key={r.emoji} aria-pressed={mine === r.emoji} onClick={() => void run(() => reactToMessage(chatId, message.id, r.emoji, mine))}>{r.emoji} {r.count}</button>)}</div>}<div className={s.messageActions}>{maySend && <button title="Reply to message" aria-label={`Reply to ${message.senderName}`} onClick={() => replyTo(message)}><EmployeeIcon>reply</EmployeeIcon></button>}<details><summary aria-label="Message options"><EmployeeIcon>more_horiz</EmployeeIcon></summary><div className={s.messageMenu}>{maySend && <div className={s.emojiPicker}>{emojis.map(emoji => <button key={emoji} aria-label={`React ${emoji}`} aria-pressed={mine === emoji} onClick={e => { const detail = e.currentTarget.closest('details'); void run(() => reactToMessage(chatId, message.id, emoji, mine)); detail?.removeAttribute('open'); }}>{emoji}</button>)}</div>}<button onClick={() => void run(() => archiveMessage(state.uid, chatId, message.id, !archivedMessages.includes(message.id)))}><EmployeeIcon>archive</EmployeeIcon>{archivedMessages.includes(message.id) ? 'Restore message' : 'Archive for me'}</button>{state.admin && <button onClick={() => setConfirmation({ title: 'Delete this message?', text: 'This removes the message for every participant.', run: () => deleteStudioMessage(chatId, message.id) })}><EmployeeIcon>delete</EmployeeIcon>Delete for everyone</button>}</div></details></div></article></div></div>;
          })}
        </div>
      </div>
      <div className={s.typingStatus} role="status">{typingNames.length > 0 && <><span className={s.typingDots}><i /><i /><i /></span><span>{typingNames.slice(0, 2).join(', ')} {typingNames.length === 1 ? 'is' : 'are'} typing…</span></>}</div>
      <form className={s.composer} onSubmit={e => { e.preventDefault(); void send(); }}>
        {reply && <div className={s.replyPreview}><EmployeeIcon>reply</EmployeeIcon><div><strong>Replying to {reply.senderName}</strong><p>{reply.text.slice(0, 180)}</p></div><button type="button" className={s.iconButton} aria-label="Cancel reply" onClick={() => setReply(null)}><EmployeeIcon>close</EmployeeIcon></button></div>}
        {composerAttachments.length > 0 && <div className={s.composerAttachmentTray}>{composerAttachments.map((att, idx) => { const isImg = att.type?.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(att.name); return <div key={idx} className={s.composerAttachmentChip}>{isImg ? <img src={att.url} alt={att.name} className={s.composerThumb} /> : <span className={s.composerChipIcon}><EmployeeIcon>{getFileMaterialIcon(att.name || att.type)}</EmployeeIcon></span>}<span className={s.composerChipText}><strong>{att.name}</strong><small>{formatFileSize(att.size)}</small></span><button type="button" className={s.removeAttachmentBtn} onClick={() => removeAttachment(idx)} aria-label={`Remove ${att.name}`}><EmployeeIcon>close</EmployeeIcon></button></div>; })}</div>}
        {uploadingFiles && <div className={s.composerUploadingStatus}><HelixLoader size={16} color="#2cecf7" /><span>Uploading file(s) (up to 10 MB)...</span></div>}
        {!maySend && <p className={s.alert}>Messaging is unavailable for this conversation. Department membership or chat access may have changed.</p>}
        <div style={{ position: 'relative' }}>
          {showEmojiPicker && <div className={s.emojiPopover} ref={emojiPickerRef}>
            <div className={s.emojiHeader}>
              <div className={s.emojiTabs}>
                {EMOJI_CATEGORIES.map(cat => <button key={cat.id} type="button" className={s.emojiTab} data-active={activeEmojiCat === cat.id ? 'true' : undefined} onClick={() => { setActiveEmojiCat(cat.id); setEmojiSearch(''); }} title={cat.label}><EmployeeIcon>{cat.icon}</EmployeeIcon><span>{cat.label}</span></button>)}
              </div>
              <button type="button" className={s.emojiCloseBtn} onClick={() => setShowEmojiPicker(false)} aria-label="Close emoji picker"><EmployeeIcon>close</EmployeeIcon></button>
            </div>
            <div className={s.emojiSearchRow}>
              <EmployeeIcon>search</EmployeeIcon>
              <input type="text" placeholder="Search emojis…" value={emojiSearch} onChange={e => setEmojiSearch(e.target.value)} className={s.emojiSearchInput} />
              {emojiSearch && <button type="button" className={s.emojiCloseBtn} onClick={() => setEmojiSearch('')}><EmployeeIcon>close</EmployeeIcon></button>}
            </div>
            <div className={s.emojiGrid}>
              {filteredEmojis.map((emoji, idx) => <button key={idx} type="button" className={s.emojiCell} onClick={() => insertEmoji(emoji)}>{emoji}</button>)}
            </div>
          </div>}
          <div className={s.composerInput}>
            <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleFileSelect} disabled={!maySend || sending || uploadingFiles} />
            <div className={s.composerToolsLeft}>
              <button type="button" className={s.composerToolButton} title="Attach files (up to 10 MB, max 5)" aria-label="Attach files" disabled={!maySend || sending || uploadingFiles || composerAttachments.length >= 5} onClick={() => fileInputRef.current?.click()}><EmployeeIcon>attach_file</EmployeeIcon></button>
              <button type="button" className={`${s.composerToolButton} ${showEmojiPicker ? s.activeTool : ''}`} title="Insert emoji" aria-label="Insert emoji" data-active={showEmojiPicker ? 'true' : undefined} disabled={!maySend || sending} onClick={() => setShowEmojiPicker(prev => !prev)}><EmployeeIcon>sentiment_satisfied</EmployeeIcon></button>
            </div>
            <textarea ref={composerRef} className="transparent-input" aria-label="Your message" placeholder={reply ? 'Write your reply…' : 'Write a message or attach files…'} rows={1} maxLength={4000} value={draft} disabled={!maySend || sending} style={{ border: 'none', borderColor: 'transparent', outline: 'none', outlineColor: 'transparent', background: 'transparent', backgroundColor: 'transparent', boxShadow: 'none' }} onChange={e => { setDraft(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${Math.min(Math.max(e.target.scrollHeight, 36), 140)}px`; }} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia('(pointer: fine)').matches) { e.preventDefault(); void send(); } }} />
            <button className={s.sendButton} type="submit" disabled={!maySend || sending || uploadingFiles || (!draft.trim() && composerAttachments.length === 0)} aria-label={sending ? 'Sending message' : 'Send message'}><EmployeeIcon>{sending ? 'hourglass_top' : 'arrow_upward'}</EmployeeIcon></button>
          </div>
        </div>
        <div className={s.composerHint}><span>Attach files up to 10 MB · Emojis supported · Enter to send</span><span>{draft.length}/4000</span></div>
      </form>
    </> : <div className={s.chatWelcome}>{chatId && <button className={s.button} onClick={() => void router.push(`${base}/messages`, undefined, { shallow: true })}><EmployeeIcon>arrow_back</EmployeeIcon>Back to inbox</button>}<EmployeeEmpty icon="forum" title={chatId ? 'Opening your conversation…' : 'Connected. By conversation.'} description={chatId ? 'If this chat does not open, your membership may have changed. Choose a conversation from your inbox.' : 'Message admin, connect with your team, and find your department channels here.'}><button className={s.primary} disabled={!state.me} onClick={() => setNewChat(true)}>Start a conversation<EmployeeIcon>arrow_forward</EmployeeIcon></button></EmployeeEmpty></div>}</div>
  </div>
  {newChat && <EmployeeDialog title="Start a conversation" description={state.admin ? 'Choose any active employee to send a private message.' : 'Message administration or colleagues who share a department with you.'} icon="chat_bubble" onClose={() => !busy && setNewChat(false)}><EmployeeSearch value={peopleSearch} onChange={setPeopleSearch} label="Find a colleague" placeholder="Search by name…" /><div className={s.peopleList}>{availablePeople.map(p => <button key={p.uid} className={s.personRow} disabled={busy} onClick={() => beginChat(p)}><Avatar name={p.name} url={p.avatarUrl} /><span className={s.personInfo}><strong>{p.name}</strong><small>{p.role === 'support' ? 'Dev Support' : p.role === 'admin' ? 'Administration' : 'Your teammate'}</small></span><EmployeeIcon>arrow_outward</EmployeeIcon></button>)}{!availablePeople.length && <p className={s.muted}>No available people found. Your administrator can add department memberships.</p>}</div><Link href={`${base}/departments`} className={s.sidebarFooter}>{state.admin ? 'Create or edit a department group' : 'Explore departments'}<span>↗</span></Link></EmployeeDialog>}
  {settings && selected && (
    <EmployeeDialog title="Conversation settings" icon="settings" onClose={() => setSettings(false)}>
      <div className={s.form}>
        <div className={s.themeSection}>
          <div className={s.themeSectionLabel}>
            <span>Your chat background</span>
            <span className={s.themeActiveName}>
              {CHAT_THEMES.find(t => t.value === state.background)?.name || 'Default'}
            </span>
          </div>

          <div className={s.themeGrid} role="radiogroup" aria-label="Select chat background theme">
            {CHAT_THEMES.map(theme => {
              const isSelected = state.background === theme.value;
              return (
                <button
                  key={theme.value}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  data-selected={isSelected ? "true" : undefined}
                  className={s.themeCard}
                  onClick={() => void run(() => setChatBackground(state.uid, theme.value))}
                  title={`${theme.name} · ${theme.tag}`}
                >
                  <div className={s.themePreview} data-background={theme.value}>
                    <div className={s.miniBubbleRowLeft}>
                      <span className={s.miniBubbleOther} />
                    </div>
                    <div className={s.miniBubbleRowRight}>
                      <span className={s.miniBubbleOwn} />
                    </div>
                    {isSelected && (
                      <span className={s.themeCheckBadge} aria-hidden="true">✓</span>
                    )}
                  </div>
                  <span className={s.themeName}>{theme.name}</span>
                  <span className={s.themeSubtext}>{theme.tag}</span>
                </button>
              );
            })}
          </div>
        </div>

        <p className={s.muted}>
          Your background applies to all your conversations. It adapts to your light or dark theme.
        </p>

        <label className={s.checkRow}>
          <input
            type="checkbox"
            checked={showArchivedMessages}
            onChange={e => setShowArchivedMessages(e.target.checked)}
          />
          Show messages you archived
        </label>

        <button
          className={s.button}
          disabled={busy}
          onClick={() => void run(async () => {
            if(isSupportChat(selected))throw Error('Dev Support stays pinned in your inbox.');
            await archiveConversation(state.uid, selected.id, !state.chatStates[selected.id]?.archived);
            setSettings(false);
          })}
        >
          <EmployeeIcon>archive</EmployeeIcon>
          {state.chatStates[selected.id]?.archived ? 'Restore conversation to inbox' : 'Archive conversation for me'}
        </button>

        {state.admin && selected.kind === 'department' && (
          <Link className={s.button} href={`${base}/departments`}>
            <EmployeeIcon>edit</EmployeeIcon>
            Edit group title, subtitle, picture & members
          </Link>
        )}

        {state.admin && (
          <button
            className={s.button}
            onClick={() => {
              setSettings(false);
              setConfirmation({
                title: 'Delete this conversation?',
                text: 'Every participant will lose access to this conversation. A department group can be restored by saving that department again.',
                run: async () => {
                  await deleteStudioConversation(selected.id);
                  await router.push(`${base}/messages`);
                }
              });
            }}
          >
            <EmployeeIcon>delete</EmployeeIcon>
            Delete conversation for everyone
          </button>
        )}
      </div>
    </EmployeeDialog>
  )}
  {confirmation && <EmployeeDialog title={confirmation.title} description={confirmation.text} icon="delete" onClose={() => !busy && setConfirmation(null)}><div className={s.cardActions}><button className={s.button} disabled={busy} onClick={() => setConfirmation(null)}>Cancel</button><button className={s.primary} disabled={busy} onClick={() => void run(async () => { await confirmation.run(); setConfirmation(null); })}>{busy ? 'Deleting…' : 'Delete'}</button></div></EmployeeDialog>}
  {viewingProfile && (
    <EmployeeDialog
      title={`${viewingProfile.name}'s Profile`}
      icon="badge"
      onClose={() => { setViewingProfile(null); setProfileStaff(null); }}
    >
      <div className={s.profileModal}>
        {loadingProfile ? (
          <div className={s.profileLoading}>
            <HelixLoader />
          </div>
        ) : (
          <>
            <div className={s.profileHeaderCard}>
              <Avatar name={viewingProfile.name} url={profileStaff?.avatarUrl || viewingProfile.avatarUrl} />
              <div className={s.profileHeaderInfo}>
                <h3>{profileStaff?.name || viewingProfile.name}</h3>
                <p className={s.profileEmail}>{profileStaff?.email || 'Employee account'}</p>
                <div className={s.profileBadges}>
                  <span className={s.badgeRole}>
                    <EmployeeIcon>badge</EmployeeIcon>
                    {profileStaff?.designation || profileStaff?.staffType || viewingProfile.role}
                  </span>
                  <span
                    className={s.badgeStatus}
                    data-status={profileStaff?.status || viewingProfile.status || 'active'}
                  >
                    {(profileStaff?.status || viewingProfile.status || 'active').toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            <div className={s.profileGrid}>
              <div className={s.profileItem}>
                <span className={s.profileLabel}>Employment Type</span>
                <span className={s.profileValue}>{profileStaff?.employmentType ? (profileStaff.employmentType.charAt(0).toUpperCase() + profileStaff.employmentType.slice(1)) : 'Permanent'}</span>
              </div>
              <div className={s.profileItem}>
                <span className={s.profileLabel}>Joining Date</span>
                <span className={s.profileValue}>{profileStaff?.joiningDate || 'Recorded on file'}</span>
              </div>
              <div className={s.profileItem}>
                <span className={s.profileLabel}>Shift Schedule</span>
                <span className={s.profileValue}>
                  {typeof profileStaff?.shiftHours === 'object' && profileStaff.shiftHours !== null
                    ? `${profileStaff.shiftHours.name ? profileStaff.shiftHours.name + ' · ' : ''}${profileStaff.shiftHours.start || ''} - ${profileStaff.shiftHours.end || ''}`
                    : typeof profileStaff?.shiftHours === 'string' && profileStaff.shiftHours
                    ? profileStaff.shiftHours
                    : 'Standard Studio Hours'}
                </span>
              </div>
              <div className={s.profileItem}>
                <span className={s.profileLabel}>Assigned Off-Days</span>
                <span className={s.profileValue}>{profileStaff?.assignedOffDays?.join(', ') || 'Friday, Saturday'}</span>
              </div>
              {profileStaff?.phone && (
                <div className={s.profileItem}>
                  <span className={s.profileLabel}>Phone</span>
                  <span className={s.profileValue}>{profileStaff.phone}</span>
                </div>
              )}
              {profileStaff?.emergencyContact?.name && (
                <div className={s.profileItem}>
                  <span className={s.profileLabel}>Emergency Contact</span>
                  <span className={s.profileValue}>{profileStaff.emergencyContact.name} ({profileStaff.emergencyContact.relationship || 'Contact'}) · {profileStaff.emergencyContact.phone}</span>
                </div>
              )}
              <div className={s.profileItem} style={{ gridColumn: '1 / -1' }}>
                <span className={s.profileLabel}>Allowed Studio Modules</span>
                <div className={s.profileModuleTags}>
                  {(profileStaff?.allowedModules?.length ? profileStaff.allowedModules : ['overview', 'messages']).map(mod => (
                    <span key={mod} className={s.profileModuleTag}>{mod}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className={s.cardActions} style={{ marginTop: 20 }}>
              <Link
                href={`/admin/manage-staff?employeeId=${profileStaff?.id || viewingProfile.id || viewingProfile.uid}`}
                className={s.primary}
                onClick={() => { setViewingProfile(null); setProfileStaff(null); }}
              >
                <EmployeeIcon>open_in_new</EmployeeIcon>
                Open in Employee Management
              </Link>
              <button
                type="button"
                className={s.button}
                onClick={() => { setViewingProfile(null); setProfileStaff(null); }}
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </EmployeeDialog>
  )}
  <ImageLightboxModal
    src={lightboxImage?.url || null}
    name={lightboxImage?.name}
    size={lightboxImage?.size}
    onClose={() => setLightboxImage(null)}
  />
  </>;
}
