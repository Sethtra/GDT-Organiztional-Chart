import {
  useCallback,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";

interface ChartSnapshot<NodeType, EdgeType> {
  nodes: NodeType[];
  edges: EdgeType[];
}

interface ChartHistory<NodeType, EdgeType> {
  nodesRef: MutableRefObject<NodeType[]>;
  edgesRef: MutableRefObject<EdgeType[]>;
  takeSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useChartHistory<NodeType, EdgeType>(
  nodes: NodeType[],
  edges: EdgeType[],
  setNodes: Dispatch<SetStateAction<NodeType[]>>,
  setEdges: Dispatch<SetStateAction<EdgeType[]>>,
  historyLimit = 31,
): ChartHistory<NodeType, EdgeType> {
  const [past, setPast] = useState<ChartSnapshot<NodeType, EdgeType>[]>([]);
  const [future, setFuture] =
    useState<ChartSnapshot<NodeType, EdgeType>[]>([]);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  const takeSnapshot = useCallback(() => {
    setPast((current) => [
      ...current.slice(-(historyLimit - 1)),
      { nodes: nodesRef.current, edges: edgesRef.current },
    ]);
    setFuture([]);
  }, [historyLimit]);

  const undo = useCallback(() => {
    const currentSnapshot = {
      nodes: nodesRef.current,
      edges: edgesRef.current,
    };
    setPast((currentPast) => {
      const previous = currentPast.at(-1);
      if (!previous) return currentPast;

      setFuture((currentFuture) => [
        currentSnapshot,
        ...currentFuture,
      ]);
      nodesRef.current = previous.nodes;
      edgesRef.current = previous.edges;
      setNodes(previous.nodes);
      setEdges(previous.edges);
      return currentPast.slice(0, -1);
    });
  }, [setEdges, setNodes]);

  const redo = useCallback(() => {
    const currentSnapshot = {
      nodes: nodesRef.current,
      edges: edgesRef.current,
    };
    setFuture((currentFuture) => {
      const next = currentFuture[0];
      if (!next) return currentFuture;

      setPast((currentPast) => [
        ...currentPast,
        currentSnapshot,
      ]);
      nodesRef.current = next.nodes;
      edgesRef.current = next.edges;
      setNodes(next.nodes);
      setEdges(next.edges);
      return currentFuture.slice(1);
    });
  }, [setEdges, setNodes]);

  return {
    nodesRef,
    edgesRef,
    takeSnapshot,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}
