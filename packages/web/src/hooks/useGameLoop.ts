import { useEffect, useRef, useCallback } from 'react';

export function useGameLoop(
  callback: (deltaMs: number) => boolean,
  active: boolean,
) {
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    lastTimeRef.current = 0;
  }, []);

  const loop = useCallback((time: number) => {
    const delta = lastTimeRef.current === 0 ? 16 : Math.min(time - lastTimeRef.current, 50);
    lastTimeRef.current = time;

    const keepRunning = callbackRef.current(delta);

    if (keepRunning) {
      rafRef.current = requestAnimationFrame(loop);
      return;
    }

    stopLoop();
  }, [stopLoop]);

  useEffect(() => {
    if (!active) {
      stopLoop();
      return;
    }

    if (rafRef.current !== null) {
      return;
    }

    rafRef.current = requestAnimationFrame(loop);
  }, [active, loop, stopLoop]);

  useEffect(() => stopLoop, [stopLoop]);
}
