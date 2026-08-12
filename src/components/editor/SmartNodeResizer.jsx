import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { NodeResizer } from '@xyflow/react';
import { ChartContext } from '../../contexts/ChartContext';

function resizeEdgesFromEvent(event) {
  const target = event?.sourceEvent?.target;
  return {
    left: Boolean(target?.classList?.contains('left')),
    right: Boolean(target?.classList?.contains('right')),
    top: Boolean(target?.classList?.contains('top')),
    bottom: Boolean(target?.classList?.contains('bottom')),
  };
}

export default function SmartNodeResizer({ nodeId, ...props }) {
  const context = useContext(ChartContext);
  const [measurement, setMeasurement] = useState(null);
  const resizeEdges = useRef({ left: false, right: false, top: false, bottom: false });
  const isResizing = useRef(false);
  const nodeIdRef = useRef(nodeId);
  const resizeHandlerRef = useRef(context?.onNodeResize);
  const cancelHandlerRef = useRef(context?.onNodeResizeCancel);
  const measurementVisible = measurement !== null;
  nodeIdRef.current = nodeId;
  resizeHandlerRef.current = context?.onNodeResize;
  cancelHandlerRef.current = context?.onNodeResizeCancel;

  const updateMeasurement = useCallback((params, commit = false) => {
    const snapped = resizeHandlerRef.current?.(
      nodeIdRef.current,
      params,
      resizeEdges.current,
      commit,
    ) ?? {
      ...params,
      widthMatched: false,
      heightMatched: false,
    };
    setMeasurement(snapped);
  }, []);

  const handleResizeStart = useCallback((event, params) => {
    isResizing.current = true;
    resizeEdges.current = resizeEdgesFromEvent(event);
    updateMeasurement(params);
  }, [updateMeasurement]);

  const handleResize = useCallback((_event, params) => {
    if (!isResizing.current) return;
    updateMeasurement(params);
  }, [updateMeasurement]);

  const handleResizeEnd = useCallback((_event, params) => {
    isResizing.current = false;
    updateMeasurement(params, true);
    setMeasurement(null);
  }, [updateMeasurement]);

  useEffect(() => {
    if (!measurementVisible) return undefined;
    const finishResize = () => {
      isResizing.current = false;
      setMeasurement(null);
      cancelHandlerRef.current?.();
    };
    window.addEventListener('pointerup', finishResize);
    window.addEventListener('pointercancel', finishResize);
    window.addEventListener('blur', finishResize);
    return () => {
      window.removeEventListener('pointerup', finishResize);
      window.removeEventListener('pointercancel', finishResize);
      window.removeEventListener('blur', finishResize);
    };
  }, [measurementVisible]);

  return (
    <>
      <NodeResizer
        {...props}
        nodeId={nodeId}
        onResizeStart={handleResizeStart}
        onResize={handleResize}
        onResizeEnd={handleResizeEnd}
      />

      {measurement && (
        <div className="nx-resize-measure" role="status" aria-live="polite">
          <span className={measurement.widthMatched ? 'is-matched' : ''}>
            W {Math.round(measurement.width)}
          </span>
          <span aria-hidden="true">×</span>
          <span className={measurement.heightMatched ? 'is-matched' : ''}>
            H {Math.round(measurement.height)}
          </span>
        </div>
      )}
    </>
  );
}
