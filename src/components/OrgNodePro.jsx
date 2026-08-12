import { memo, useContext } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Link as LinkIcon,
  Pencil,
} from 'lucide-react';
import { ChartContext } from '../contexts/ChartContext';
import { TYPE_META } from '../data/nodeTypes';
import OrgNode from './OrgNode';
import SmartNodeResizer from './editor/SmartNodeResizer';
import '../styles/org-node-pro.css';

/**
 * Test-route-only premium unit card.
 *
 * The visual language is a compact GDT civic record: a confident identity
 * header, quiet bilingual hierarchy, and an optional filed-note footer. The
 * component deliberately emits only `.gdt-node*` classes, while person cards
 * delegate to the live OrgNode because their avatar geometry is load-bearing.
 */

function readableInk(hex) {
  const match = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!match) return '#ffffff';

  const value = Number.parseInt(match[1], 16);
  const linearize = (channel) => {
    const ratio = channel / 255;
    return ratio <= 0.03928
      ? ratio / 12.92
      : ((ratio + 0.055) / 1.055) ** 2.4;
  };
  const luminance =
    0.2126 * linearize((value >> 16) & 255) +
    0.7152 * linearize((value >> 8) & 255) +
    0.0722 * linearize(value & 255);

  return 1.05 / (luminance + 0.05) >= (luminance + 0.05) / 0.05
    ? '#ffffff'
    : '#10221a';
}

const RESIZE_LINE = { borderColor: 'transparent' };
const RESIZE_HANDLE = {
  borderColor: '#136232',
  background: '#ffffff',
  borderWidth: 1.5,
  width: 9,
  height: 9,
  borderRadius: '50%',
};

function ConnectionHandles() {
  return (
    <>
      <Handle type="source" position={Position.Top} id="top" className="flow-handle" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="flow-handle" />
      <Handle type="source" position={Position.Left} id="left" className="flow-handle" />
      <Handle type="source" position={Position.Right} id="right" className="flow-handle" />
    </>
  );
}

const OrgNodePro = memo(({ id, data, selected }) => {
  const context = useContext(ChartContext);
  const meta = TYPE_META[data.orgType] || TYPE_META.orgNode;

  if (meta.isPerson) {
    return <OrgNode id={id} data={data} selected={selected} />;
  }

  const isCollapsed = context?.collapsedNodes?.has(id) || false;
  const isHighlighted = context?.searchHighlights?.includes(id) || false;
  const childCount = context?.childCounts?.[id] || 0;
  const fontSize = data.fontSize || 15;
  const textAlign = data.textAlign || 'center';
  const textVerticalAlign = data.textVerticalAlign || 'center';

  const authoredColor = /^#?[0-9a-f]{6}$/i.test(String(data.color || '').trim());
  const bandColor = data.color || 'var(--nx-band-default)';
  const bandInk = authoredColor ? readableInk(data.color) : '#ffffff';
  const isSimple = data.orgType === 'simple';
  const label = String(data.badgeText || 'ORG UNIT').trim();
  const footer = String(data.description || '').trim();
  const hasFooter = Boolean(footer) || (isCollapsed && childCount > 0);
  const accessibleName = [data.name || 'Organizational unit', data.nameEn]
    .filter(Boolean)
    .join(', ');

  return (
    <div
      className={[
        'gdt-node',
        isSimple && 'gdt-node--simple',
        selected && 'gdt-node--selected',
        isHighlighted && 'gdt-node--highlighted',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        '--gdt-band': bandColor,
        '--gdt-band-ink': bandInk,
      }}
      role="group"
      aria-label={accessibleName}
      data-testid="org-node-pro"
    >
      <SmartNodeResizer
        nodeId={id}
        minWidth={176}
        minHeight={92}
        isVisible={selected}
        lineStyle={RESIZE_LINE}
        handleStyle={RESIZE_HANDLE}
      />
      <ConnectionHandles />

      <div className="gdt-node__band">
        {!isSimple && (
          <>
            <div className="gdt-node__identity">
              <span className="gdt-node__mark" aria-hidden="true">
                <Building2 size={13} strokeWidth={1.8} />
              </span>
              <span className="gdt-node__label" title={label}>
                {label}
              </span>
            </div>

            <div className="gdt-node__meta">
              {childCount > 0 && (
                <span
                  className="gdt-node__count"
                  title={`${childCount} direct ${childCount === 1 ? 'unit' : 'units'}`}
                >
                  {isCollapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
                  {childCount}
                </span>
              )}
              {data.linkedChartId && (
                <span className="gdt-node__link" title="Linked to another chart">
                  <LinkIcon size={10} />
                </span>
              )}
            </div>
          </>
        )}
      </div>

      <div
        className="gdt-node__body"
        style={{ justifyContent: textVerticalAlign, textAlign }}
      >
        <span className="gdt-node__edit" aria-hidden="true" title="Double-click to edit">
          <Pencil size={11} />
        </span>
        <div
          className={`gdt-node__name ${data.name ? '' : 'gdt-node__name--empty'}`}
          style={{ fontSize: `${fontSize}px` }}
        >
          {data.name || 'Unit name'}
        </div>
        {data.nameEn && <div className="gdt-node__name-en">{data.nameEn}</div>}
      </div>

      {hasFooter && (
        <div className="gdt-node__footer">
          {footer && <span className="gdt-node__note">{footer}</span>}
          {isCollapsed && childCount > 0 && (
            <span className="gdt-node__collapsed">
              <ChevronRight size={10} /> {childCount} hidden
            </span>
          )}
        </div>
      )}
    </div>
  );
});

OrgNodePro.displayName = 'OrgNodePro';
export default OrgNodePro;
