import { useEffect, useRef } from "react";

interface ChartShortcutActions {
  undo: () => void;
  redo: () => void;
  save: () => void;
  toggleSearch: () => void;
  toggleHelp: () => void;
  closeOverlays: () => void;
  duplicateSelection: () => void;
  copySelection: () => void;
  pasteSelection: () => void;
  deleteSelection: () => void;
  setShiftHeld: (held: boolean) => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}

export function useChartShortcuts(
  active: boolean,
  actions: ChartShortcutActions,
): void {
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  useEffect(() => {
    if (!active) actionsRef.current.setShiftHeld(false);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!active) return;
      const current = actionsRef.current;

      if (event.key === "Shift") current.setShiftHeld(true);
      if (isTypingTarget(event.target)) {
        if (event.key === "Escape") {
          current.closeOverlays();
          (document.activeElement as HTMLElement | null)?.blur();
        }
        return;
      }

      const key = event.key.toLocaleLowerCase();
      const code = event.code;
      if (event.ctrlKey || event.metaKey) {
        if (key === "z" || code === "KeyZ") {
          event.preventDefault();
          if (event.shiftKey) current.redo();
          else current.undo();
        } else if (key === "y" || code === "KeyY") {
          event.preventDefault();
          current.redo();
        } else if (key === "s" || code === "KeyS") {
          event.preventDefault();
          current.save();
        } else if (key === "f" || code === "KeyF") {
          event.preventDefault();
          current.toggleSearch();
        } else if (key === "d" || code === "KeyD") {
          event.preventDefault();
          current.duplicateSelection();
        } else if (key === "c" || code === "KeyC") {
          event.preventDefault();
          current.copySelection();
        } else if (key === "v" || code === "KeyV") {
          event.preventDefault();
          current.pasteSelection();
        }
        return;
      }

      if (event.key === "?" || event.key === "/") {
        event.preventDefault();
        current.toggleHelp();
      } else if (event.key === "Escape") {
        current.closeOverlays();
      } else if (event.key === "Delete" || event.key === "Backspace") {
        current.deleteSelection();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (active && event.key === "Shift") {
        actionsRef.current.setShiftHeld(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [active]);
}
