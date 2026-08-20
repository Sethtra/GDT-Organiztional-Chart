import { useEffect, useRef } from 'react';
import { ExternalLink, Link2, Settings2, X } from 'lucide-react';
import { useLinkedChartTarget } from '../../hooks/useChartLinks';
import './linked-chart-popup.css';

export default function LinkedChartPopup({ popup, onOpen, onManage, onClose }) {
  const popupRef = useRef(null);
  const linkedChartId = popup?.node?.data?.linkedChartId || '';
  const { name: targetName, isLoading } = useLinkedChartTarget(linkedChartId);

  useEffect(() => {
    if (!popup) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    const handlePointerDown = (event) => {
      if (!popupRef.current?.contains(event.target)) onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [popup, onClose]);

  if (!popup) return null;

  const opensAbove =
    typeof window !== 'undefined' && popup.y > window.innerHeight / 2;
  const sourceName = popup.node.data.nameEn || popup.node.data.name || 'Selected node';

  return (
    <div
      ref={popupRef}
      className={`linked-chart-popup ${opensAbove ? 'linked-chart-popup--above' : ''}`}
      style={{
        '--linked-popup-x': `${popup.x}px`,
        '--linked-popup-y': `${popup.y}px`,
      }}
      role="dialog"
      aria-label="Linked chart"
    >
      <div className="linked-chart-popup__header">
        <span className="linked-chart-popup__icon" aria-hidden="true">
          <Link2 size={18} />
        </span>
        <div className="linked-chart-popup__heading">
          <span className="linked-chart-popup__eyebrow">Linked chart</span>
          <strong className="linked-chart-popup__title">
            {isLoading ? 'Loading chart...' : targetName}
          </strong>
        </div>
        <button
          type="button"
          className="linked-chart-popup__close"
          onClick={onClose}
          aria-label="Close linked chart popup"
          title="Close"
        >
          <X size={16} />
        </button>
      </div>

      <p className="linked-chart-popup__source" title={sourceName}>
        Linked from <span>{sourceName}</span>
      </p>

      <div className="linked-chart-popup__actions">
        <button
          type="button"
          className="linked-chart-popup__button linked-chart-popup__button--primary"
          onClick={() => {
            onOpen(linkedChartId);
            onClose();
          }}
        >
          <ExternalLink size={15} />
          Open Chart
        </button>
        {onManage && (
          <button
            type="button"
            className="linked-chart-popup__button linked-chart-popup__button--secondary"
            onClick={onManage}
          >
            <Settings2 size={15} />
            Manage Link
          </button>
        )}
      </div>
    </div>
  );
}
