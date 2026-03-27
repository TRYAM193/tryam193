import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { FiTrash2, FiGrid } from 'react-icons/fi';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { reorderLayers } from '../functions/layer';
import removeObject from '../functions/remove';
import LayerPreview from './LayerPreview';

const SortableLayerItem = ({ id, object, isSelected, onSelect, onDelete }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: String(id) });

    const style = {
        // Only translate Y — never X. Prevents sideways slide-in animation.
        transform: transform
            ? `translate3d(0px, ${transform.y}px, 0) scaleX(${transform.scaleX ?? 1}) scaleY(${transform.scaleY ?? 1})`
            : undefined,
        transition,
        // When this item is the active dragged one, make it look lifted
        ...(isDragging ? {
            boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
            background: 'rgb(51 65 85 / 0.97)',
            borderColor: 'rgb(99 102 241 / 0.6)',
            opacity: 1,
            zIndex: 50,
        } : {})
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`layer-item select-none p-2 flex items-center justify-between rounded-md mb-2 border transition-[box-shadow,background,border-color] cursor-grab active:cursor-grabbing group
                ${isSelected && !isDragging
                    ? 'bg-orange-500/10 border-orange-500/50'
                    : 'bg-slate-800/40 border-white/5 hover:bg-white/5 hover:border-white/10'}`}
        >
            <div
                className="flex items-center gap-2 overflow-hidden flex-1"
                style={{ touchAction: 'none' }}
                {...attributes}
                {...listeners}
                onClick={() => onSelect(object.id)}
            >
                <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center border border-white/5 overflow-hidden flex-shrink-0 pointer-events-none">
                    <LayerPreview object={object} />
                </div>

                <span className={`text-xs ml-1 font-medium truncate pointer-events-none ${isSelected ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                    {object.type === 'text'
                        ? object.props?.text?.substring(0, 15) || 'Text'
                        : object.type.charAt(0).toUpperCase() + object.type.slice(1)}
                </span>
            </div>

            <button
                title="Delete Layer"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(object.id);
                }}
                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors ml-2 flex-shrink-0 z-10"
            >
                <FiTrash2 size={14} />
            </button>
        </div>
    );
};

export default function LayersPanel({ selectedId, setSelectedId, fabricCanvas }) {
    const canvasObjects = useSelector(state => state.canvas.present);
    const [layers, setLayers] = useState([]);

    useEffect(() => {
        const reduxLayers = [...canvasObjects].reverse();
        setLayers(reduxLayers);
    }, [canvasObjects]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = layers.findIndex((l) => String(l.id) === active.id);
            const newIndex = layers.findIndex((l) => String(l.id) === over.id);

            const newDisplayOrder = arrayMove(layers, oldIndex, newIndex);
            setLayers(newDisplayOrder);

            const newReduxOrder = [...newDisplayOrder].reverse();
            reorderLayers(newReduxOrder);

            if (fabricCanvas) {
                fabricCanvas.renderAll();
            }
        }
    };

    const handleSelectLayer = (id) => {
        setSelectedId(id);
        if (fabricCanvas) {
            const obj = fabricCanvas.getObjects().find(o => String(o.customId) === String(id) || String(o.id) === String(id));
            if (obj) {
                fabricCanvas.setActiveObject(obj);
                fabricCanvas.renderAll();
            }
        }
    };

    const handleDeleteLayer = (id) => {
        removeObject(id);
        setSelectedId(null);
    };

    return (
        <div className="layers-panel-content p-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase text-center mb-4 tracking-wider flex items-center justify-center gap-2">
                <FiGrid size={14} /> Layers ({layers.length})
            </h3>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <div
                    className='layer-list-wrapper relative w-full h-full'
                    onTouchStart={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                    onTouchEnd={(e) => e.stopPropagation()}
                >
                    <SortableContext
                        items={layers.map(l => String(l.id))}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="layer-list relative pb-20 w-full overflow-hidden">
                            {layers.length === 0 && (
                                <div className="text-center py-10 text-slate-500 text-xs border border-dashed border-white/10 rounded-lg">
                                    Canvas is empty
                                </div>
                            )}
                            {layers.map((obj) => (
                                <SortableLayerItem
                                    key={String(obj.id)}
                                    id={String(obj.id)}
                                    object={obj}
                                    isSelected={String(obj.id) === String(selectedId)}
                                    onSelect={handleSelectLayer}
                                    onDelete={handleDeleteLayer}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </div>
            </DndContext>
        </div>
    );
}
