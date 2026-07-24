/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const SettingsContext = createContext();

const DEFAULT_SETTINGS = {
  checkoutMode: 'whatsapp',
  whatsappNumber: '94765669961',
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/settings');
      if (data) {
        setSettings({
          checkoutMode: data.checkoutMode || 'whatsapp',
          whatsappNumber: data.whatsappNumber || '94765669961',
        });
      }
    } catch (error) {
      console.error('[SettingsContext] Failed to load store settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(async (newSettings, token) => {
    const config = token
      ? {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      : {};

    const { data } = await axios.put('/api/settings', newSettings, config);
    if (data) {
      setSettings({
        checkoutMode: data.checkoutMode || 'whatsapp',
        whatsappNumber: data.whatsappNumber || '94765669961',
      });
    }
    return data;
  }, []);

  const value = useMemo(
    () => ({
      checkoutMode: settings.checkoutMode,
      whatsappNumber: settings.whatsappNumber,
      loading,
      fetchSettings,
      updateSettings,
    }),
    [settings.checkoutMode, settings.whatsappNumber, loading, fetchSettings, updateSettings]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    return {
      checkoutMode: 'whatsapp',
      whatsappNumber: '94765669961',
      loading: false,
      fetchSettings: () => {},
      updateSettings: async () => {},
    };
  }
  return context;
};

export default SettingsContext;
