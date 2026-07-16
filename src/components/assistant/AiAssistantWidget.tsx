'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { clampMascotPosition, DEFAULT_MASCOT_POSITION, isMascotSuppressed, loadMascotPosition, saveMascotPosition, type MascotPosition } from '@/components/mascot/furina-mascot';
import { GUEST_ASSISTANT_STORAGE_KEY, parseLocalAssistantConversation, serializeLocalAssistantConversation, type LocalAssistantMessage } from './assistant-storage';
import styles from './AiAssistantWidget.module.css';

const POSES = ['pose-01.png', 'pose-02.png', 'pose-03.png', 'pose-04.png', 'pose-05.png', 'pose-06.png'];
const POSITION_KEY = 'movieflex-ai-assistant-position';
const DESKTOP_SIZE = { width: 156, height: 204 };
const MOBILE_SIZE = { width: 118, height: 154 };
const MAX_IMAGE_SIZE = 3 * 1024 * 1024;

type UiMessage = LocalAssistantMessage & { imageDataUrl?: string };
type ConversationSummary = { id: number; title: string; updatedAt: string; lastMessage: string };

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('图片读取失败'));
    reader.readAsDataURL(file);
  });
}

export default function AiAssistantWidget() {
  const pathname = usePathname();
  const [position, setPosition] = useState<MascotPosition | null>(null);
  const [pose, setPose] = useState(0);
  const [open, setOpen] = useState(false);
  const [focusedEditable, setFocusedEditable] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState('');
  const [image, setImage] = useState<{ dataUrl: string; fileName: string; mimeType: string; size: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [thinking, setThinking] = useState<string | null>(null);
  const pressedAt = useRef<number | null>(null);
  const dragging = useRef(false);
  const dragOffset = useRef<MascotPosition>({ x: 0, y: 0 });
  const pressTimer = useRef<number | null>(null);

  const mascotSize = () => window.innerWidth <= 680 ? MOBILE_SIZE : DESKTOP_SIZE;
  const defaultPosition = () => {
    const size = mascotSize();
    return { x: window.innerWidth - size.width - 18, y: window.innerHeight - size.height - 18 };
  };
  const bounded = (next: MascotPosition) => clampMascotPosition(next, { width: window.innerWidth, height: window.innerHeight }, mascotSize());
  const suppressed = !open && isMascotSuppressed(pathname, focusedEditable);

  const loadConversations = useCallback(async () => {
    const session = await fetch('/api/auth/session').then((response) => response.json()).catch(() => null);
    const loggedIn = Boolean(session?.user?.id);
    setIsLoggedIn(loggedIn);
    if (!loggedIn) {
      const stored = parseLocalAssistantConversation(window.localStorage.getItem(GUEST_ASSISTANT_STORAGE_KEY));
      setMessages(stored.messages);
      return;
    }
    const data = await fetch('/api/assistant/conversations').then((response) => response.json()).catch(() => null);
    const list = Array.isArray(data?.data) ? data.data : [];
    setConversations(list);
    setConversationId((current) => current ?? list[0]?.id ?? null);
  }, []);

  useEffect(() => {
    const stored = loadMascotPosition(() => window.localStorage.getItem(POSITION_KEY));
    setPosition(stored === DEFAULT_MASCOT_POSITION ? defaultPosition() : bounded(stored));
    const handleResize = () => setPosition((current) => (current ? bounded(current) : current));
    window.addEventListener('resize', handleResize);
    void loadConversations();
    return () => window.removeEventListener('resize', handleResize);
  }, [loadConversations]);

  useEffect(() => {
    const updateFocusedElement = () => {
      const active = document.activeElement;
      setFocusedEditable(active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement || (active instanceof HTMLElement && active.isContentEditable));
    };
    document.addEventListener('focusin', updateFocusedElement);
    document.addEventListener('focusout', updateFocusedElement);
    updateFocusedElement();
    return () => {
      document.removeEventListener('focusin', updateFocusedElement);
      document.removeEventListener('focusout', updateFocusedElement);
      if (pressTimer.current) window.clearTimeout(pressTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    if (!conversationId) {
      setMessages([]);
      return;
    }
    fetch(`/api/assistant/conversations/${conversationId}`).then((response) => response.json()).then((data) => {
      setMessages(Array.isArray(data?.data) ? data.data : []);
    }).catch(() => setMessages([]));
  }, [conversationId, isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) window.localStorage.setItem(GUEST_ASSISTANT_STORAGE_KEY, serializeLocalAssistantConversation(messages));
  }, [isLoggedIn, messages]);

  if (suppressed || imageFailed || !position) return null;

  const cleanupPointer = () => {
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    dragging.current = false;
    pressedAt.current = null;
  };

  const release = () => {
    const wasDragging = dragging.current;
    cleanupPointer();
    if (wasDragging && position) saveMascotPosition((value) => window.localStorage.setItem(POSITION_KEY, value), position);
    if (!wasDragging) {
      setPose((current) => (current + 1) % POSES.length);
      setOpen(true);
    }
  };

  const createNewConversation = async () => {
    if (!isLoggedIn) {
      setMessages([]);
      return;
    }
    const data = await fetch('/api/assistant/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: '新的 AI 对话' }) }).then((response) => response.json());
    if (data?.data?.conversationId) {
      setConversationId(data.data.conversationId);
      setConversations((current) => [{ id: data.data.conversationId, title: '新的 AI 对话', updatedAt: new Date().toISOString(), lastMessage: '' }, ...current]);
    }
  };

  const send = async () => {
    const content = input.trim();
    if ((!content && !image) || loading) return;

    const userMessage: UiMessage = { role: 'user', content, hasImage: Boolean(image), imageFileName: image?.fileName, imageMimeType: image?.mimeType, imageSize: image?.size, imageDataUrl: image?.dataUrl };
    const nextMessages = [...messages, userMessage, { role: 'assistant' as const, content: '' }];
    setMessages(nextMessages);
    setInput('');
    setImage(null);
    setLoading(true);
    setNotice(null);
    setThinking(null);

    try {
      const payloadMessages = [...messages, userMessage].map((message) => ({
        role: message.role,
        content: message.content,
        image: message.imageDataUrl ? { dataUrl: message.imageDataUrl, fileName: message.imageFileName ?? 'image', mimeType: message.imageMimeType ?? 'image/jpeg', size: message.imageSize ?? 0 } : undefined,
      }));
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: isLoggedIn ? conversationId : undefined, messages: payloadMessages }),
      });
      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? 'AI 服务暂时不可用。');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      stream: while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split(/\r?\n/);
        buffer = done ? '' : (lines.pop() ?? '');
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (data === '[DONE]') break stream;
          const event = JSON.parse(data) as { text?: string; reasoning?: string; provisional?: boolean; replaceProvisional?: boolean; error?: string; conversationId?: number };
          if (event.error) throw new Error(event.error);
          if (event.conversationId) setConversationId(event.conversationId);
          if (event.reasoning) setThinking(event.reasoning);
          if (event.text) {
            const chunkText = event.text;
            setThinking(null);
            setMessages((current) => {
              const updated = [...current];
              const last = updated.at(-1);
              if (last?.role === 'assistant') {
                updated[updated.length - 1] = {
                  ...last,
                  content: event.replaceProvisional ? chunkText : last.content + chunkText,
                };
              }
              return updated;
            });
          }
        }
        if (done) break;
      }
      if (isLoggedIn) await loadConversations();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI 响应失败。';
      setMessages((current) => [...current.slice(0, -1), { role: 'assistant', content: message }]);
    } finally {
      setLoading(false);
      setThinking(null);
    }
  };

  const pickImage = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setNotice('请选择图片文件。');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setNotice('图片不能超过 3MB。');
      return;
    }
    setImage({ dataUrl: await fileToDataUrl(file), fileName: file.name, mimeType: file.type, size: file.size });
    setNotice(`已选择 ${file.name}`);
  };

  return (
    <aside className={styles.widget} aria-label="MovieFlex AI 助手" style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }}>
      {open && (
        <section className={`${styles.panel} ${position.x < 430 ? styles.panelRight : ''}`} aria-label="芙宁娜 AI 助手">
          <header className={styles.header}>
            <div><strong>芙宁娜 AI 助手</strong><span>{isLoggedIn ? '多会话已保存' : '游客单会话，本地保存'}</span></div>
            <button type="button" className={styles.close} onClick={() => setOpen(false)} aria-label="关闭聊天">x</button>
          </header>
          <div className={styles.chatShell}>
            <aside className={styles.conversationRail} aria-label="对话记录">
              <button type="button" className={styles.newChatButton} onClick={() => void createNewConversation()} disabled={loading}>{isLoggedIn ? '新对话' : '清空对话'}</button>
              <div className={styles.conversationList}>
                {isLoggedIn && conversations.slice(0, 5).map((item) => <button key={item.id} type="button" className={`${styles.conversationItem} ${item.id === conversationId ? styles.conversationItemActive : ''}`} onClick={() => setConversationId(item.id)} disabled={loading} title={item.title}>{item.title}</button>)}
                {!isLoggedIn && <p className={styles.guestNote}>登录后可保存多个会话</p>}
              </div>
            </aside>
            <div className={styles.chatArea}>
              <div className={styles.messages} aria-live="polite">
                {messages.length === 0 && <p className={styles.empty}>问我想看的类型，或上传电影封皮让我识别。</p>}
                {messages.map((message, index) => <p key={index} className={`${styles.message} ${message.role === 'user' ? styles.user : styles.assistant}`}>{message.content || (message.hasImage ? '请识别这张电影封皮' : '')}{message.hasImage && <span className={styles.meta}>包含图片：{message.imageFileName}</span>}</p>)}
                {loading && <p className={`${styles.message} ${styles.assistant}`}>{thinking ?? '正在连接 AI 服务...'}</p>}
              </div>
              <form className={styles.form} onSubmit={(event) => { event.preventDefault(); void send(); }}>
                {notice && <p className={styles.hint}>{notice}</p>}
                <div className={styles.inputRow}>
                  <input type="text" value={input} onChange={(event) => setInput(event.target.value)} placeholder="想看什么电影？" disabled={loading} maxLength={1000} />
                  <label className={styles.attach} title="上传电影封皮">+
                    <input type="file" accept="image/*" onChange={(event) => void pickImage(event.target.files?.[0])} disabled={loading} />
                  </label>
                  <button className={styles.send} type="submit" disabled={loading || (!input.trim() && !image)}>发送</button>
                </div>
              </form>
            </div>
          </div>
        </section>
      )}
      <button type="button" className={styles.character} aria-label="点击打开 MovieFlex AI 助手，长按后可拖动" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); pressedAt.current = event.pointerId; dragOffset.current = { x: event.clientX - position.x, y: event.clientY - position.y }; pressTimer.current = window.setTimeout(() => { dragging.current = true; }, 180); }} onPointerMove={(event) => { if (pressedAt.current === event.pointerId && dragging.current) setPosition(bounded({ x: event.clientX - dragOffset.current.x, y: event.clientY - dragOffset.current.y })); }} onPointerUp={release} onPointerCancel={cleanupPointer} onLostPointerCapture={cleanupPointer}>
        <img src={`/mascot/furina/${POSES[pose]}`} alt="" draggable="false" onError={() => setImageFailed(true)} />
      </button>
    </aside>
  );
}
