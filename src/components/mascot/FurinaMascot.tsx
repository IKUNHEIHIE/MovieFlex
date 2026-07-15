'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  clampMascotPosition,
  DEFAULT_MASCOT_POSITION,
  FURINA_DIALOGUES,
  isMascotSuppressed,
  loadMascotPosition,
  saveMascotPosition,
  shouldActivateMascotClick,
  type MascotPosition,
} from './furina-mascot';
import styles from './FurinaMascot.module.css';

const POSES = [
  'pose-01.png',
  'pose-02.png',
  'pose-03.png',
  'pose-04.png',
  'pose-05.png',
  'pose-06.png',
];
const STORAGE_KEY = 'movieflex-furina-position';
const DESKTOP_SIZE = { width: 168, height: 218 };
const MOBILE_SIZE = { width: 128, height: 166 };

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export default function FurinaMascot() {
  const pathname = usePathname();
  const [position, setPosition] = useState<MascotPosition | null>(null);
  const [pose, setPose] = useState(0);
  const [dialogue, setDialogue] = useState<string | null>(null);
  const [rippling, setRippling] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [focusedEditable, setFocusedEditable] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: '你好，我是芙宁娜。想找电影，还是想了解 MovieFlex？',
    },
  ]);

  const pressedAt = useRef<number | null>(null);
  const dragging = useRef(false);
  const dragOffset = useRef<MascotPosition>({ x: 0, y: 0 });
  const pressTimer = useRef<number | null>(null);
  const dialogueTimer = useRef<number | null>(null);
  const rippleTimer = useRef<number | null>(null);

  const mascotSize = () =>
    window.innerWidth <= 680 ? MOBILE_SIZE : DESKTOP_SIZE;

  const defaultPosition = () => {
    const size = mascotSize();

    return {
      x: window.innerWidth - size.width - 18,
      y: window.innerHeight - size.height - 18,
    };
  };

  const bounded = (next: MascotPosition) =>
    clampMascotPosition(
      next,
      { width: window.innerWidth, height: window.innerHeight },
      mascotSize(),
    );

  // 聊天框打开时允许输入，避免输入框获得焦点后小人被隐藏。
  const suppressed =
    !chatOpen && isMascotSuppressed(pathname, focusedEditable);

  const showRandomDialogue = useCallback(() => {
    if (dialogueTimer.current) {
      window.clearTimeout(dialogueTimer.current);
    }

    setDialogue(
      FURINA_DIALOGUES[
        Math.floor(Math.random() * FURINA_DIALOGUES.length)
      ],
    );

    dialogueTimer.current = window.setTimeout(() => {
      setDialogue(null);
    }, 4200);
  }, []);

  useEffect(() => {
    const stored = loadMascotPosition(() =>
      window.localStorage.getItem(STORAGE_KEY),
    );

    setPosition(
      stored === DEFAULT_MASCOT_POSITION
        ? defaultPosition()
        : bounded(stored),
    );

    const handleResize = () => {
      setPosition((current) => (current ? bounded(current) : current));
    };

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');

    const update = () => setReducedMotion(media.matches);

    update();
    media.addEventListener('change', update);

    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const updateFocusedElement = () => {
      const active = document.activeElement;

      setFocusedEditable(
        active instanceof HTMLInputElement ||
          active instanceof HTMLTextAreaElement ||
          active instanceof HTMLSelectElement ||
          (active instanceof HTMLElement && active.isContentEditable),
      );
    };

    document.addEventListener('focusin', updateFocusedElement);
    document.addEventListener('focusout', updateFocusedElement);
    updateFocusedElement();

    return () => {
      document.removeEventListener('focusin', updateFocusedElement);
      document.removeEventListener('focusout', updateFocusedElement);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (pressTimer.current) window.clearTimeout(pressTimer.current);
      if (dialogueTimer.current) window.clearTimeout(dialogueTimer.current);
      if (rippleTimer.current) window.clearTimeout(rippleTimer.current);
    };
  }, []);

  useEffect(() => {
    if (reducedMotion || suppressed || imageFailed || chatOpen) return;

    const poseTimer = window.setInterval(() => {
      setPose((current) => (current + 1) % POSES.length);
    }, 12000);

    const firstIdle = window.setTimeout(showRandomDialogue, 45000);
    const idleTimer = window.setInterval(showRandomDialogue, 60000);

    return () => {
      window.clearInterval(poseTimer);
      window.clearTimeout(firstIdle);
      window.clearInterval(idleTimer);
    };
  }, [chatOpen, imageFailed, reducedMotion, showRandomDialogue, suppressed]);

  if (suppressed || imageFailed || !position) return null;

  const cleanupPointer = () => {
    if (pressTimer.current) window.clearTimeout(pressTimer.current);

    dragging.current = false;
    pressedAt.current = null;
  };

  const openChat = () => {
    setPose((current) => (current + 1) % POSES.length);
    setDialogue(null);
    setChatOpen(true);

    if (!reducedMotion) {
      if (rippleTimer.current) window.clearTimeout(rippleTimer.current);

      setRippling(true);
      rippleTimer.current = window.setTimeout(() => {
        setRippling(false);
      }, 620);
    }
  };

  const sendChatMessage = async () => {
    const message = chatInput.trim();

    if (!message || chatLoading) return;

    setChatInput('');
    setChatMessages((messages) => [
      ...messages,
      { role: 'user', content: message },
      { role: 'assistant', content: '' },
    ]);
    setChatLoading(true);

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? 'AI 服务暂时不可用，请稍后再试。');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const appendAssistantText = (text: string) => {
        if (!text) return;
        setChatMessages((messages) => {
          const next = [...messages];
          const last = next.at(-1);
          if (last?.role === 'assistant') {
            next[next.length - 1] = { ...last, content: last.content + text };
          }
          return next;
        });
      };

      stream: while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });

        const lines = buffer.split(/\r?\n/);
        // The final SSE event may not end in a newline, so only preserve the
        // incomplete trailing line while the stream remains open.
        buffer = done ? '' : (lines.pop() ?? '');

        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (data === '[DONE]') {
            break stream;
          }

          try {
            const chunk = JSON.parse(data);
            appendAssistantText(chunk.choices?.[0]?.delta?.content ?? '');
          } catch {
            // Ignore incomplete or non-content SSE records.
          }
        }

        if (buffer.trim() === 'data: [DONE]') break;
        if (done) break;
      }
    } catch {
      setChatMessages((messages) => [
        ...messages.slice(0, -1),
        { role: 'assistant', content: '网络连接出现问题，请稍后再试。' },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const activateMascot = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    if (shouldActivateMascotClick(event.detail)) {
      openChat();
    }
  };

  const release = () => {
    const wasDragging = dragging.current;

    cleanupPointer();

    if (wasDragging && position) {
      saveMascotPosition(
        (value) => window.localStorage.setItem(STORAGE_KEY, value),
        position,
      );
    }

    if (!wasDragging) {
      openChat();
    }
  };

  return (
    <aside
      className={styles.mascot}
      aria-label="芙宁娜看板娘"
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
      }}
    >
      {dialogue && (
        <div
          className={`${styles.speech} ${
            position.x < 230 ? styles.speechRight : ''
          }`}
          role="status"
        >
          {dialogue}
        </div>
      )}

      {chatOpen && (
        <section
          className={`${styles.chatPanel} ${
            position.x < 430 ? styles.chatPanelRight : ''
          }`}
          aria-label="芙宁娜智能助手"
        >
          <header className={styles.chatHeader}>
            <div>
              <strong>芙宁娜助手</strong>
              <span>MovieFlex 智能问答</span>
            </div>

            <button
              type="button"
              className={styles.chatClose}
              aria-label="关闭聊天"
              onClick={() => setChatOpen(false)}
            >
              x
            </button>
          </header>

          <div className={styles.chatMessages} aria-live="polite">
            {chatMessages.map((item, index) => (
              <p
                key={`${item.role}-${index}`}
                className={
                  item.role === 'user'
                    ? styles.chatUserMessage
                    : styles.chatAssistantMessage
                }
              >
                {item.content}
              </p>
            ))}

            {chatLoading && (
              <p className={styles.chatAssistantMessage}>正在思考...</p>
            )}
          </div>

          <form
            className={styles.chatForm}
            onSubmit={(event) => {
              event.preventDefault();
              void sendChatMessage();
            }}
          >
            <input
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder="想问点什么？"
              maxLength={1000}
              disabled={chatLoading}
              aria-label="输入问题"
            />

            <button
              type="submit"
              disabled={!chatInput.trim() || chatLoading}
              aria-label="发送问题"
            >
              发送
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className={styles.character}
        aria-label="点击芙宁娜打开智能助手，长按后可拖动"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          pressedAt.current = event.pointerId;
          dragOffset.current = {
            x: event.clientX - position.x,
            y: event.clientY - position.y,
          };

          pressTimer.current = window.setTimeout(() => {
            dragging.current = true;
          }, 180);
        }}
        onPointerMove={(event) => {
          if (pressedAt.current === event.pointerId && dragging.current) {
            setPosition(
              bounded({
                x: event.clientX - dragOffset.current.x,
                y: event.clientY - dragOffset.current.y,
              }),
            );
          }
        }}
        onPointerUp={release}
        onPointerCancel={cleanupPointer}
        onLostPointerCapture={cleanupPointer}
        onClick={activateMascot}
      >
        {rippling && <span className={styles.ripple} aria-hidden="true" />}

        <img
          src={`/mascot/furina/${POSES[pose]}`}
          alt=""
          draggable="false"
          onError={() => setImageFailed(true)}
        />
      </button>
    </aside>
  );
}
