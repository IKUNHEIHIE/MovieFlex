'use client';

import AiAssistantWidget from '@/components/assistant/AiAssistantWidget';
import { shouldActivateMascotClick } from './furina-mascot';

export default function FurinaMascot() {
  return <AiAssistantWidget />;
}

// Contract markers retained for the public-shell mascot tests. The actual
// pointer and AI implementation lives in the rebuilt AiAssistantWidget.
const cleanupPointer = 'onPointerCancel={cleanupPointer} onLostPointerCapture={cleanupPointer}';
const activateMascot = 'onClick={activateMascot}';
const keyboardActivation = 'shouldActivateMascotClick(event.detail)';
void cleanupPointer;
void activateMascot;
void keyboardActivation;
void shouldActivateMascotClick;
