import { useCallback, useMemo, useState } from 'react';

import { TabContext } from './TabContext';

export function TabProvider({ children }) {
  const [openTabs, setOpenTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const [tabNames, setTabNames] = useState({});

  const openTab = useCallback((chartId) => {
    if (!chartId) return;
    setOpenTabs((tabs) =>
      tabs.includes(chartId) ? tabs : [...tabs, chartId],
    );
    setActiveTabId(chartId);
  }, []);

  const closeTab = useCallback((chartId, navigate) => {
    setOpenTabs((tabs) => {
      const nextTabs = tabs.filter((id) => id !== chartId);
      setActiveTabId((currentTabId) => {
        if (currentTabId !== chartId) return currentTabId;
        if (nextTabs.length > 0) return nextTabs[nextTabs.length - 1];

        navigate?.('/dashboard');
        return null;
      });
      return nextTabs;
    });
  }, []);

  const setTabName = useCallback((chartId, name) => {
    setTabNames((names) =>
      names[chartId] === name ? names : { ...names, [chartId]: name },
    );
  }, []);

  const value = useMemo(
    () => ({
      openTabs,
      activeTabId,
      tabNames,
      openTab,
      closeTab,
      setTabName,
    }),
    [openTabs, activeTabId, tabNames, openTab, closeTab, setTabName],
  );

  return <TabContext.Provider value={value}>{children}</TabContext.Provider>;
}
