'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapPickerProps {
  initialPosition?: { lat: number; lng: number };
  onLocationChange?: (lat: number, lng: number) => void;
  interactive?: boolean;
}

// Component to handle map move events and flyTo actions
function MapController({ initialPosition, onLocationChange, interactive }: any) {
  const map = useMapEvents({
    moveend() {
      if (interactive && onLocationChange) {
        const center = map.getCenter();
        onLocationChange(center.lat, center.lng);
      }
    },
  });

  // Keep a ref to avoid flying to the same location on re-renders, but allow external search updates
  const prevPosRef = useRef(initialPosition);

  useEffect(() => {
    if (initialPosition && interactive) {
      // Only flyTo if the initialPosition prop actually changes to a completely new location (like from search)
      if (
        !prevPosRef.current || 
        Math.abs(prevPosRef.current.lat - initialPosition.lat) > 0.0001 ||
        Math.abs(prevPosRef.current.lng - initialPosition.lng) > 0.0001
      ) {
        map.flyTo([initialPosition.lat, initialPosition.lng], 16, { animate: true });
        prevPosRef.current = initialPosition;
      }
    }
  }, [initialPosition, map, interactive]);

  // Initial trigger
  useEffect(() => {
    if (interactive && onLocationChange) {
      const center = map.getCenter();
      onLocationChange(center.lat, center.lng);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

export default function MapPicker({ initialPosition, onLocationChange, interactive = true }: MapPickerProps) {
  const center = initialPosition && initialPosition.lat && initialPosition.lng 
    ? L.latLng(initialPosition.lat, initialPosition.lng) 
    : L.latLng(12.9716, 77.5946); // Bengaluru default

  return (
    <MapContainer 
      center={center} 
      zoom={16} 
      scrollWheelZoom={interactive}
      dragging={interactive}
      zoomControl={false} // We can build a custom one or just hide it like modern apps
      doubleClickZoom={interactive}
      style={{ height: '100%', width: '100%', zIndex: 10 }}
    >
      <TileLayer
        attribution='&copy; Google Maps'
        url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
      />
      {/* 
        Using CartoDB Voyager basemap for a modern, clean look similar to the reference.
        Fallback to OSM if needed, but CartoDB is usually free for light use without an API key. 
      */}
      <MapController 
        initialPosition={initialPosition} 
        onLocationChange={onLocationChange} 
        interactive={interactive} 
      />
    </MapContainer>
  );
}
