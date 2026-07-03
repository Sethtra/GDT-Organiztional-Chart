import { createContext, useContext, useReducer, useEffect } from "react";
import { initialData } from "../data/initialData";
import { v4 as uuidv4 } from "uuid";

const OrgChartContext = createContext(null);

const STORAGE_KEY = "gdt-org-chart-data";

function loadData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return initialData;
}

function saveData(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function reducer(state, action) {
  let newState;

  switch (action.type) {
    case "ADD_NODE": {
      const { parentId, name, nameEn, type } = action.payload;
      const id = uuidv4();
      const siblings = state.children[parentId] || [];
      newState = {
        nodes: {
          ...state.nodes,
          [id]: { id, name, nameEn: nameEn || "", type, parentId, order: siblings.length },
        },
        children: {
          ...state.children,
          [parentId]: [...siblings, id],
          [id]: [],
        },
      };
      break;
    }

    case "UPDATE_NODE": {
      const { id, name, nameEn } = action.payload;
      newState = {
        ...state,
        nodes: {
          ...state.nodes,
          [id]: { ...state.nodes[id], name, nameEn: nameEn || state.nodes[id].nameEn },
        },
      };
      break;
    }

    case "DELETE_NODE": {
      const { id } = action.payload;

      // Recursively collect all descendant ids
      function collectIds(nodeId) {
        const ids = [nodeId];
        const kids = state.children[nodeId] || [];
        kids.forEach((kid) => ids.push(...collectIds(kid)));
        return ids;
      }

      const toDelete = new Set(collectIds(id));
      const parentId = state.nodes[id].parentId;

      const newNodes = { ...state.nodes };
      const newChildren = { ...state.children };

      toDelete.forEach((nid) => {
        delete newNodes[nid];
        delete newChildren[nid];
      });

      if (parentId && newChildren[parentId]) {
        newChildren[parentId] = newChildren[parentId].filter((c) => !toDelete.has(c));
      }

      newState = { nodes: newNodes, children: newChildren };
      break;
    }

    case "REORDER_CHILDREN": {
      const { parentId, newOrder } = action.payload;
      newState = {
        ...state,
        children: { ...state.children, [parentId]: newOrder },
      };
      break;
    }

    case "MOVE_NODE": {
      const { nodeId, fromParentId, toParentId, newOrder } = action.payload;
      const newChildren = { ...state.children };
      newChildren[fromParentId] = (newChildren[fromParentId] || []).filter((id) => id !== nodeId);
      newChildren[toParentId] = newOrder;
      newState = {
        ...state,
        nodes: { ...state.nodes, [nodeId]: { ...state.nodes[nodeId], parentId: toParentId } },
        children: newChildren,
      };
      break;
    }

    case "RESET": {
      newState = initialData;
      break;
    }

    default:
      return state;
  }

  saveData(newState);
  return newState;
}

export function OrgChartProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, loadData);

  const addNode = (parentId, name, nameEn, type) =>
    dispatch({ type: "ADD_NODE", payload: { parentId, name, nameEn, type } });

  const updateNode = (id, name, nameEn) =>
    dispatch({ type: "UPDATE_NODE", payload: { id, name, nameEn } });

  const deleteNode = (id) =>
    dispatch({ type: "DELETE_NODE", payload: { id } });

  const reorderChildren = (parentId, newOrder) =>
    dispatch({ type: "REORDER_CHILDREN", payload: { parentId, newOrder } });

  const moveNode = (nodeId, fromParentId, toParentId, newOrder) =>
    dispatch({ type: "MOVE_NODE", payload: { nodeId, fromParentId, toParentId, newOrder } });

  const resetData = () => dispatch({ type: "RESET" });

  return (
    <OrgChartContext.Provider value={{ state, addNode, updateNode, deleteNode, reorderChildren, moveNode, resetData }}>
      {children}
    </OrgChartContext.Provider>
  );
}

export function useOrgChart() {
  return useContext(OrgChartContext);
}
