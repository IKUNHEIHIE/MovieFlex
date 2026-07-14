'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { clampMascotPosition, DEFAULT_MASCOT_POSITION, FURINA_DIALOGUES, isMascotSuppressed, loadMascotPosition, saveMascotPosition, shouldActivateMascotClick, type MascotPosition } from './furina-mascot';
import styles from './FurinaMascot.module.css';

const POSES = ['pose-01.png', 'pose-02.png', 'pose-03.png', 'pose-04.png', 'pose-05.png', 'pose-06.png'];
const STORAGE_KEY = 'movieflex-furina-position';
const DESKTOP_SIZE = { width: 168, height: 218 };
const MOBILE_SIZE = { width: 128, height: 166 };

export default function FurinaMascot() {
  const pathname = usePathname();
  const [position, setPosition] = useState<MascotPosition | null>(null);
  const [pose, setPose] = useState(0);
  const [dialogue, setDialogue] = useState<string | null>(null);
  const [rippling, setRippling] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [focusedEditable, setFocusedEditable] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const pressedAt = useRef<number | null>(null);
  const dragging = useRef(false);
  const dragOffset = useRef<MascotPosition>({ x: 0, y: 0 });
  const pressTimer = useRef<number | null>(null);
  const dialogueTimer = useRef<number | null>(null);
  const rippleTimer = useRef<number | null>(null);
  const mascotSize = () => window.innerWidth <= 680 ? MOBILE_SIZE : DESKTOP_SIZE;
  const defaultPosition = () => { const size = mascotSize(); return { x: window.innerWidth - size.width - 18, y: window.innerHeight - size.height - 18 }; };
  const bounded = (next: MascotPosition) => clampMascotPosition(next, { width: window.innerWidth, height: window.innerHeight }, mascotSize());
  const suppressed = isMascotSuppressed(pathname, focusedEditable);

  const showRandomDialogue = useCallback(() => {
    if (dialogueTimer.current) window.clearTimeout(dialogueTimer.current);
    setDialogue(FURINA_DIALOGUES[Math.floor(Math.random() * FURINA_DIALOGUES.length)]);
    dialogueTimer.current = window.setTimeout(() => setDialogue(null), 4200);
  }, []);

  useEffect(() => {
    const stored = loadMascotPosition(() => window.localStorage.getItem(STORAGE_KEY));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser storage is unavailable until the mascot mounts.
    setPosition(stored === DEFAULT_MASCOT_POSITION ? defaultPosition() : bounded(stored));
    const handleResize = () => setPosition((current) => current ? bounded(current) : current);
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
      setFocusedEditable(active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement || (active instanceof HTMLElement && active.isContentEditable));
    };
    document.addEventListener('focusin', updateFocusedElement);
    document.addEventListener('focusout', updateFocusedElement);
    updateFocusedElement();
    return () => { document.removeEventListener('focusin', updateFocusedElement); document.removeEventListener('focusout', updateFocusedElement); };
  }, []);

  useEffect(() => () => { if (pressTimer.current) window.clearTimeout(pressTimer.current); if (dialogueTimer.current) window.clearTimeout(dialogueTimer.current); if (rippleTimer.current) window.clearTimeout(rippleTimer.current); }, []);

  useEffect(() => {
    if (reducedMotion || suppressed || imageFailed) return;
    const poseTimer = window.setInterval(() => setPose((current) => (current + 1) % POSES.length), 12000);
    const firstIdle = window.setTimeout(showRandomDialogue, 45000);
    const idleTimer = window.setInterval(showRandomDialogue, 60000);
    return () => { window.clearInterval(poseTimer); window.clearTimeout(firstIdle); window.clearInterval(idleTimer); };
  }, [imageFailed, reducedMotion, showRandomDialogue, suppressed]);

  if (suppressed || imageFailed || !position) return null;

  const cleanupPointer = () => {
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    dragging.current = false;
    pressedAt.current = null;
  };

  const triggerMascot = () => {
    setPose((current) => (current + 1) % POSES.length);
    showRandomDialogue();
    if (!reducedMotion) {
      if (rippleTimer.current) window.clearTimeout(rippleTimer.current);
      setRippling(true);
      rippleTimer.current = window.setTimeout(() => setRippling(false), 620);
    }
  };

  const activateMascot = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (shouldActivateMascotClick(event.detail)) triggerMascot();
  };

  const release = () => {
    const wasDragging = dragging.current;
    cleanupPointer();
    if (wasDragging && position) saveMascotPosition((value) => window.localStorage.setItem(STORAGE_KEY, value), position);
    if (!wasDragging) {
      triggerMascot();
    }
  };

  return <aside className={styles.mascot} aria-label="芙宁娜看板娘" style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }}>
    {dialogue && <div className={`${styles.speech} ${position.x < 230 ? styles.speechRight : ''}`} role="status">{dialogue}</div>}
    <button type="button" className={styles.character} aria-label="点击芙宁娜聆听台词，长按后可拖动"
      onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); pressedAt.current = event.pointerId; dragOffset.current = { x: event.clientX - position.x, y: event.clientY - position.y }; pressTimer.current = window.setTimeout(() => { dragging.current = true; }, 180); }}
      onPointerMove={(event) => { if (pressedAt.current === event.pointerId && dragging.current) setPosition(bounded({ x: event.clientX - dragOffset.current.x, y: event.clientY - dragOffset.current.y })); }}
      onPointerUp={release} onPointerCancel={cleanupPointer} onLostPointerCapture={cleanupPointer} onClick={activateMascot}>
      {rippling && <span className={styles.ripple} aria-hidden="true" />}
      <img src={`/mascot/furina/${POSES[pose]}`} alt="" draggable="false" onError={() => setImageFailed(true)} />
    </button>
  </aside>;
}
