import { useCallback, useRef, useState } from 'react';

/**
 * Encapsulates all modal/overlay state that was previously inline in FlowApp:
 * search bar, shortcuts modal, share modal, confirm dialog, version history,
 * linked chart popup, and the backup file input ref.
 *
 * Returns the state + a set of focused toggle/show/close helpers so FlowApp
 * only needs to compose hooks and render the JSX tree.
 */
export function useFlowAppModals() {
  const [showSearch, setShowSearch] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [linkedChartPopup, setLinkedChartPopup] = useState(null);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const backupFileInputRef = useRef(null);

  const showConfirm = useCallback(
    (title, message, onConfirm, danger = false) => {
      setConfirmModal({ title, message, onConfirm, danger });
    },
    [],
  );

  const closeAllOverlays = useCallback(() => {
    setShowSearch(false);
    setShowShortcuts(false);
    setContextMenu(null);
  }, []);

  return {
    // Search
    showSearch,
    setShowSearch,

    // Shortcuts
    showShortcuts,
    setShowShortcuts,

    // Share
    showShare,
    setShowShare,

    // Context Menu
    contextMenu,
    setContextMenu,

    // Confirm
    confirmModal,
    setConfirmModal,
    showConfirm,

    // Linked Chart Popup
    linkedChartPopup,
    setLinkedChartPopup,

    // Version History
    isVersionHistoryOpen,
    setIsVersionHistoryOpen,

    // Backup file input
    backupFileInputRef,

    // Utility
    closeAllOverlays,
  };
}
