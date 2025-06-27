import * as React from 'react';
import { useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import { useControl } from 'react-map-gl/mapbox';
import type { ControlPosition } from 'react-map-gl/mapbox';

interface PolygonDrawProps {
  onComplete: (coordinates: number[][]) => void;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

type DrawControlProps = ConstructorParameters<typeof MapboxDraw>[0] & {
  position?: ControlPosition;
  onCreate?: (evt: { features: object[] }) => void;
  onUpdate?: (evt: { features: object[]; action: string }) => void;
  onDelete?: (evt: { features: object[] }) => void;
};

function DrawControl(props: DrawControlProps) {
  useControl<MapboxDraw>(
    () => new MapboxDraw(props),
    ({ map }) => {
      if (props.onCreate) map.on('draw.create', props.onCreate);
      if (props.onUpdate) map.on('draw.update', props.onUpdate);
      if (props.onDelete) map.on('draw.delete', props.onDelete);
    },
    ({ map }) => {
      if (props.onCreate) map.off('draw.create', props.onCreate);
      if (props.onUpdate) map.off('draw.update', props.onUpdate);
      if (props.onDelete) map.off('draw.delete', props.onDelete);
    },
    {
      position: props.position
    }
  );
  return null;
}

DrawControl.defaultProps = {
  onCreate: () => {},
  onUpdate: () => {},
  onDelete: () => {}
};

export default function PolygonDraw({ onComplete, position = 'top-left' }: PolygonDrawProps) {
  const [features, setFeatures] = useState<{ [key: string]: any }>({});

  const onUpdate = useCallback((e: any) => {
    setFeatures(currFeatures => {
      const newFeatures: { [key: string]: any } = { ...currFeatures };
      for (const f of e.features) {
        newFeatures[f.id] = f;
      }
      return newFeatures;
    });
  }, []);

  const onDelete = useCallback((e: any) => {
    setFeatures(currFeatures => {
      const newFeatures: { [key: string]: any } = { ...currFeatures };
      for (const f of e.features) {
        delete newFeatures[f.id];
      }
      return newFeatures;
    });
  }, []);

  const onCreate = useCallback((e: any) => {
    onUpdate(e);
    // Extract coordinates from the created feature
    if (e.features && e.features.length > 0) {
      const feature = e.features[0];
      if (feature.geometry.type === 'Polygon' && feature.geometry.coordinates) {
        // Mapbox Draw returns coordinates as [lng, lat] pairs
        const coordinates = feature.geometry.coordinates[0]; // First ring of polygon
        onComplete(coordinates);
      }
    }
  }, [onUpdate, onComplete]);

  return (
    <DrawControl
      position={position}
      displayControlsDefault={false}
      controls={{
        polygon: true,
        trash: true
      }}
      defaultMode="draw_polygon"
      onCreate={onCreate}
      onUpdate={onUpdate}
      onDelete={onDelete}
    />
  );
} 