import * as React from 'react';

type NavigationReason = 'refresh' | 'back' | 'link';

interface NavigationWarningOptions {
  onAttempt?: (action: () => void, details: { reason: NavigationReason }) => void;
}

const REFRESH_KEYS = new Set(['F5', 'r', 'R']);

export function useNavigationWarning(active: boolean, options?: NavigationWarningOptions) {
  const onAttempt = options?.onAttempt;

  // Native browser beforeunload warning for page refresh/close/tab close
  // This runs independently of onAttempt to show the browser's native dialog
  React.useEffect(() => {
    if (!active) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Modern browsers ignore custom messages but still show a generic prompt
      event.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [active]);

  React.useEffect(() => {
    if (!active || !onAttempt) return;

    // Push a state entry so we can intercept the back button
    // Use a marker to identify our guard state
    const GUARD_STATE = { __navGuard: true };
    window.history.pushState(GUARD_STATE, '', window.location.href);

    const cleanup = () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('click', handleDocumentClick, true);
    };

    const runGuard = (action: () => void, reason: NavigationReason) => {
      onAttempt(() => {
        cleanup();
        action();
      }, { reason });
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const isRefresh =
        REFRESH_KEYS.has(event.key) && (event.ctrlKey || event.metaKey) ||
        event.key === 'F5';
      const isCloseTab = (event.key === 'w' || event.key === 'W') && (event.metaKey || event.ctrlKey);
      const isBackCombo =
        (event.key === 'ArrowLeft' && event.altKey) ||
        (event.key === 'BracketLeft' && event.metaKey);

      if (isRefresh) {
        event.preventDefault();
        event.stopPropagation();
        runGuard(() => window.location.reload(), 'refresh');
        return;
      }

      if (isCloseTab) {
        event.preventDefault();
        event.stopPropagation();
        runGuard(() => {
          try {
            window.close();
          } catch {
            // ignore
          } finally {
            window.history.back();
          }
        }, 'back');
        return;
      }

      if (isBackCombo) {
        event.preventDefault();
        event.stopPropagation();
        runGuard(() => window.history.back(), 'back');
      }
    };

    const handlePopState = () => {
      // When user presses back, the guard state is popped
      // Re-push it to stay on the page and show the dialog
      window.history.pushState(GUARD_STATE, '', window.location.href);
      runGuard(() => {
        // If user confirms, go back twice (once for our guard, once for actual back)
        window.history.go(-2);
      }, 'back');
    };

    const handleDocumentClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest('a');
      if (!anchor) return;
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#')) return;

      event.preventDefault();
      event.stopPropagation();
      const destination = anchor.href;
      runGuard(() => window.location.assign(destination), 'link');
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('popstate', handlePopState);
    document.addEventListener('click', handleDocumentClick, true);

    return () => {
      cleanup();
      // Clean up our guard state when deactivating
      // Only go back if we're still on our guard state
      if (window.history.state?.__navGuard) {
        window.history.back();
      }
    };
  }, [active, onAttempt]);
}
