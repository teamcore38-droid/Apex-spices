import StoreSettings from '../models/storeSettingsModel.js';
import { recordAuditLog } from '../utils/auditService.js';

// Clean phone numbers by stripping non-digit characters except leading plus if any, default to Sri Lanka format
const sanitizePhoneNumber = (phone = '') => {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits || '94765669961';
};

// @desc    Get store settings (public)
// @route   GET /api/settings
// @access  Public
export const getStoreSettings = async (_req, res) => {
  try {
    let settings = await StoreSettings.findOne({ key: 'default' });

    if (!settings) {
      settings = await StoreSettings.create({
        key: 'default',
        checkoutMode: 'whatsapp',
        whatsappNumber: '94765669961',
      });
    }

    res.json({
      checkoutMode: settings.checkoutMode || 'whatsapp',
      whatsappNumber: settings.whatsappNumber || '94765669961',
      updatedAt: settings.updatedAt,
    });
  } catch (error) {
    console.error('Error fetching store settings:', error);
    res.status(500).json({ message: 'Server error fetching store settings' });
  }
};

// @desc    Update store settings
// @route   PUT /api/settings
// @access  Private/Admin
export const updateStoreSettings = async (req, res) => {
  try {
    const { checkoutMode, whatsappNumber } = req.body;

    let settings = await StoreSettings.findOne({ key: 'default' });

    if (!settings) {
      settings = new StoreSettings({ key: 'default' });
    }

    if (checkoutMode && ['whatsapp', 'online'].includes(checkoutMode)) {
      settings.checkoutMode = checkoutMode;
    }

    if (whatsappNumber !== undefined) {
      settings.whatsappNumber = sanitizePhoneNumber(whatsappNumber);
    }

    await settings.save();

    await recordAuditLog(req, 'settings.update', 'StoreSettings', settings._id, {
      checkoutMode: settings.checkoutMode,
      whatsappNumber: settings.whatsappNumber,
    });

    res.json({
      checkoutMode: settings.checkoutMode,
      whatsappNumber: settings.whatsappNumber,
      updatedAt: settings.updatedAt,
    });
  } catch (error) {
    console.error('Error updating store settings:', error);
    res.status(500).json({ message: 'Server error updating store settings' });
  }
};
