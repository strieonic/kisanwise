import React, { useState } from 'react';
import { 
  Sprout, 
  MapPin, 
  Edit3, 
  Layers, 
  Calendar, 
  Droplet, 
  Sparkles, 
  CheckCircle,
  HelpCircle,
  Maximize2,
  Crosshair,
  Compass,
  AlertCircle
} from 'lucide-react';
import { Farm } from '../types';
import { Language, translations } from '../i18n';
import { FieldMap } from '../components/FieldMap';
import { EditFarmModal } from '../components/EditFarmModal';
import { detectLocationFromCoords, calculateDynamicNdvi } from '../services/agroGeoEngine';

interface FarmViewProps {
  farm: Farm | null;
  onUpdateFarm: (updated: Partial<Farm>) => Promise<void>;
  language: Language;
}

export const FarmView: React.FC<FarmViewProps> = ({ 
  farm, 
  onUpdateFarm,
  language 
}) => {
  const t = translations[language];
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMapRelocateMode, setIsMapRelocateMode] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const isConfigured = farm?.isConfigured ?? true;
  const lat = farm?.lat || 18.2333;
  const lng = farm?.lng || 76.7167;
  const area = farm?.areaHectares || 3.5;
  const crop = farm?.crop ? farm.crop.charAt(0).toUpperCase() + farm.crop.slice(1) : (isConfigured ? 'Soybean' : 'Not Set');
  const soil = farm?.soilType ? farm.soilType.replace(/_/g, ' ') : (isConfigured ? 'Black' : 'Not Set');
  const irrig = farm?.irrigationType ? farm.irrigationType.replace(/_/g, ' ') : (isConfigured ? 'Rainfed' : 'Not Set');
  const cropKey = (farm?.crop || 'soybean').toLowerCase();
  const soilKey = (farm?.soilType || 'black').toLowerCase();
  const irrigKey = (farm?.irrigationType || 'rainfed').toLowerCase();
  
  // Sowing date defaults to present date unless explicitly edited
  const todayStr = new Date().toISOString().split('T')[0];
  const sowingDate = (farm?.sowingDate && farm.sowingDate !== '2026-06-20') ? farm.sowingDate : todayStr;
  const yieldPerHa = farm?.expectedYieldQPerHa || 19.5;
  const totalHarvest = farm?.totalHarvestQ || Math.round(area * yieldPerHa * 100) / 100;

  // Calculate dynamic agro-ecological NDVI for active location
  const dynamicNdvi = calculateDynamicNdvi(lat, lng, soilKey, irrigKey, cropKey);

  const cropBaseMap: Record<string, number> = {
    paddy: 46.0,
    rice: 46.0,
    chilli: 28.0,
    turmeric: 65.0,
    groundnut: 22.0,
    ragi: 26.0,
    maize: 38.0,
    soybean: 18.0,
    tur: 14.5,
    wheat: 32.0,
    cotton: 22.0,
    onion: 160.0,
    jowar: 24.0,
    gram: 16.5,
    sugarcane: 780.0
  };
  const baseYield = cropBaseMap[cropKey] || 18.0;

  const soilMap: Record<string, string> = {
    clay_paddy: '+15% (Puddled Wetland)',
    red_sandy_loam: 'Optimal (Red Sandy Loam)',
    black: '+10% moisture retention',
    alluvial: '+12% rich silt',
    loamy: '+5% balanced drainage',
    laterite: '-8% high porosity',
    sandy: '-15% rapid leaching'
  };

  const irrigMap: Record<string, string> = {
    flooded_paddy: '+25% wetland submersion',
    tank_irrigation: '+15% rainwater tank feed',
    canal: '+15% surface canal feed',
    drip: '+25% precision fertigation',
    sprinkler: '+15% uniform moisture',
    borewell: '+12% assured groundwater',
    well: '+10% controlled water',
    rainfed: 'Rainfed monsoon baseline'
  };

  // Handle direct map click/drag location change with automatic geo-detection
  const handleMapLocationChange = async (newLat: number, newLng: number) => {
    setIsLocating(true);
    try {
      const geo = await detectLocationFromCoords(newLat, newLng);
      const ndvi = calculateDynamicNdvi(newLat, newLng, geo.suggestedSoil, geo.suggestedIrrigation, geo.suggestedCrop);
      
      // Auto-adapt all farm parameters to the new geographic region
      await onUpdateFarm({
        lat: newLat,
        lng: newLng,
        village: geo.village || 'Local Area',
        district: geo.district,
        state: geo.state,
        crop: geo.suggestedCrop,
        commodity: geo.suggestedCrop,
        soilType: geo.suggestedSoil,
        irrigationType: geo.suggestedIrrigation,
        sowingDate: (farm?.sowingDate && farm.sowingDate !== '2026-06-20') ? farm.sowingDate : todayStr,
        isConfigured: true,
        ndviValue: ndvi.ndvi,
        ndviStatus: ndvi.status
      });
    } catch (err) {
      console.error('Location auto-detection error:', err);
      await onUpdateFarm({
        lat: newLat,
        lng: newLng,
        sowingDate: (farm?.sowingDate && farm.sowingDate !== '2026-06-20') ? farm.sowingDate : todayStr,
        isConfigured: true
      });
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <div className="space-y-4 pb-20 animate-fade-in">
      {/* New User Farm Setup Onboarding Alert if not configured */}
      {!isConfigured && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 text-foreground flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-outfit font-bold text-sm text-amber-900">
                {language === 'mr' ? 'आपली शेती नोंदणी करा' : language === 'hi' ? 'अपने खेत की जानकारी दर्ज करें' : 'Setup Your Farm'}
              </h4>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                {language === 'mr' 
                  ? 'नकाशावर आपला परिसर निवडा किंवा खालील बटण दाबून गाव, जिल्हा, पीक आणि क्षेत्रफळ सेट करा.'
                  : language === 'hi'
                  ? 'नक्शे पर अपना स्थान चुनें या नीचे बटन दबाकर जिला, फसल व जमीन का विवरण दर्ज करें।'
                  : 'Select your farm location on the map or click below to configure your district, crop, and acreage.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-amber-500 text-white font-bold text-xs shrink-0 hover:bg-amber-600 transition-all shadow-xs cursor-pointer"
          >
            {language === 'mr' ? 'माहिती भरा' : language === 'hi' ? 'दर्ज करें' : 'Configure'}
          </button>
        </div>
      )}

      {/* Top Header & Edit Action */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-outfit font-extrabold text-xl text-foreground">
              {farm?.name || (isConfigured ? 'My Farm' : 'New Farm')}
            </h2>
            <button
              onClick={() => setIsEditModalOpen(true)}
              aria-label="Edit farm details"
              className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all cursor-pointer"
              title="Edit Farm Area, Soil, Irrigation & Crop"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate">
              {farm?.village ? `${farm.village}, ` : ''}{farm?.district ? `${farm.district}, ` : ''}{farm?.state || 'Select Location'}
            </span>
            {isLocating && (
              <span className="text-[10px] text-amber-600 font-semibold animate-pulse ml-1">
                (Updating region...)
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className="px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold">
            {crop} {crop !== 'Not Set' ? '(Kharif)' : ''}
          </span>
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Edit Parameters</span>
            <Edit3 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Map Relocation Mode Toggle Banner */}
      <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-muted/40 border border-border text-xs">
        <span className="text-muted-foreground flex items-center gap-1.5">
          <Crosshair className="w-3.5 h-3.5 text-primary" />
          <span>Interactive Map Area Picker</span>
        </span>
        <button
          onClick={() => setIsMapRelocateMode(!isMapRelocateMode)}
          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            isMapRelocateMode
              ? 'bg-amber-500 text-white shadow-xs'
              : 'bg-card border border-border text-foreground hover:bg-muted'
          }`}
        >
          {isMapRelocateMode ? 'Done Relocating' : 'Relocate on Map'}
        </button>
      </div>

      {/* Satellite Parcel Map with Location Search & Auto-Detection */}
      <FieldMap
        lat={lat}
        lng={lng}
        areaHectares={area}
        cropName={crop}
        isEditing={isMapRelocateMode}
        onLocationChange={handleMapLocationChange}
      />

      {/* Editable Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Farm Area */}
        <button 
          type="button"
          onClick={() => setIsEditModalOpen(true)}
          className="text-left w-full p-3.5 rounded-2xl bg-card border border-border shadow-xs hover:border-primary/50 transition-all cursor-pointer group focus-visible:ring-2 focus-visible:ring-primary"
        >
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold">{t.farm.area}</span>
            <Edit3 className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <p className="text-base font-extrabold font-outfit text-foreground tabular-nums">
            {area > 0 ? `${area} ha` : '-- ha'}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {area > 0 ? `(${(area * 2.47).toFixed(1)} acres)` : 'Set farm size'}
          </p>
        </button>

        {/* Soil Type */}
        <button 
          type="button"
          onClick={() => setIsEditModalOpen(true)}
          className="text-left w-full p-3.5 rounded-2xl bg-card border border-border shadow-xs hover:border-primary/50 transition-all cursor-pointer group focus-visible:ring-2 focus-visible:ring-primary"
        >
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold">{t.farm.soilType}</span>
            <Edit3 className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <p className="text-base font-extrabold font-outfit text-foreground capitalize truncate">
            {soil}
          </p>
          <p className="text-[10px] text-emerald-700 font-semibold mt-0.5 truncate">
            {soilMap[soilKey] || 'Optimal Soil'}
          </p>
        </button>

        {/* Irrigation */}
        <button 
          type="button"
          onClick={() => setIsEditModalOpen(true)}
          className="text-left w-full p-3.5 rounded-2xl bg-card border border-border shadow-xs hover:border-primary/50 transition-all cursor-pointer group focus-visible:ring-2 focus-visible:ring-primary"
        >
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold">{t.farm.irrigation}</span>
            <Edit3 className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <p className="text-base font-extrabold font-outfit text-foreground capitalize truncate">
            {irrig}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
            {irrigMap[irrigKey] || 'Standard'}
          </p>
        </button>

        {/* Sowing Date */}
        <button 
          type="button"
          onClick={() => setIsEditModalOpen(true)}
          className="text-left w-full p-3.5 rounded-2xl bg-card border border-border shadow-xs hover:border-primary/50 transition-all cursor-pointer group focus-visible:ring-2 focus-visible:ring-primary"
        >
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold">{t.farm.sowingDate}</span>
            <Edit3 className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <p className="text-sm font-extrabold font-outfit text-foreground tabular-nums truncate">
            {sowingDate}
          </p>
          <p className="text-[10px] text-primary font-semibold mt-0.5">
            Active Kharif cycle
          </p>
        </button>
      </div>

      {/* Satellite Dynamic NDVI Vigor Card */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <Sprout className="w-4 h-4" />
            </div>
            <h3 className="font-outfit font-bold text-sm text-foreground">
              {t.farm.cropHealth}
            </h3>
          </div>
          <span className="text-xs font-semibold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
            {dynamicNdvi.healthyPercent}% {t.farm.healthyZones}
          </span>
        </div>

        {/* Progress Bar for Dynamic NDVI Spectrum */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-muted-foreground">Sentinel-2 Normalized Difference Index</span>
            <span className="text-emerald-700 font-bold tabular-nums">
              {dynamicNdvi.ndvi.toFixed(2)} NDVI ({dynamicNdvi.status})
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-muted overflow-hidden flex">
            <div 
              style={{ width: `${dynamicNdvi.stressedPercent}%` }} 
              className="bg-rose-400 h-full transition-all duration-500" 
              title={`Stress zone: ${dynamicNdvi.stressedPercent}%`} 
            />
            <div 
              style={{ width: `${dynamicNdvi.moderatePercent}%` }} 
              className="bg-amber-400 h-full transition-all duration-500" 
              title={`Moderate canopy: ${dynamicNdvi.moderatePercent}%`} 
            />
            <div 
              style={{ width: `${dynamicNdvi.healthyPercent}%` }} 
              className="bg-emerald-500 h-full transition-all duration-500" 
              title={`Dense healthy canopy: ${dynamicNdvi.healthyPercent}%`} 
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Stressed (0.2)</span>
            <span>Moderate (0.5)</span>
            <span className="font-semibold text-emerald-700">Optimal Canopy (0.8+)</span>
          </div>
        </div>
      </div>

      {/* Dynamic Agronomic Yield Calculation Box */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-outfit font-bold text-sm text-foreground flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-accent" />
            <span>Dynamic Yield Model as per Edits</span>
          </h3>
          <span className="text-base font-extrabold font-outfit text-primary tabular-nums">
            {yieldPerHa} qtl / ha
          </span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40">
            <span className="text-foreground">{crop} Baseline Rainfed Yield</span>
            <span className="font-semibold tabular-nums text-foreground">{baseYield} qtl/ha</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 text-emerald-800">
            <span>Soil Effect ({farm?.soilType || 'Soil'})</span>
            <span className="font-semibold tabular-nums">
              {soilMap[soilKey] || 'Baseline Soil'}
            </span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 text-emerald-800">
            <span>Irrigation Facility ({farm?.irrigationType || 'Irrigation'})</span>
            <span className="font-semibold tabular-nums">
              {irrigMap[irrigKey] || 'Baseline Supply'}
            </span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold">
            <span>Total Harvest Projection ({area} ha × {yieldPerHa} qtl/ha)</span>
            <span className="text-sm font-extrabold tabular-nums">
              {totalHarvest} Quintals
            </span>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {farm && (
        <EditFarmModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          farm={farm}
          onSave={onUpdateFarm}
          language={language}
        />
      )}
    </div>
  );
};
