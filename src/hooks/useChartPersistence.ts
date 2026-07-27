import {
  getNodesBounds,
  getViewportForBounds,
  type Node,
} from "@xyflow/react";
import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";

import { CHART_VERSION_WRITES_ENABLED } from "../config/chartFeatures";
import { supabase } from "../supabaseClient";

export type ChartSaveStatus = "idle" | "saving" | "saved" | "error";

interface SerializedChartState {
  nodes: string;
  edges: string;
}

interface ChartPersistenceOptions<NodeType, EdgeType> {
  chartId: string;
  nodes: NodeType[];
  edges: EdgeType[];
  nodesRef: MutableRefObject<NodeType[]>;
  edgesRef: MutableRefObject<EdgeType[]>;
  lastSyncData: MutableRefObject<SerializedChartState>;
  setNodes: Dispatch<SetStateAction<NodeType[]>>;
  setEdges: Dispatch<SetStateAction<EdgeType[]>>;
  setSaveStatus: Dispatch<SetStateAction<ChartSaveStatus>>;
  loading: boolean;
  canEdit: boolean;
}

export function useChartPersistence<NodeType, EdgeType>({
  chartId,
  nodes,
  edges,
  nodesRef,
  edgesRef,
  lastSyncData,
  setNodes,
  setEdges,
  setSaveStatus,
  loading,
  canEdit,
}: ChartPersistenceOptions<NodeType, EdgeType>) {
  const saveInFlight = useRef(false);
  const saveRequested = useRef(false);

  const performSave = useCallback(async () => {
    if (saveInFlight.current) {
      saveRequested.current = true;
      return;
    }
    saveInFlight.current = true;

    try {
      while (true) {
        saveRequested.current = false;
        const nodesToSave = nodesRef.current;
        const edgesToSave = edgesRef.current;
        const nodesString = JSON.stringify(nodesToSave);
        const edgesString = JSON.stringify(edgesToSave);

        if (
          nodesString === lastSyncData.current.nodes &&
          edgesString === lastSyncData.current.edges
        ) {
          break;
        }

        const previousNodes = JSON.parse(
          lastSyncData.current.nodes || "[]",
        ) as NodeType[];
        const previousNodeCount = previousNodes.length;
        const currentNodeCount = nodesToSave.length;
        if (
          previousNodeCount > 5 &&
          (currentNodeCount < 3 ||
            currentNodeCount < previousNodeCount * 0.3)
        ) {
          const confirmed = window.confirm(
            `Warning: You are about to save a state with only ${currentNodeCount} nodes (down from ${previousNodeCount}). This will overwrite your data in the database. Are you absolutely sure you want to proceed?`,
          );
          if (!confirmed) {
            setNodes(previousNodes);
            setEdges(
              JSON.parse(
                lastSyncData.current.edges || "[]",
              ) as EdgeType[],
            );
            setSaveStatus("saved");
            return;
          }
        }

        setSaveStatus("saving");
        const { data: savedChart, error: saveError } = await supabase
          .from("charts")
          .update({
            nodes: nodesToSave,
            edges: edgesToSave,
            updated_at: new Date().toISOString(),
          })
          .eq("id", chartId)
          .select("id")
          .maybeSingle();
        if (saveError) throw saveError;
        if (!savedChart) {
          throw new Error(
            "The chart could not be saved or is no longer accessible.",
          );
        }

        lastSyncData.current = {
          nodes: nodesString,
          edges: edgesString,
        };

        const lastVersionTime = Number(
          localStorage.getItem(`last_version_time_${chartId}`) || 0,
        );
        if (
          CHART_VERSION_WRITES_ENABLED &&
          Date.now() - lastVersionTime > 5 * 60 * 1_000
        ) {
          const { error: versionError } = await supabase
            .from("chart_versions")
            .insert({
              chart_id: chartId,
              nodes: nodesToSave,
              edges: edgesToSave,
            });
          if (versionError) {
            console.warn(
              "Version snapshot failed (non-critical):",
              versionError,
            );
          } else {
            localStorage.setItem(
              `last_version_time_${chartId}`,
              String(Date.now()),
            );
          }
        }

        const lastThumbnailTime = Number(
          localStorage.getItem(`last_thumb_time_${chartId}`) || 0,
        );
        if (Date.now() - lastThumbnailTime > 5 * 60 * 1_000) {
          try {
            const viewportElement = document.querySelector<HTMLElement>(
              ".react-flow__viewport",
            );
            if (viewportElement && nodesToSave.length > 0) {
              const { toPng } = await import("html-to-image");
              const bounds = getNodesBounds(nodesToSave as Node[]);
              const width = 640;
              const height = 360;
              const viewport = getViewportForBounds(
                bounds,
                width,
                height,
                0.05,
                2,
                0.05,
              );
              const dataUrl = await toPng(viewportElement, {
                backgroundColor: "#0f2044",
                width,
                height,
                style: {
                  width: `${width}px`,
                  height: `${height}px`,
                  transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
                },
              });
              const blob = await (await fetch(dataUrl)).blob();
              const filePath = `${chartId}.png`;
              const { error: uploadError } = await supabase.storage
                .from("thumbnails")
                .upload(filePath, blob, {
                  contentType: "image/png",
                  upsert: true,
                });
              if (uploadError) throw uploadError;

              const { data: publicUrl } = supabase.storage
                .from("thumbnails")
                .getPublicUrl(filePath);
              if (publicUrl?.publicUrl) {
                const { error: thumbnailError } = await supabase
                  .from("charts")
                  .update({ thumbnail_url: publicUrl.publicUrl })
                  .eq("id", chartId);
                if (thumbnailError) throw thumbnailError;
              }
              localStorage.setItem(
                `last_thumb_time_${chartId}`,
                String(Date.now()),
              );
            }
          } catch (thumbnailError) {
            console.warn(
              "Thumbnail capture failed (non-critical):",
              thumbnailError,
            );
          }
        }

        const latestNodes = JSON.stringify(nodesRef.current);
        const latestEdges = JSON.stringify(edgesRef.current);
        if (
          !saveRequested.current &&
          latestNodes === nodesString &&
          latestEdges === edgesString
        ) {
          try {
            localStorage.removeItem(`chart_backup_${chartId}`);
          } catch (backupError) {
            console.warn(
              "Failed to clear synchronized local backup",
              backupError,
            );
          }
          break;
        }
      }
      setSaveStatus("saved");
    } catch (saveError) {
      console.error("Chart save failed:", saveError);
      setSaveStatus("error");
    } finally {
      saveInFlight.current = false;
    }
  }, [
    chartId,
    edgesRef,
    lastSyncData,
    nodesRef,
    setEdges,
    setNodes,
    setSaveStatus,
  ]);

  useEffect(() => {
    if (loading || !canEdit) return;
    const nodesString = JSON.stringify(nodes);
    const edgesString = JSON.stringify(edges);
    if (
      nodesString === lastSyncData.current.nodes &&
      edgesString === lastSyncData.current.edges
    ) {
      return;
    }

    try {
      localStorage.setItem(
        `chart_backup_${chartId}`,
        JSON.stringify({ nodes, edges, timestamp: Date.now() }),
      );
    } catch (backupError) {
      console.warn("Failed to save to localStorage", backupError);
    }

    const timeout = window.setTimeout(() => {
      void performSave();
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [
    canEdit,
    chartId,
    edges,
    lastSyncData,
    loading,
    nodes,
    performSave,
  ]);

  useEffect(() => {
    if (loading || !canEdit) return;
    const interval = window.setInterval(() => {
      void performSave();
    }, 5 * 60 * 1_000);
    return () => window.clearInterval(interval);
  }, [canEdit, loading, performSave]);

  return { performSave };
}
