import { useCallback } from 'react';

/**
 * Plays a short tone through the Web Audio API.
 *
 * A generated tone avoids shipping an audio file and, more importantly, avoids
 * the autoplay restrictions that block <audio> elements — by the time rest ends
 * the user has already interacted with the page.
 */
function playBeep(): void {
  try {
    const AudioCtor = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioCtor) return;

    const context = new AudioCtor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.45);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.5);
    oscillator.onended = () => void context.close();
  } catch {
    // Audio is a nicety; never let it break the workout flow.
  }
}

function vibrate(): void {
  if (typeof navigator.vibrate === 'function') {
    navigator.vibrate([180, 90, 180]);
  }
}

/** Sound and vibration cue for the end of a rest period. */
export function useRestFeedback(soundEnabled: boolean, vibrationEnabled: boolean) {
  return useCallback(() => {
    if (soundEnabled) playBeep();
    if (vibrationEnabled) vibrate();
  }, [soundEnabled, vibrationEnabled]);
}
