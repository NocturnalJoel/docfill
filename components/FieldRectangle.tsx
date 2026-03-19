'use client';

import { memo } from 'react';
import { Rnd } from 'react-rnd';
import { X, Check } from 'lucide-react';
import { hexToRgba } from '@/lib/utils';

interface FieldRectangleProps {
  id: string;
  fieldName: string;
  value?: string;
  color: string;
  confirmed?: boolean;
  // Position/size in pixels relative to the page overlay
  x: number;
  y: number;
  width: number;
  height: number;
  // Callbacks
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, x: number, y: number, width: number, height: number) => void;
  onDelete: (id: string) => void;
  onConfirm?: (id: string) => void;
  onLabelChange?: (id: string, newName: string) => void;
  onValueChange?: (id: string, newValue: string) => void;
  mode: 'client' | 'template';
  containerWidth: number;
  containerHeight: number;
}

const FieldRectangle = memo(function FieldRectangle({
  id,
  fieldName,
  value,
  color,
  confirmed = true,
  x,
  y,
  width,
  height,
  onMove,
  onResize,
  onDelete,
  onConfirm,
  onLabelChange,
  onValueChange,
  mode,
  containerWidth,
  containerHeight,
}: FieldRectangleProps) {
  const bgColor = hexToRgba(color, confirmed ? 0.15 : 0.08);
  const borderColor = confirmed ? color : `${color}88`;

  return (
    <Rnd
      position={{ x, y }}
      size={{ width, height }}
      bounds="parent"
      onDragStop={(_e, d) => {
        onMove(id, d.x, d.y);
      }}
      onResizeStop={(_e, _direction, ref, _delta, position) => {
        onResize(id, position.x, position.y, ref.offsetWidth, ref.offsetHeight);
      }}
      minWidth={40}
      minHeight={20}
      style={{ zIndex: 10 }}
      enableResizing={{
        top: true, right: true, bottom: true, left: true,
        topRight: true, bottomRight: true, bottomLeft: true, topLeft: true,
      }}
    >
      <div
        className="relative w-full h-full rounded"
        style={{
          backgroundColor: bgColor,
          border: `2px ${confirmed ? 'solid' : 'dashed'} ${borderColor}`,
          boxSizing: 'border-box',
        }}
      >
        {/* Label */}
        <div
          className="absolute -top-5 left-0 flex items-center gap-1 text-xs font-medium whitespace-nowrap z-20"
          style={{ color }}
        >
          {onLabelChange ? (
            <input
              className="bg-transparent border-b border-current outline-none text-xs font-semibold cursor-text"
              style={{ color, maxWidth: '120px' }}
              value={fieldName}
              onChange={(e) => onLabelChange(id, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="font-semibold">{fieldName}</span>
          )}
          {mode === 'client' && (
            onValueChange ? (
              <>
                <span>:</span>
                <input
                  className="bg-transparent border-b border-current outline-none text-xs opacity-70 cursor-text"
                  style={{ color, maxWidth: '100px' }}
                  value={value || ''}
                  onChange={(e) => onValueChange(id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  placeholder="value"
                />
              </>
            ) : (
              value && <span className="opacity-70 truncate max-w-[80px]">: {value}</span>
            )
          )}
        </div>

        {/* Action buttons */}
        <div className="absolute -top-5 right-0 flex items-center gap-0.5 z-20">
          {!confirmed && onConfirm && (
            <button
              onClick={(e) => { e.stopPropagation(); onConfirm(id); }}
              className="w-4 h-4 rounded-full flex items-center justify-center text-white hover:opacity-80"
              style={{ backgroundColor: '#10B981' }}
              title="Confirm field"
            >
              <Check size={10} />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(id); }}
            className="w-4 h-4 rounded-full flex items-center justify-center text-white hover:opacity-80"
            style={{ backgroundColor: '#EF4444' }}
            title="Delete field"
          >
            <X size={10} />
          </button>
        </div>

        {/* Center label for small rectangles */}
        {height < 30 && (
          <div
            className="absolute inset-0 flex items-center justify-center text-xs font-bold opacity-60 pointer-events-none"
            style={{ color }}
          >
            {fieldName.length > 10 ? fieldName.slice(0, 8) + '…' : fieldName}
          </div>
        )}
      </div>
    </Rnd>
  );
});

export default FieldRectangle;
