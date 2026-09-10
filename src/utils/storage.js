const canUseStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

export const storage = {
  get(key, fallback) {
    if (!canUseStorage()) return fallback;
    try {
      const value = window.localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    if (!canUseStorage()) return false;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  remove(key) {
    if (!canUseStorage()) return false;
    window.localStorage.removeItem(key);
    return true;
  },
};

export const createLocalRepository = (key, fallback = []) => ({
  list: () => storage.get(key, fallback),
  save: (records) => storage.set(key, records),
  clear: () => storage.remove(key),
});
