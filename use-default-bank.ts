import { useCallback, useEffect, useState } from "react";

/**
 * Storage key used to persist the user's preferred default bank account id.
 * Stored in localStorage because the backend has no concept of a "default"
 * funding source — this is purely a client-side convenience.
 */
const STORAGE_KEY = "nextrade.defaultBankId";

/**
 * useDefaultBank
 * --------------
 * React hook that exposes the id of the user's preferred default bank/card
 * account along with a setter that persists the value to localStorage and
 * notifies other components in the same tab via a custom event.
 *
 * Returns a tuple of `[defaultId, setDefault]`:
 *   - `defaultId`  - the saved bank account id, or `null` if none chosen.
 *   - `setDefault` - call with an id to set it as default, or with `null`
 *                    to clear the preference.
 *
 * Multiple components can use this hook simultaneously; they will all stay
 * in sync because changes dispatch a `nextrade:default-bank-changed` event
 * that every instance listens to. SSR is handled by guarding window access.
 */
export function useDefaultBank(): [string | null, (id: string | null) => void] {
  const [defaultId, setDefaultId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(STORAGE_KEY);
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      setDefaultId(window.localStorage.getItem(STORAGE_KEY));
    };
    window.addEventListener("nextrade:default-bank-changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("nextrade:default-bank-changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const setDefault = useCallback((id: string | null) => {
    if (typeof window === "undefined") return;
    if (id) {
      window.localStorage.setItem(STORAGE_KEY, id);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setDefaultId(id);
    window.dispatchEvent(new Event("nextrade:default-bank-changed"));
  }, []);

  return [defaultId, setDefault];
}
