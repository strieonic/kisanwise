import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Search, Navigation, Compass, MapPin, X, Loader2 } from 'lucide-react';
import { calculateDynamicNdvi, searchPlaces, LocationDetectionResult } from '../services/agroGeoEngine';
import { Language } from '../i18n';

interface FieldMapProps {
  lat: number;
  lng: number;
  areaHectares: number;
  cropName: string;
  soilType?: string;
  irrigationType?: string;
  isEditing?: boolean;
  onLocationChange?: (lat: number, lng: number) => void;
  language?: Language;
}

export const FieldMap: React.FC<FieldMapProps> = ({
  lat,
  lng,
  areaHectares,
  cropName,
  soilType = 'black',
  irrigationType = 'rainfed',
  isEditing = false,
  onLocationChange,
  language = 'mr'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const polygonRef = useRef<L.Polygon | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationDetectionResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isGpsLoading, setIsGpsLoading] = useState(false);

  // Dynamic NDVI computed based on coordinates and soil/irrigation
  const ndvi = calculateDynamicNdvi(lat, lng, soilType, irrigationType, cropName);

  // Compute realistic field boundary coordinates based on area in hectares
  const computePolygon = (centerLat: number, centerLng: number, hectares: number): L.LatLngTuple[] => {
    const sideMeters = Math.sqrt(Math.max(0.2, hectares || 1.0) * 10000);
    const offsetLat = sideMeters / (111000 * 2);
    const offsetLng = sideMeters / (111000 * Math.cos((centerLat * Math.PI) / 180) * 2);

    return [
      [centerLat - offsetLat, centerLng - offsetLng * 1.05],
      [centerLat - offsetLat * 0.95, centerLng + offsetLng],
      [centerLat + offsetLat, centerLng + offsetLng * 0.92],
      [centerLat + offsetLat * 1.02, centerLng - offsetLng * 0.98]
    ];
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Initialize map
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 15,
        zoomControl: false,
        attributionControl: false
      });

      // Esri World Imagery satellite basemap
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19
      }).addTo(map);

      // Polygon
      const initialCoords = computePolygon(lat, lng, areaHectares);
      const polygon = L.polygon(initialCoords, {
        color: '#10b981',
        weight: 3,
        fillColor: '#10b981',
        fillOpacity: 0.35,
        dashArray: '5, 5'
      }).addTo(map);
      polygonRef.current = polygon;

      // Custom Pin Marker
      const customIcon = L.divIcon({
        className: 'custom-pin',
        html: `<div style="background-color: #1b6e47; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; border: 2.5px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.45); cursor: pointer;">🌱</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      const marker = L.marker([lat, lng], {
        icon: customIcon,
        draggable: isEditing
      }).addTo(map);

      marker.bindPopup(`<b>${cropName || 'Farm'} Parcel</b><br/>${areaHectares || 1} Hectares (${((areaHectares || 1) * 2.47).toFixed(1)} acres)`);
      markerRef.current = marker;

      // Drag listener
      marker.on('dragend', (e: any) => {
        const newPos = e.target.getLatLng();
        onLocationChange?.(parseFloat(newPos.lat.toFixed(5)), parseFloat(newPos.lng.toFixed(5)));
      });

      // Click on map to relocate
      map.on('click', (e: L.LeafletMouseEvent) => {
        const clickedLat = parseFloat(e.latlng.lat.toFixed(5));
        const clickedLng = parseFloat(e.latlng.lng.toFixed(5));
        onLocationChange?.(clickedLat, clickedLng);
      });

      map.fitBounds(polygon.getBounds(), { padding: [35, 35] });
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        polygonRef.current = null;
      }
    };
  }, []);

  // Update map dynamically when props change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Update marker
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      markerRef.current.setPopupContent(`<b>${cropName || 'Farm'} Parcel</b><br/>${areaHectares || 1} Hectares (${((areaHectares || 1) * 2.47).toFixed(1)} acres)`);
      if (isEditing) {
        markerRef.current.dragging?.enable();
      } else {
        markerRef.current.dragging?.disable();
      }
    }

    // Update polygon
    if (polygonRef.current) {
      const updatedCoords = computePolygon(lat, lng, areaHectares);
      polygonRef.current.setLatLngs(updatedCoords);
    }
  }, [lat, lng, areaHectares, cropName, isEditing]);

  // Handle Search Input Debounce
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchPlaces(searchQuery);
      setSearchResults(results);
      setShowDropdown(true);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle Select Location from Search
  const handleSelectPlace = (place: LocationDetectionResult) => {
    setShowDropdown(false);
    setSearchQuery(place.displayName);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([place.lat, place.lng], 16, { duration: 1.2 });
    }
    onLocationChange?.(place.lat, place.lng);
  };

  // Handle Browser GPS Location Detection
  const handleGpsDetect = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsGpsLoading(false);
        const userLat = parseFloat(pos.coords.latitude.toFixed(5));
        const userLng = parseFloat(pos.coords.longitude.toFixed(5));
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([userLat, userLng], 16, { duration: 1.2 });
        }
        onLocationChange?.(userLat, userLng);
      },
      (err) => {
        setIsGpsLoading(false);
        console.warn('GPS location detection error:', err);
        alert('Could not access device location. Please enable location permissions or search your district above.');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="space-y-2">
      {/* Search & GPS Location Bar */}
      <div className="relative z-30">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
              placeholder={
                language === 'mr'
                  ? 'गाव, तालुका किंवा जिल्हा शोधा (उदा. सातारा, लातूर, नाशिक, गुंटूर)...'
                  : language === 'hi'
                  ? 'गांव, तहसील या जिला खोजें (जैसे सतारा, लातूर, नासिक, गुंटूर)...'
                  : 'Search village, district or place (e.g. Satara, Latur, Guntur, Nashik)...'
              }
              className="w-full pl-9 pr-8 py-2 rounded-2xl bg-card border border-border shadow-xs text-xs sm:text-sm text-foreground outline-none focus:border-primary transition-all placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setShowDropdown(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* GPS Auto-Detect Button */}
          <button
            type="button"
            onClick={handleGpsDetect}
            disabled={isGpsLoading}
            title="Auto-detect current GPS location"
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-primary/10 text-primary hover:bg-primary/20 border border-primary/25 font-bold text-xs transition-all cursor-pointer whitespace-nowrap active:scale-95"
          >
            {isGpsLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Navigation className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">
              {language === 'mr' ? 'माझे स्थान' : language === 'hi' ? 'मेरा स्थान' : 'GPS Location'}
            </span>
          </button>
        </div>

        {/* Autocomplete Dropdown */}
        {showDropdown && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-14 mt-1 bg-card rounded-2xl border border-border shadow-xl overflow-hidden max-h-56 overflow-y-auto z-40 animate-fade-in">
            {searchResults.map((res, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelectPlace(res)}
                className="w-full text-left px-3.5 py-2.5 hover:bg-muted/60 transition-colors border-b border-border/50 last:border-none flex items-center gap-2.5 text-xs cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                <div className="truncate">
                  <p className="font-bold text-foreground truncate">{res.displayName}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Lat: {res.lat.toFixed(4)}, Lng: {res.lng.toFixed(4)} • Soil: {res.suggestedSoil}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map Canvas */}
      <div className="relative w-full h-72 sm:h-88 rounded-3xl overflow-hidden border border-border shadow-xs">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Dynamic Sentinel NDVI Vigor Badge */}
        <div className="absolute top-3 left-3 z-20 bg-card/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-border/80 shadow-md text-xs font-semibold flex items-center gap-2">
          <span 
            className="w-2.5 h-2.5 rounded-full animate-ping"
            style={{
              backgroundColor: ndvi.value >= 0.72 ? '#10b981' : ndvi.value >= 0.55 ? '#f59e0b' : '#ef4444'
            }}
          />
          <span className="text-foreground font-mono">
            Sentinel NDVI: <strong className="text-primary font-bold">{ndvi.value.toFixed(2)}</strong> ({ndvi.statusLocalized[language] || ndvi.status})
          </span>
        </div>

        {/* Editing Mode Instruction Badge */}
        {isEditing && (
          <div className="absolute top-3 right-3 z-20 bg-amber-500/95 text-white backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md text-xs font-bold animate-pulse flex items-center gap-1">
            <span>📍 Tap map or drag pin to relocate</span>
          </div>
        )}

        {/* Coordinates / Map attribution */}
        <div className="absolute bottom-3 left-3 z-20 bg-black/75 text-white text-[11px] px-2.5 py-1 rounded-lg font-mono flex items-center gap-2 backdrop-blur-xs">
          <span>Lat: {lat.toFixed(4)}</span>
          <span>•</span>
          <span>Lng: {lng.toFixed(4)}</span>
        </div>

        <div className="absolute bottom-3 right-3 z-20 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-md font-mono hidden sm:block">
          ESRI / Copernicus Sentinel-2
        </div>
      </div>
    </div>
  );
};

export default FieldMap;
