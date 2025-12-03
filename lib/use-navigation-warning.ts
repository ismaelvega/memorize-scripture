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
    // Track if we're currently showing a navigation prompt to avoid duplicate pushes
    let isPendingNavigation = false;
    window.history.pushState(GUARD_STATE, '', window.location.href);

    const cleanup = () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('click', handleDocumentClick, true);
    };

    const runGuard = (action: () => void, reason: NavigationReason) => {
      isPendingNavigation = true;
      onAttempt(() => {
        isPendingNavigation = false;
        cleanup();
        action();
      }, { reason });
      // Reset pending state after a short delay if user cancels
      // This allows the next navigation attempt to work properly
      setTimeout(() => {
        isPendingNavigation = false;
      }, 150);
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
      // If we're already showing a navigation prompt, just re-push and ignore
      if (isPendingNavigation) {
        window.history.pushState(GUARD_STATE, '', window.location.href);
        return;
      }
      // When user presses back, the guard state is popped.
      // We need to re-push to stay on the page while the dialog is shown.
      // The action will handle cleanup if user confirms.
      window.history.pushState(GUARD_STATE, '', window.location.href);
      runGuard(() => {
        // If user confirms, go back twice (once for our guard, once for actual back)
        // First remove the guard state we just pushed
        window.history.back();
        // Use setTimeout to let the first back complete before the second
        setTimeout(() => {
          window.history.back();
        }, 0);
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
