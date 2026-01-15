"use client";

import * as React from 'react';

type DoubleConfirmOptions = {
  timeoutMs?: number;
  disabled?: boolean;
  onArm?: () => void;
  onCancel?: () => void;
};

export function useDoubleConfirm(options: DoubleConfirmOptions = {}) {
  const { timeoutMs = 2000, disabled = false, onArm, onCancel } = options;
  const [isArmed, setIsArmed] = React.useState(false);
  const timerRef = React.useRef<number | null>(null);
  const tokenRef = React.useRef(`confirm-${Math.random().toString(36).slice(2, 9)}`);

  const clearTimer = React.useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cancel = React.useCallback(() => {
    clearTimer();
    setIsArmed(false);
    onCancel?.();
  }, [clearTimer, onCancel]);

  const arm = React.useCallback(() => {
    if (disabled) return false;
    setIsArmed(true);
    onArm?.();
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      setIsArmed(false);
      onCancel?.();
    }, timeoutMs);
    return true;
  }, [disabled, onArm, onCancel, clearTimer, timeoutMs]);

  const confirm = React.useCallback(
    (onConfirm?: () => void) => {
      if (disabled) return false;
      if (!isArmed) {
        arm();
        return false;
      }
      cancel();
      onConfirm?.();
      return true;
    },
    [disabled, isArmed, arm, cancel]
  );

  React.useEffect(() => {
    if (!isArmed) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest(`[data-confirm-token="${tokenRef.current}"]`)) {
        return;
      }
      cancel();
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isArmed, cancel]);

  React.useEffect(() => {
    if (disabled && isArmed) cancel();
  }, [disabled, isArmed, cancel]);

  React.useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  return {
    isArmed,
    token: tokenRef.current,
    confirm,
    cancel,
  };
}
