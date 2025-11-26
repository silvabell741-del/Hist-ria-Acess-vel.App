
// utils/cacheUtils.ts
export const setSessionCache = (key: string, value: any) => {
  try { 
    if (value === undefined) return; // Do not store undefined
    sessionStorage.setItem(key, JSON.stringify(value)); 
  } catch (e) { 
    console.warn("Could not write to sessionStorage:", e);
  }
};

export const getSessionCache = (key: string) => {
  try { 
    const v = sessionStorage.getItem(key); 
    return v ? JSON.parse(v) : null; 
  } catch { 
    return null; 
  }
};

export const removeSessionCache = (key: string) => {
  try { 
    sessionStorage.removeItem(key); 
  } catch (e) {
    console.warn("Could not remove from sessionStorage:", e);
  }
};
