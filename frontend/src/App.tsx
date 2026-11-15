import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { BottomNav, NavTab } from './components/BottomNav';
import { NotificationDrawer } from './components/NotificationDrawer';
import { AuthModal } from './pages/AuthModal';
import { DashboardView } from './pages/DashboardView';
import { FarmView } from './pages/FarmView';
import { MarketView } from './pages/MarketView';
import { SellAdvisorView } from './pages/SellAdvisorView';
import { AskAiView } from './pages/AskAiView';
import { Language } from './i18n';
import { api, authStorage } from './services/api';
import { Farm, MarketData, WeatherData, RecommendationData, AppNotification, User } from './types';

export const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>('mr');
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [market, setMarket] = useState<MarketData | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [recommendation, setRecommendation] = useState<RecommendationData | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [selectedCommodity, setSelectedCommodity] = useState<string>('soybean');
  
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Initialize session and load data
  useEffect(() => {
    const savedUser = authStorage.getUser();
    if (savedUser) {
      setUser(savedUser);
      if (savedUser.preferredLanguage) {
        setLanguage(savedUser.preferredLanguage as Language);
      }
    }

    loadInitialData();
  }, []);

  // Reload market and recommendations when commodity changes
  useEffect(() => {
    if (farm) {
      loadMarketAndRecs(selectedCommodity, farm.lat, farm.lng, farm);
    }
  }, [selectedCommodity]);

  const loadInitialData = async () => {
    try {
      // 1. Get farm
      const farmRes = await api.getFarm().catch(() => null);
      const activeFarm = farmRes?.farm || {
        id: 'demo-farm',
        name: 'Patil Farm',
        crop: 'soybean',
        commodity: 'soybean',
        state: 'Maharashtra',
        district: 'Latur',
        village: 'Ausa',
        lat: 18.2333,
        lng: 76.7167,
        areaHectares: 3.5,
        sowingDate: '2026-06-20',
        soilType: 'black',
        irrigationType: 'rainfed',
        inputCostPerHa: 18000,
        expectedYieldQPerHa: 19.8,
        totalHarvestQ: 69.3
      };
      setFarm(activeFarm);
      setSelectedCommodity(activeFarm.crop || 'soybean');

      // 2. Weather for farm coordinates
      const weatherRes = await api.getWeather(activeFarm.lat, activeFarm.lng).catch(() => null);
      if (weatherRes?.data) setWeather(weatherRes.data);

      // 3. Market & Recommendations
      await loadMarketAndRecs(activeFarm.crop || selectedCommodity, activeFarm.lat, activeFarm.lng, activeFarm);

      // 4. Notifications
      const notifsRes = await api.getNotifications().catch(() => null);
      if (notifsRes?.notifications) setNotifications(notifsRes.notifications);
    } catch (err) {
      console.warn('Initial data load warning:', err);
    }
  };

  const loadMarketAndRecs = async (
    commodity: string,
    lat: number,
    lng: number,
    targetFarm?: Farm | null
  ) => {
    try {
      const currentFarm = targetFarm !== undefined ? targetFarm : farm;
      const marketRes = await api.getMarketData(commodity, lat, lng).catch(() => null);
      if (marketRes?.data) setMarket(marketRes.data);

      const recRes = await api.getRecommendations({
        commodity,
        areaHectares: currentFarm?.areaHectares || 3.5,
        yieldQPerHa: currentFarm?.expectedYieldQPerHa,
        soilType: currentFarm?.soilType || 'black',
        irrigationType: currentFarm?.irrigationType || 'rainfed',
        sowingDate: currentFarm?.sowingDate || '2026-06-20',
        lat,
        lng,
        inputCostTotal: (currentFarm?.areaHectares || 3.5) * (currentFarm?.inputCostPerHa || 18000)
      }).catch(() => null);
      
      if (recRes?.data) setRecommendation(recRes.data);
    } catch (err) {
      console.warn('Failed to refresh market and recs:', err);
    }
  };

  const handleUpdateFarm = async (updated: Partial<Farm>) => {
    try {
      const merged: Farm = {
        ...(farm || {
          id: 'demo-farm',
          name: 'Patil Farm',
          crop: 'soybean',
          commodity: 'soybean',
          state: 'Maharashtra',
          district: 'Latur',
          village: 'Ausa',
          lat: 18.2333,
          lng: 76.7167,
          areaHectares: 3.5,
          sowingDate: '2026-06-20',
          soilType: 'black',
          irrigationType: 'rainfed',
          inputCostPerHa: 18000
        }),
        ...updated
      };

      const res = await api.saveFarm(merged);
      const savedFarm = res.farm;
      setFarm(savedFarm);

      if (savedFarm.crop) {
        setSelectedCommodity(savedFarm.crop);
      }

      // 1. Refresh Weather for new location
      const weatherRes = await api.getWeather(savedFarm.lat, savedFarm.lng).catch(() => null);
      if (weatherRes?.data) setWeather(weatherRes.data);

      // 2. Recompute Market and Recommendations with edited parameters
      await loadMarketAndRecs(savedFarm.crop, savedFarm.lat, savedFarm.lng, savedFarm);

      // 3. Post In-App Notification of updated results
      const newNotif: AppNotification = {
        id: `notif-${Date.now()}`,
        type: 'farm_update',
        title: 'Farm Edits Saved & Recalculated',
        message: `${savedFarm.name} updated: ${savedFarm.crop.toUpperCase()} (${savedFarm.areaHectares} ha, ${savedFarm.soilType} soil, ${savedFarm.irrigationType}). Yield projected at ${savedFarm.expectedYieldQPerHa} qtl/ha.`,
        severity: 'success',
        isRead: false,
        timestamp: 'Just now'
      };
      setNotifications((prev) => [newNotif, ...prev]);
    } catch (err) {
      console.error('Failed to update farm:', err);
    }
  };

  const handleLogout = () => {
    authStorage.removeToken();
    authStorage.removeUser();
    setUser(null);
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased">
      {/* Top Navbar */}
      <Navbar
        language={language}
        onLanguageChange={setLanguage}
        user={user}
        farm={farm}
        notifications={notifications}
        onOpenNotifications={() => setIsNotifOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main View Container */}
      <main className="flex-1 max-w-md sm:max-w-xl mx-auto w-full px-4 pt-4">
        {activeTab === 'dashboard' && (
          <DashboardView
            recommendation={recommendation}
            weather={weather}
            market={market}
            farm={farm}
            language={language}
            onNavigate={setActiveTab}
          />
        )}

        {activeTab === 'farm' && (
          <FarmView
            farm={farm}
            onUpdateFarm={handleUpdateFarm}
            language={language}
          />
        )}

        {activeTab === 'market' && (
          <MarketView
            market={market}
            selectedCommodity={selectedCommodity}
            onSelectCommodity={setSelectedCommodity}
            language={language}
          />
        )}

        {activeTab === 'sell' && (
          <SellAdvisorView
            recommendation={recommendation}
            language={language}
          />
        )}

        {activeTab === 'ask' && (
          <AskAiView
            language={language}
            farm={farm}
            market={market}
          />
        )}
      </main>

      {/* Notifications Drawer */}
      <NotificationDrawer
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        notifications={notifications}
        onMarkAllRead={handleMarkAllRead}
        language={language}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(loggedUser) => setUser(loggedUser)}
        language={language}
      />

      {/* Fixed Bottom Navigation (Mobile-First) */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        language={language}
      />
    </div>
  );
};
export default App;
