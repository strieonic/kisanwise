import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  MapPin, 
  Layers, 
  Droplets, 
  Calendar, 
  Sparkles, 
  Check, 
  Sprout,
  Compass,
  Search,
  ArrowRight
} from 'lucide-react';
import { Farm } from '../types';
import { Language, translations } from '../i18n';
import { searchPlaces, LocationDetectionResult } from '../services/agroGeoEngine';

interface EditFarmModalProps {
  isOpen: boolean;
  onClose: () => void;
  farm: Farm;
  onSave: (updated: Partial<Farm>) => Promise<void>;
  language: Language;
}

// 1. Language-Consistent Region Presets
const REGION_PRESETS: Record<Language, Array<{
  id: string;
  label: string;
  state: string;
  district: string;
  village: string;
  crop: string;
  soilType: string;
  irrigationType: string;
  lat: number;
  lng: number;
}>> = {
  en: [
    { id: 'tamilnadu', label: 'Tamil Nadu (Paddy / Thanjavur)', state: 'Tamil Nadu', district: 'Thanjavur', village: 'Kumbakonam', crop: 'paddy', soilType: 'clay_paddy', irrigationType: 'flooded_paddy', lat: 10.7870, lng: 79.1378 },
    { id: 'andhra', label: 'Andhra Pradesh (Chilli / Guntur)', state: 'Andhra Pradesh', district: 'Guntur', village: 'Tenali', crop: 'chilli', soilType: 'red_sandy_loam', irrigationType: 'drip', lat: 16.3067, lng: 80.4365 },
    { id: 'telangana', label: 'Telangana (Warangal / Turmeric)', state: 'Telangana', district: 'Warangal', village: 'Hanamkonda', crop: 'paddy', soilType: 'clay_paddy', irrigationType: 'canal', lat: 17.9689, lng: 79.5941 },
    { id: 'karnataka', label: 'Karnataka (Ragi & Paddy / Shimoga)', state: 'Karnataka', district: 'Shivamogga', village: 'Bhadravati', crop: 'ragi', soilType: 'red_sandy_loam', irrigationType: 'tank_irrigation', lat: 13.9299, lng: 75.5681 },
    { id: 'maharashtra_latur', label: 'Maharashtra (Soybean / Latur)', state: 'Maharashtra', district: 'Latur', village: 'Ausa', crop: 'soybean', soilType: 'black', irrigationType: 'rainfed', lat: 18.2333, lng: 76.7167 },
    { id: 'maharashtra_satara', label: 'Maharashtra (Sugarcane / Satara)', state: 'Maharashtra', district: 'Satara', village: 'Karad', crop: 'sugarcane', soilType: 'red_sandy_loam', irrigationType: 'drip', lat: 17.6805, lng: 74.0183 },
    { id: 'north_plains', label: 'North India (Wheat / Punjab)', state: 'Punjab', district: 'Ludhiana', village: 'Khanna', crop: 'wheat', soilType: 'alluvial', irrigationType: 'canal', lat: 30.7071, lng: 76.2168 }
  ],
  mr: [
    { id: 'maharashtra_latur', label: 'महाराष्ट्र (लातूर / सोयाबीन)', state: 'महाराष्ट्र', district: 'लातूर', village: 'औसा', crop: 'soybean', soilType: 'black', irrigationType: 'rainfed', lat: 18.2333, lng: 76.7167 },
    { id: 'maharashtra_satara', label: 'महाराष्ट्र (सातारा / ऊस)', state: 'महाराष्ट्र', district: 'सातारा', village: 'कराड', crop: 'sugarcane', soilType: 'red_sandy_loam', irrigationType: 'drip', lat: 17.6805, lng: 74.0183 },
    { id: 'maharashtra_nashik', label: 'महाराष्ट्र (नाशिक / कांदा)', state: 'महाराष्ट्र', district: 'नाशिक', village: 'निफाड', crop: 'onion', soilType: 'black', irrigationType: 'drip', lat: 20.0798, lng: 74.1105 },
    { id: 'tamilnadu', label: 'तमिळनाडू (तंजावर / भातशेती)', state: 'तमिळनाडू', district: 'तंजावर', village: 'कुंभकोणम', crop: 'paddy', soilType: 'clay_paddy', irrigationType: 'flooded_paddy', lat: 10.7870, lng: 79.1378 },
    { id: 'andhra', label: 'आंध्र प्रदेश (गुंटूर / मिरची)', state: 'आंध्र प्रदेश', district: 'गुंटूर', village: 'तेनाली', crop: 'chilli', soilType: 'red_sandy_loam', irrigationType: 'drip', lat: 16.3067, lng: 80.4365 },
    { id: 'karnataka', label: 'कर्नाटक (शिमोगा / नाचणी)', state: 'कर्नाटक', district: 'शिमोगा', village: 'भद्रावती', crop: 'ragi', soilType: 'red_sandy_loam', irrigationType: 'tank_irrigation', lat: 13.9299, lng: 75.5681 },
    { id: 'north_plains', label: 'उत्तर भारत (पंजाब / गहू)', state: 'पंजाब', district: 'लुधियाना', village: 'खन्ना', crop: 'wheat', soilType: 'alluvial', irrigationType: 'canal', lat: 30.7071, lng: 76.2168 }
  ],
  hi: [
    { id: 'maharashtra_latur', label: 'महाराष्ट्र (लातूर / सोयाबीन)', state: 'महाराष्ट्र', district: 'लातूर', village: 'औसा', crop: 'soybean', soilType: 'black', irrigationType: 'rainfed', lat: 18.2333, lng: 76.7167 },
    { id: 'maharashtra_satara', label: 'महाराष्ट्र (सतारा / गन्ना)', state: 'महाराष्ट्र', district: 'सतारा', village: 'कराड', crop: 'sugarcane', soilType: 'red_sandy_loam', irrigationType: 'drip', lat: 17.6805, lng: 74.0183 },
    { id: 'tamilnadu', label: 'तमिलनाडु (तंजावुर / धान)', state: 'तमिलनाडु', district: 'तंजावुर', village: 'कुंभकोणम', crop: 'paddy', soilType: 'clay_paddy', irrigationType: 'flooded_paddy', lat: 10.7870, lng: 79.1378 },
    { id: 'andhra', label: 'आंध्र प्रदेश (गुंटूर / मिर्च)', state: 'आंध्र प्रदेश', district: 'गुंटूर', village: 'तेनाली', crop: 'chilli', soilType: 'red_sandy_loam', irrigationType: 'drip', lat: 16.3067, lng: 80.4365 },
    { id: 'karnataka', label: 'कर्नाटक (शिमोगा / रागी)', state: 'कर्नाटक', district: 'शिमोगा', village: 'भद्रावती', crop: 'ragi', soilType: 'red_sandy_loam', irrigationType: 'tank_irrigation', lat: 13.9299, lng: 75.5681 },
    { id: 'north_plains', label: 'उत्तर भारत (पंजाब / गेहूं)', state: 'पंजाब', district: 'लुधियाना', village: 'खन्ना', crop: 'wheat', soilType: 'alluvial', irrigationType: 'canal', lat: 30.7071, lng: 76.2168 }
  ]
};

// 2. Language-Consistent Crop Definitions
const CROPS_BY_LANG: Record<Language, Array<{ id: string; label: string; baseYield: number }>> = {
  en: [
    { id: 'soybean', label: 'Soybean', baseYield: 18.0 },
    { id: 'paddy', label: 'Paddy / Rice', baseYield: 46.0 },
    { id: 'cotton', label: 'Cotton', baseYield: 22.0 },
    { id: 'chilli', label: 'Chilli', baseYield: 28.0 },
    { id: 'turmeric', label: 'Turmeric', baseYield: 65.0 },
    { id: 'groundnut', label: 'Groundnut / Peanut', baseYield: 22.0 },
    { id: 'ragi', label: 'Finger Millet / Ragi', baseYield: 26.0 },
    { id: 'tur', label: 'Tur / Pigeon Pea', baseYield: 14.5 },
    { id: 'wheat', label: 'Wheat', baseYield: 32.0 },
    { id: 'onion', label: 'Onion', baseYield: 160.0 },
    { id: 'maize', label: 'Maize / Corn', baseYield: 38.0 },
    { id: 'sugarcane', label: 'Sugarcane', baseYield: 780.0 },
    { id: 'jowar', label: 'Sorghum / Jowar', baseYield: 24.0 },
    { id: 'gram', label: 'Bengal Gram / Chana', baseYield: 16.5 }
  ],
  mr: [
    { id: 'soybean', label: 'सोयाबीन', baseYield: 18.0 },
    { id: 'paddy', label: 'भात / धान', baseYield: 46.0 },
    { id: 'cotton', label: 'कापूस', baseYield: 22.0 },
    { id: 'chilli', label: 'मिरची', baseYield: 28.0 },
    { id: 'turmeric', label: 'हळद', baseYield: 65.0 },
    { id: 'groundnut', label: 'भुईमूग', baseYield: 22.0 },
    { id: 'ragi', label: 'नाचणी', baseYield: 26.0 },
    { id: 'tur', label: 'तूर / अरहर', baseYield: 14.5 },
    { id: 'wheat', label: 'गहू', baseYield: 32.0 },
    { id: 'onion', label: 'कांदा', baseYield: 160.0 },
    { id: 'maize', label: 'मका', baseYield: 38.0 },
    { id: 'sugarcane', label: 'ऊस', baseYield: 780.0 },
    { id: 'jowar', label: 'ज्वारी', baseYield: 24.0 },
    { id: 'gram', label: 'हरभरा / चणा', baseYield: 16.5 }
  ],
  hi: [
    { id: 'soybean', label: 'सोयाबीन', baseYield: 18.0 },
    { id: 'paddy', label: 'धान / चावल', baseYield: 46.0 },
    { id: 'cotton', label: 'कपास', baseYield: 22.0 },
    { id: 'chilli', label: 'मिर्च', baseYield: 28.0 },
    { id: 'turmeric', label: 'हल्दी', baseYield: 65.0 },
    { id: 'groundnut', label: 'मूंगफली', baseYield: 22.0 },
    { id: 'ragi', label: 'रागी / मडुआ', baseYield: 26.0 },
    { id: 'tur', label: 'अरहर / तुअर', baseYield: 14.5 },
    { id: 'wheat', label: 'गेहूं', baseYield: 32.0 },
    { id: 'onion', label: 'प्याज', baseYield: 160.0 },
    { id: 'maize', label: 'मक्का', baseYield: 38.0 },
    { id: 'sugarcane', label: 'गन्ना', baseYield: 780.0 },
    { id: 'jowar', label: 'ज्वार', baseYield: 24.0 },
    { id: 'gram', label: 'चना', baseYield: 16.5 }
  ]
};

// 3. Language-Consistent Soil Types
const SOILS_BY_LANG: Record<Language, Array<{ id: string; label: string; mult: number; desc: string }>> = {
  en: [
    { id: 'black', label: 'Black Cotton Soil', mult: 1.10, desc: '+10% moisture retention' },
    { id: 'alluvial', label: 'Alluvial Loam', mult: 1.12, desc: '+12% high natural fertility' },
    { id: 'clay_paddy', label: 'Wetland Clay', mult: 1.15, desc: 'Puddled deltaic soil for paddy (+15%)' },
    { id: 'red_sandy_loam', label: 'Red Sandy Loam', mult: 0.98, desc: 'Optimal for groundnut, chilli & millets' },
    { id: 'loamy', label: 'Medium Loam', mult: 1.05, desc: '+5% balanced soil drainage' },
    { id: 'laterite', label: 'Laterite Soil', mult: 0.92, desc: '-8% high leaching porous soil' },
    { id: 'sandy', label: 'Sandy Soil', mult: 0.85, desc: '-15% rapid water drainage' }
  ],
  mr: [
    { id: 'black', label: 'काळी रेगूर माती', mult: 1.10, desc: '+१०% उत्तम ओलावा टिकवून ठेवणारी' },
    { id: 'alluvial', label: 'गाळाची सुपीक माती', mult: 1.12, desc: '+१२% उच्च नैसर्गिक सुपिकता' },
    { id: 'clay_paddy', label: 'भातशेती चिकणमाती', mult: 1.15, desc: '+१५% भातखाचरासाठी उत्तम' },
    { id: 'red_sandy_loam', label: 'तांबडी वालुकामय माती', mult: 0.98, desc: 'भुईमूग, नाचणी व मिरचीसाठी उत्तम' },
    { id: 'loamy', label: 'मध्यम पोयटा माती', mult: 1.05, desc: '+५% संतुलित पाण्याचा निचरा' },
    { id: 'laterite', label: 'जांभी तांबडी माती', mult: 0.92, desc: '-८% जास्त पाण्याचा निचरा' },
    { id: 'sandy', label: 'वालुकामय हलकी माती', mult: 0.85, desc: '-१५% कमी ओलावा क्षमता' }
  ],
  hi: [
    { id: 'black', label: 'काली रेगुर मिट्टी', mult: 1.10, desc: '+१०% उच्च नमी संधारण' },
    { id: 'alluvial', label: 'जलोढ़ दोमट मिट्टी', mult: 1.12, desc: '+१२% उच्च उर्वरता' },
    { id: 'clay_paddy', label: 'कछारी चिकनी मिट्टी', mult: 1.15, desc: '+१५% धान के लिए जलभराव उपयुक्त' },
    { id: 'red_sandy_loam', label: 'लाल बलुई दोमट', mult: 0.98, desc: 'मूंगफली, रागी व मिर्च के लिए उपयुक्त' },
    { id: 'loamy', label: 'मध्यम दोमट मिट्टी', mult: 1.05, desc: '+५% संतुलित जल निकास' },
    { id: 'laterite', label: 'लैटेराइट लाल मिट्टी', mult: 0.92, desc: '-८% अधिक निक्षालन वाली' },
    { id: 'sandy', label: 'रेतीली हल्की मिट्टी', mult: 0.85, desc: '-१५% कम नमी रुकने वाली' }
  ]
};

// 4. Language-Consistent Irrigation Methods
const IRRIGATIONS_BY_LANG: Record<Language, Array<{ id: string; label: string; mult: number; desc: string }>> = {
  en: [
    { id: 'rainfed', label: 'Rainfed (Monsoon)', mult: 1.00, desc: 'Dependent on seasonal rains' },
    { id: 'drip', label: 'Drip Irrigation', mult: 1.25, desc: '+25% precision water & nutrients' },
    { id: 'sprinkler', label: 'Sprinkler Irrigation', mult: 1.15, desc: '+15% uniform canopy spray' },
    { id: 'flooded_paddy', label: 'Paddy Submersion', mult: 1.25, desc: '+25% continuous wetland water' },
    { id: 'tank_irrigation', label: 'Tank / Lake Feed', mult: 1.15, desc: '+15% local storage tank water' },
    { id: 'canal', label: 'Canal Flow', mult: 1.15, desc: '+15% river canal network' },
    { id: 'borewell', label: 'Borewell / Tube Well', mult: 1.12, desc: '+12% assured groundwater' }
  ],
  mr: [
    { id: 'rainfed', label: 'जिरायती (पावसावर)', mult: 1.00, desc: '१००% मान्सून पावसावर आधारित' },
    { id: 'drip', label: 'ठिबक सिंचन', mult: 1.25, desc: '+२५% थेट मुळाशी पाणी व खत' },
    { id: 'sprinkler', label: 'तुषार सिंचन', mult: 1.15, desc: '+१५% समप्रमाणात फवारा' },
    { id: 'flooded_paddy', label: 'भातखाचर पाणी साचवणे', mult: 1.25, desc: '+२५% खाचरात सतत पाणी' },
    { id: 'tank_irrigation', label: 'तलाव / पाझर तलाव', mult: 1.15, desc: '+१५% साठवण तलावाचे पाणी' },
    { id: 'canal', label: 'पाटपाणी / कालवा', mult: 1.15, desc: '+१५% धरणाचे कालवा पाणी' },
    { id: 'borewell', label: 'विहीर / बोअरवेल', mult: 1.12, desc: '+१२% खात्रीशीर भूजल पुरवठा' }
  ],
  hi: [
    { id: 'rainfed', label: 'वर्षा आधारित (बारानी)', mult: 1.00, desc: 'मानसूनी बारिश पर निर्भर' },
    { id: 'drip', label: 'टपक (ड्रिप) सिंचाई', mult: 1.25, desc: '+२५% सटीक जल एवं पोषक तत्व' },
    { id: 'sprinkler', label: 'फव्वारा (स्प्रिंकलर)', mult: 1.15, desc: '+१५% एकसमान नमी' },
    { id: 'flooded_paddy', label: 'धान खेत जलभराव', mult: 1.25, desc: '+२५% धान के लिए निरंतर पानी' },
    { id: 'tank_irrigation', label: 'तालाब / जलाशय', mult: 1.15, desc: '+१५% संचित वर्षा जल' },
    { id: 'canal', label: 'नहर / नाली सिंचाई', mult: 1.15, desc: '+१५% नहर से जलापूर्ति' },
    { id: 'borewell', label: 'नलकूप / कुआं', mult: 1.12, desc: '+१२% नियंत्रित भूजल' }
  ]
};

export const EditFarmModal: React.FC<EditFarmModalProps> = ({
  isOpen,
  onClose,
  farm,
  onSave,
  language
}) => {
  const crops = CROPS_BY_LANG[language] || CROPS_BY_LANG.en;
  const soils = SOILS_BY_LANG[language] || SOILS_BY_LANG.en;
  const irrigations = IRRIGATIONS_BY_LANG[language] || IRRIGATIONS_BY_LANG.en;
  const presets = REGION_PRESETS[language] || REGION_PRESETS.en;

  // New user vs configured farm check
  const isNewlyCreated = farm.isConfigured === false || (!farm.crop && !farm.district);

  const [name, setName] = useState(farm.name || '');
  const [stateName, setStateName] = useState(farm.state || '');
  const [district, setDistrict] = useState(farm.district || '');
  const [village, setVillage] = useState(farm.village || '');
  const [crop, setCrop] = useState(farm.crop || (isNewlyCreated ? '' : 'soybean'));
  const [areaHectares, setAreaHectares] = useState<number>(farm.areaHectares || 1.0);
  const [soilType, setSoilType] = useState(farm.soilType || (isNewlyCreated ? '' : 'black'));
  const [irrigationType, setIrrigationType] = useState(farm.irrigationType || (isNewlyCreated ? '' : 'rainfed'));
  const [sowingDate, setSowingDate] = useState(farm.sowingDate || new Date().toISOString().split('T')[0]);
  const [lat, setLat] = useState<number>(farm.lat || 18.2333);
  const [lng, setLng] = useState<number>(farm.lng || 76.7167);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search places in modal
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [modalSearchResults, setModalSearchResults] = useState<LocationDetectionResult[]>([]);
  const [showSearchDrop, setShowSearchDrop] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const isNew = farm.isConfigured === false || (!farm.crop && !farm.district);
      setName(farm.name || (language === 'mr' ? 'माझे शेत' : language === 'hi' ? 'मेरा खेत' : 'My Farm'));
      setStateName(farm.state || '');
      setDistrict(farm.district || '');
      setVillage(farm.village || '');
      setCrop(farm.crop || (isNew ? 'soybean' : 'soybean'));
      setAreaHectares(farm.areaHectares > 0 ? farm.areaHectares : 1.0);
      setSoilType(farm.soilType || (isNew ? 'black' : 'black'));
      setIrrigationType(farm.irrigationType || (isNew ? 'rainfed' : 'rainfed'));
      setSowingDate(farm.sowingDate || new Date().toISOString().split('T')[0]);
      setLat(farm.lat || 18.2333);
      setLng(farm.lng || 76.7167);
    }
  }, [isOpen, farm, language]);

  // Modal Place Search Debounce
  useEffect(() => {
    if (!modalSearchQuery.trim() || modalSearchQuery.length < 2) {
      setModalSearchResults([]);
      setShowSearchDrop(false);
      return;
    }

    const timer = setTimeout(async () => {
      const results = await searchPlaces(modalSearchQuery);
      setModalSearchResults(results);
      setShowSearchDrop(true);
    }, 280);

    return () => clearTimeout(timer);
  }, [modalSearchQuery]);

  if (!isOpen) return null;

  // Selected entities for yield calculation
  const selectedCrop = crops.find(c => c.id === crop) || crops[0];
  const selectedSoil = soils.find(s => s.id === soilType) || soils[0];
  const selectedIrrig = irrigations.find(i => i.id === irrigationType) || irrigations[0];

  const safeArea = Math.max(0.1, Number(areaHectares) || 0.1);
  const projectedYield = Math.round(selectedCrop.baseYield * selectedSoil.mult * selectedIrrig.mult * 10) / 10;
  const projectedTotalHarvest = Math.round(safeArea * projectedYield * 100) / 100;
  const acres = Math.round(safeArea * 2.471 * 10) / 10;

  const applyPreset = (preset: typeof presets[0]) => {
    setStateName(preset.state);
    setDistrict(preset.district);
    setVillage(preset.village);
    setCrop(preset.crop);
    setSoilType(preset.soilType);
    setIrrigationType(preset.irrigationType);
    setLat(preset.lat);
    setLng(preset.lng);
  };

  const handleSelectModalPlace = (place: LocationDetectionResult) => {
    setVillage(place.village);
    setDistrict(place.district);
    setStateName(place.state);
    setLat(place.lat);
    setLng(place.lng);
    if (!crop || crop === 'soybean') setCrop(place.suggestedCrop);
    if (!soilType || soilType === 'black') setSoilType(place.suggestedSoil);
    setShowSearchDrop(false);
    setModalSearchQuery(place.displayName);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave({
        name: name.trim() || (language === 'mr' ? 'माझे शेत' : 'My Farm'),
        state: stateName.trim() || 'Maharashtra',
        district: district.trim() || 'Latur',
        village: village.trim() || district.trim() || 'Ausa',
        crop: crop || 'soybean',
        commodity: crop || 'soybean',
        areaHectares: safeArea,
        soilType: soilType || 'black',
        irrigationType: irrigationType || 'rainfed',
        sowingDate,
        lat,
        lng,
        expectedYieldQPerHa: projectedYield,
        totalHarvestQ: projectedTotalHarvest,
        isConfigured: true
      });
      onClose();
    } catch (err) {
      console.error('Failed to save farm edits:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in">
      <div 
        className="w-full max-w-lg bg-card rounded-3xl border border-border shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-farm-title"
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              🌱
            </div>
            <div>
              <h2 id="edit-farm-title" className="font-outfit font-bold text-base text-foreground leading-tight">
                {language === 'mr' ? 'शेत व पिकाची माहिती नोंदवा' : language === 'hi' ? 'खेत और फसल की जानकारी दर्ज करें' : 'Farm & Crop Parameters'}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {language === 'mr' 
                  ? 'स्थान, माती, पाणीपुरवठा व क्षेत्रानुसार अचूक उत्पन्न व बाजारभाव मिळवा'
                  : language === 'hi'
                  ? 'स्थान, मिट्टी, सिंचाई और रकबे के अनुसार सटीक उपज और मंडी भाव पाएं'
                  : 'Location, soil, irrigation and area dynamically drive your yield and mandi rates'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 text-muted-foreground hover:text-foreground rounded-xl cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1 overscroll-contain">
          
          {/* Quick Regional Presets */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-primary" />
              <span>
                {language === 'mr' ? 'त्वरित कृषी विभाग निवडा' : language === 'hi' ? 'त्वरित कृषि क्षेत्र चुनें' : 'Quick Regional Presets'}
              </span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {presets.map((p) => {
                const isActive = district === p.district;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className={`px-2.5 py-1.5 rounded-xl text-left border text-[11px] transition-all cursor-pointer truncate ${
                      isActive
                        ? 'bg-primary text-white border-primary font-bold shadow-xs'
                        : 'bg-card border-border text-foreground hover:bg-muted'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Place Search in Modal */}
          <div className="relative">
            <label className="text-xs font-semibold text-foreground block mb-1">
              {language === 'mr' ? 'गाव किंवा जिल्हा शोधा' : language === 'hi' ? 'गांव या जिला खोजें' : 'Search Place to Auto-Fill'}
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={modalSearchQuery}
                onChange={(e) => setModalSearchQuery(e.target.value)}
                onFocus={() => modalSearchResults.length > 0 && setShowSearchDrop(true)}
                placeholder={
                  language === 'mr'
                    ? 'उदा. सातारा, नाशिक, लातूर, गुंटूर, तंजावर...'
                    : language === 'hi'
                    ? 'उदा. सतारा, नासिक, लातूर, गुंटूर, तंजावुर...'
                    : 'Search place (e.g. Satara, Nashik, Guntur, Thanjavur)...'
                }
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-card text-foreground text-xs sm:text-sm outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Dropdown */}
            {showSearchDrop && modalSearchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card rounded-2xl border border-border shadow-xl overflow-hidden max-h-48 overflow-y-auto z-40 animate-fade-in">
                {modalSearchResults.map((place, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectModalPlace(place)}
                    className="w-full text-left px-3 py-2 hover:bg-muted/60 transition-colors border-b border-border/40 last:border-none flex items-center gap-2 text-xs cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="font-semibold text-foreground truncate">{place.displayName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Farm Basic Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                {language === 'mr' ? 'शेताचे नाव' : language === 'hi' ? 'खेत का नाम' : 'Farm Name'}
              </label>
              <input
                type="text"
                required
                value={name}
                placeholder={language === 'mr' ? 'उदा. पाटील शेत' : language === 'hi' ? 'उदा. पटेल फार्म' : 'e.g. Green Acres'}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-card text-foreground text-xs sm:text-sm outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                {language === 'mr' ? 'राज्य' : language === 'hi' ? 'राज्य' : 'State'}
              </label>
              <input
                type="text"
                required
                placeholder={language === 'mr' ? 'उदा. महाराष्ट्र' : language === 'hi' ? 'उदा. महाराष्ट्र' : 'State (e.g. Maharashtra)'}
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-card text-foreground text-xs sm:text-sm outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                {language === 'mr' ? 'जिल्हा' : language === 'hi' ? 'जिला' : 'District'}
              </label>
              <input
                type="text"
                required
                placeholder={language === 'mr' ? 'उदा. सातारा' : language === 'hi' ? 'उदा. सतारा' : 'District (e.g. Satara)'}
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-card text-foreground text-xs sm:text-sm outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                {language === 'mr' ? 'गाव / तालुका' : language === 'hi' ? 'गांव / तहसील' : 'Village / Town'}
              </label>
              <input
                type="text"
                required
                placeholder={language === 'mr' ? 'गाव' : language === 'hi' ? 'गांव' : 'Village'}
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-card text-foreground text-xs sm:text-sm outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          {/* Active Crop Selection */}
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5 flex items-center justify-between">
              <span>{language === 'mr' ? 'लागवड केलेले पीक' : language === 'hi' ? 'बोई गई फसल' : 'Active Crop'}</span>
              <span className="text-[11px] text-primary font-bold">Base: {selectedCrop.baseYield} qtl/ha</span>
            </label>
            <select
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-card text-foreground text-xs sm:text-sm outline-none focus:border-primary transition-colors font-medium cursor-pointer"
            >
              {crops.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Farm Area (Hectares + Acres) */}
          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">
                {language === 'mr' ? 'शेत क्षेत्र (हेक्टर व एकर)' : language === 'hi' ? 'खेत का रकबा (हेक्टेयर व एकड़)' : 'Farm Area (Hectares & Acres)'}
              </label>
              <span className="text-xs font-bold font-outfit text-primary tabular-nums">
                {areaHectares} ha = {acres} ac
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0.1"
                max="50"
                step="0.1"
                required
                value={areaHectares === 0 ? '' : areaHectares}
                onChange={(e) => setAreaHectares(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                className="w-28 px-3 py-2 rounded-xl border border-border bg-card text-foreground text-sm font-bold text-center outline-none focus:border-primary"
              />
              <input
                type="range"
                min="0.5"
                max="15"
                step="0.1"
                value={areaHectares}
                onChange={(e) => setAreaHectares(parseFloat(e.target.value))}
                className="flex-1 accent-primary h-2 bg-muted rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Soil Type Selector */}
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">
              {language === 'mr' ? 'मातीचा प्रकार' : language === 'hi' ? 'मिट्टी का प्रकार' : 'Soil Type'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {soils.map((s) => {
                const isSelected = soilType === s.id;
                return (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => setSoilType(s.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs'
                        : 'bg-card border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <p className="text-xs">{s.label}</p>
                    <span className="text-[10px] text-muted-foreground block font-normal mt-0.5">
                      {s.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Irrigation Method Selector */}
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">
              {language === 'mr' ? 'पाणीपुरवठा पद्धत' : language === 'hi' ? 'सिंचाई की सुविधा' : 'Irrigation Facility'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {irrigations.map((i) => {
                const isSelected = irrigationType === i.id;
                return (
                  <button
                    type="button"
                    key={i.id}
                    onClick={() => setIrrigationType(i.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs'
                        : 'bg-card border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <p className="text-xs">{i.label}</p>
                    <span className="text-[10px] text-muted-foreground block font-normal mt-0.5">
                      {i.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sowing Date Picker & Coordinates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                {language === 'mr' ? 'पेरणी तारीख' : language === 'hi' ? 'बुवाई की तारीख' : 'Sowing Date'}
              </label>
              <input
                type="date"
                required
                value={sowingDate}
                onChange={(e) => setSowingDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-card text-foreground text-xs sm:text-sm outline-none focus:border-primary transition-colors font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                {language === 'mr' ? 'नकाशा अक्षांश / रेखांश' : language === 'hi' ? 'मानचित्र अक्षांश / देशांतर' : 'Map Latitude / Longitude'}
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.0001"
                  value={lat}
                  onChange={(e) => setLat(parseFloat(e.target.value) || 18.2333)}
                  className="w-1/2 px-2.5 py-2 rounded-xl border border-border bg-card text-foreground text-xs outline-none focus:border-primary font-mono"
                  placeholder="Lat"
                />
                <input
                  type="number"
                  step="0.0001"
                  value={lng}
                  onChange={(e) => setLng(parseFloat(e.target.value) || 76.7167)}
                  className="w-1/2 px-2.5 py-2 rounded-xl border border-border bg-card text-foreground text-xs outline-none focus:border-primary font-mono"
                  placeholder="Lng"
                />
              </div>
            </div>
          </div>

          {/* Dynamic Real-Time Output Preview */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 space-y-2">
            <div className="flex items-center gap-1.5 text-primary text-xs font-bold">
              <Sparkles className="w-4 h-4 text-accent" />
              <span>
                {language === 'mr' ? 'नोंदीनुसार थेट उत्पादन अंदाज:' : language === 'hi' ? 'दर्ज विवरण के अनुसार अनुमानित उत्पादन:' : 'Dynamic Projection as per Edits:'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-xl bg-card border border-border/80">
                <span className="text-[10px] text-muted-foreground block">
                  {language === 'mr' ? 'अंदाजित एकरी/हेक्टरी उत्पादन' : language === 'hi' ? 'प्रति हेक्टेयर उपज' : 'Projected Yield / Ha'}
                </span>
                <span className="text-sm font-extrabold font-outfit text-foreground tabular-nums">
                  {projectedYield} qtl/ha
                </span>
              </div>
              <div className="p-2 rounded-xl bg-card border border-border/80">
                <span className="text-[10px] text-muted-foreground block">
                  {language === 'mr' ? 'एकूण पीक उत्पादन' : language === 'hi' ? 'कुल फसल उत्पादन' : 'Total Harvest Volume'}
                </span>
                <span className="text-sm font-extrabold font-outfit text-primary tabular-nums">
                  {projectedTotalHarvest} quintals
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-border text-foreground hover:bg-muted font-semibold text-xs transition-colors cursor-pointer"
            >
              {language === 'mr' ? 'रद्द करा' : language === 'hi' ? 'रद्द करें' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-white hover:bg-primary-hover font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? (language === 'mr' ? 'जतन करत आहे…' : 'Saving…')
                  : (language === 'mr' ? 'जतन करा व आकडेवारी बदला' : language === 'hi' ? 'सेव करें और अपडेट करें' : 'Save & Recalculate')}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditFarmModal;
