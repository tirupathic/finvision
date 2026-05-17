import { createContext, useContext, useState, useCallback } from 'react';

const TABS_KEY = 'fv_symbol_tabs';
const MAX_TABS = 10;

const TabsContext = createContext(null);

function load() {
  try { return JSON.parse(localStorage.getItem(TABS_KEY) || '[]'); }
  catch { return []; }
}

function save(tabs) {
  localStorage.setItem(TABS_KEY, JSON.stringify(tabs));
}

export function TabsProvider({ children }) {
  const [tabs, setTabs] = useState(load);

  const addTab = useCallback((symbol) => {
    const sym = symbol.toUpperCase();
    setTabs(prev => {
      if (prev.includes(sym)) return prev;
      const next = [...prev, sym].slice(-MAX_TABS);
      save(next);
      return next;
    });
  }, []);

  const removeTab = useCallback((symbol) => {
    const sym = symbol.toUpperCase();
    sessionStorage.removeItem(`fv_tab_${sym}`);
    setTabs(prev => {
      const next = prev.filter(s => s !== sym);
      save(next);
      return next;
    });
  }, []);

  const clearTabs = useCallback(() => {
    setTabs([]);
    localStorage.removeItem(TABS_KEY);
  }, []);

  return (
    <TabsContext.Provider value={{ tabs, addTab, removeTab, clearTabs }}>
      {children}
    </TabsContext.Provider>
  );
}

export function useTabs() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('useTabs must be used inside TabsProvider');
  return ctx;
}
