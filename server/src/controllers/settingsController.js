// ============================================
// SYSTEM SETTINGS CONTROLLER
// Neural Core - Central Configuration Management
// ============================================

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ============================================
// DEFAULT SETTINGS CONFIGURATION
// ============================================

const DEFAULT_SETTINGS = [
  // ===== POS SETTINGS =====
  {
    category: 'POS',
    key: 'receipt_header',
    value: 'PRAM AUTO SPARES',
    label: 'Receipt Header',
    description: 'Company name displayed at top of receipts',
    dataType: 'string',
  },
  {
    category: 'POS',
    key: 'receipt_footer',
    value: 'Thank you for your business!',
    label: 'Receipt Footer',
    description: 'Message displayed at bottom of receipts',
    dataType: 'string',
  },
  {
    category: 'POS',
    key: 'receipt_prefix',
    value: 'RCP',
    label: 'Receipt Number Prefix',
    description: 'Prefix for receipt numbers (e.g., RCP-0001)',
    dataType: 'string',
  },
  {
    category: 'POS',
    key: 'show_logo_on_receipt',
    value: true,
    label: 'Show Logo on Receipt',
    description: 'Display company logo on printed receipts',
    dataType: 'boolean',
  },
  {
    category: 'POS',
    key: 'auto_print_receipt',
    value: true,
    label: 'Auto-Print Receipt',
    description: 'Automatically print receipt after successful sale',
    dataType: 'boolean',
  },
  {
    category: 'POS',
    key: 'receipt_copies',
    value: 1,
    label: 'Receipt Copies',
    description: 'Number of receipt copies to print',
    dataType: 'number',
  },
  {
    category: 'POS',
    key: 'thermal_printer_width',
    value: 80,
    label: 'Thermal Printer Width (mm)',
    description: 'Paper width for thermal receipt printer',
    dataType: 'number',
  },

  // ===== TAX SETTINGS =====
  {
    category: 'TAX',
    key: 'vat_enabled',
    value: true,
    label: 'VAT Enabled',
    description: 'Enable VAT calculations on sales',
    dataType: 'boolean',
  },
  {
    category: 'TAX',
    key: 'vat_rate',
    value: 16,
    label: 'VAT Rate (%)',
    description: 'Value Added Tax percentage',
    dataType: 'number',
  },
  {
    category: 'TAX',
    key: 'prices_include_vat',
    value: true,
    label: 'Prices Include VAT',
    description: 'Selling prices are VAT-inclusive',
    dataType: 'boolean',
  },
  {
    category: 'TAX',
    key: 'kra_pin',
    value: '',
    label: 'KRA PIN',
    description: 'Kenya Revenue Authority PIN number',
    dataType: 'string',
  },
  {
    category: 'TAX',
    key: 'show_vat_breakdown',
    value: true,
    label: 'Show VAT Breakdown',
    description: 'Display VAT breakdown on receipts',
    dataType: 'boolean',
  },

  // ===== INVENTORY SETTINGS =====
  {
    category: 'INVENTORY',
    key: 'default_low_stock_threshold',
    value: 5,
    label: 'Default Low Stock Threshold',
    description: 'Default minimum quantity before low stock alert',
    dataType: 'number',
  },
  {
    category: 'INVENTORY',
    key: 'allow_negative_stock',
    value: false,
    label: 'Allow Negative Stock',
    description: 'Allow sales when stock is zero (creates debt)',
    dataType: 'boolean',
  },
  {
    category: 'INVENTORY',
    key: 'auto_restock_alerts',
    value: true,
    label: 'Auto Restock Alerts',
    description: 'Automatically notify when items need restocking',
    dataType: 'boolean',
  },
  {
    category: 'INVENTORY',
    key: 'track_stock_movements',
    value: true,
    label: 'Track Stock Movements',
    description: 'Log all stock changes for audit trail',
    dataType: 'boolean',
  },
  {
    category: 'INVENTORY',
    key: 'require_transfer_approval',
    value: true,
    label: 'Require Transfer Approval',
    description: 'Inter-branch transfers require admin approval',
    dataType: 'boolean',
  },

  // ===== SECURITY SETTINGS =====
  {
    category: 'SECURITY',
    key: 'session_timeout_minutes',
    value: 480,
    label: 'Session Timeout (minutes)',
    description: 'Auto-logout after inactivity period',
    dataType: 'number',
  },
  {
    category: 'SECURITY',
    key: 'require_password_change_days',
    value: 90,
    label: 'Password Expiry (days)',
    description: 'Force password change after this many days (0 = disabled)',
    dataType: 'number',
  },
  {
    category: 'SECURITY',
    key: 'min_password_length',
    value: 8,
    label: 'Minimum Password Length',
    description: 'Minimum characters required for passwords',
    dataType: 'number',
  },
  {
    category: 'SECURITY',
    key: 'max_login_attempts',
    value: 5,
    label: 'Max Login Attempts',
    description: 'Lock account after this many failed attempts',
    dataType: 'number',
  },
  {
    category: 'SECURITY',
    key: 'require_reversal_approval',
    value: true,
    label: 'Require Reversal Approval',
    description: 'Sale reversals must be approved by admin/owner',
    dataType: 'boolean',
  },
  {
    category: 'SECURITY',
    key: 'audit_trail_retention_days',
    value: 365,
    label: 'Audit Trail Retention (days)',
    description: 'Days to keep audit logs (0 = forever)',
    dataType: 'number',
  },

  // ===== BUSINESS SETTINGS =====
  {
    category: 'BUSINESS',
    key: 'company_name',
    value: 'Pram Auto Spares',
    label: 'Company Name',
    description: 'Legal business name',
    dataType: 'string',
  },
  {
    category: 'BUSINESS',
    key: 'company_phone',
    value: '+254 700 000 000',
    label: 'Company Phone',
    description: 'Primary contact number',
    dataType: 'string',
  },
  {
    category: 'BUSINESS',
    key: 'company_email',
    value: 'info@pramautospares.co.ke',
    label: 'Company Email',
    description: 'Primary business email',
    dataType: 'string',
  },
  {
    category: 'BUSINESS',
    key: 'company_address',
    value: 'Nairobi, Kenya',
    label: 'Company Address',
    description: 'Business physical address',
    dataType: 'string',
  },
  {
    category: 'BUSINESS',
    key: 'currency_code',
    value: 'KES',
    label: 'Currency Code',
    description: 'Primary currency for transactions',
    dataType: 'string',
  },
  {
    category: 'BUSINESS',
    key: 'currency_symbol',
    value: 'KSh',
    label: 'Currency Symbol',
    description: 'Symbol displayed with prices',
    dataType: 'string',
  },
  {
    category: 'BUSINESS',
    key: 'fiscal_year_start_month',
    value: 1,
    label: 'Fiscal Year Start Month',
    description: 'Month when fiscal year begins (1-12)',
    dataType: 'number',
  },

  // ===== NOTIFICATION SETTINGS =====
  {
    category: 'NOTIFICATIONS',
    key: 'email_notifications_enabled',
    value: false,
    label: 'Email Notifications',
    description: 'Send email alerts for important events',
    dataType: 'boolean',
  },
  {
    category: 'NOTIFICATIONS',
    key: 'sms_notifications_enabled',
    value: false,
    label: 'SMS Notifications',
    description: 'Send SMS alerts for critical events',
    dataType: 'boolean',
  },
  {
    category: 'NOTIFICATIONS',
    key: 'notify_on_low_stock',
    value: true,
    label: 'Notify on Low Stock',
    description: 'Alert when items fall below threshold',
    dataType: 'boolean',
  },
  {
    category: 'NOTIFICATIONS',
    key: 'notify_on_large_sale',
    value: true,
    label: 'Notify on Large Sales',
    description: 'Alert for sales above threshold',
    dataType: 'boolean',
  },
  {
    category: 'NOTIFICATIONS',
    key: 'large_sale_threshold',
    value: 50000,
    label: 'Large Sale Threshold (KES)',
    description: 'Minimum amount to trigger large sale alert',
    dataType: 'number',
  },
  {
    category: 'NOTIFICATIONS',
    key: 'daily_report_enabled',
    value: true,
    label: 'Daily Report',
    description: 'Send daily summary report',
    dataType: 'boolean',
  },
  {
    category: 'NOTIFICATIONS',
    key: 'daily_report_time',
    value: '18:00',
    label: 'Daily Report Time',
    description: 'Time to send daily report (24h format)',
    dataType: 'string',
  },
];

// ============================================
// GET ALL SETTINGS (Grouped by Category)
// ============================================

const getAllSettings = async (req, res) => {
  try {
    const settings = await prisma.systemSettings.findMany({
      orderBy: [
        { category: 'asc' },
        { key: 'asc' },
      ],
    });

    // Group settings by category
    const grouped = settings.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = [];
      }
      acc[setting.category].push({
        id: setting.id,
        key: setting.key,
        value: setting.value,
        label: setting.label,
        description: setting.description,
        dataType: setting.dataType,
        isLocked: setting.isLocked,
        updatedAt: setting.updatedAt,
      });
      return acc;
    }, {});

    res.json({
      success: true,
      data: grouped,
      categories: Object.keys(grouped),
      totalSettings: settings.length,
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system settings',
      error: error.message,
    });
  }
};

// ============================================
// GET SETTINGS BY CATEGORY
// ============================================

const getSettingsByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    const settings = await prisma.systemSettings.findMany({
      where: { category: category.toUpperCase() },
      orderBy: { key: 'asc' },
    });

    res.json({
      success: true,
      category: category.toUpperCase(),
      data: settings.map(s => ({
        id: s.id,
        key: s.key,
        value: s.value,
        label: s.label,
        description: s.description,
        dataType: s.dataType,
        isLocked: s.isLocked,
      })),
    });
  } catch (error) {
    console.error('Error fetching category settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category settings',
      error: error.message,
    });
  }
};

// ============================================
// GET SINGLE SETTING
// ============================================

const getSetting = async (req, res) => {
  try {
    const { category, key } = req.params;

    const setting = await prisma.systemSettings.findUnique({
      where: {
        category_key: {
          category: category.toUpperCase(),
          key: key.toLowerCase(),
        },
      },
    });

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: `Setting ${category}/${key} not found`,
      });
    }

    res.json({
      success: true,
      data: {
        key: setting.key,
        value: setting.value,
        label: setting.label,
        description: setting.description,
        dataType: setting.dataType,
      },
    });
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch setting',
      error: error.message,
    });
  }
};

// ============================================
// UPDATE SETTING
// ============================================

const updateSetting = async (req, res) => {
  try {
    const { category, key } = req.params;
    const { value } = req.body;
    const userId = req.user?.id || 'system';

    // Check if setting exists
    const existing = await prisma.systemSettings.findUnique({
      where: {
        category_key: {
          category: category.toUpperCase(),
          key: key.toLowerCase(),
        },
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `Setting ${category}/${key} not found`,
      });
    }

    // Check if locked (only OWNER can modify)
    if (existing.isLocked && req.user?.role !== 'OWNER') {
      return res.status(403).json({
        success: false,
        message: 'This setting is locked and can only be modified by the Owner',
      });
    }

    // Update the setting
    const updated = await prisma.systemSettings.update({
      where: {
        category_key: {
          category: category.toUpperCase(),
          key: key.toLowerCase(),
        },
      },
      data: {
        value,
        lastUpdatedBy: userId,
        updatedAt: new Date(),
      },
    });

    // Log the change
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE_SETTING',
        entityType: 'SystemSettings',
        entityId: updated.id,
        oldValue: { value: existing.value },
        newValue: { value: updated.value },
        ipAddress: req.ip,
      },
    });

    res.json({
      success: true,
      message: `Setting ${category}/${key} updated successfully`,
      data: {
        key: updated.key,
        value: updated.value,
        label: updated.label,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update setting',
      error: error.message,
    });
  }
};

// ============================================
// BULK UPDATE SETTINGS
// ============================================

const bulkUpdateSettings = async (req, res) => {
  try {
    const { settings } = req.body; // Array of { category, key, value }
    const userId = req.user?.id || 'system';

    if (!Array.isArray(settings) || settings.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Settings array is required',
      });
    }

    const results = [];
    const errors = [];

    for (const setting of settings) {
      try {
        const existing = await prisma.systemSettings.findUnique({
          where: {
            category_key: {
              category: setting.category.toUpperCase(),
              key: setting.key.toLowerCase(),
            },
          },
        });

        if (!existing) {
          errors.push({ key: setting.key, error: 'Not found' });
          continue;
        }

        if (existing.isLocked && req.user?.role !== 'OWNER') {
          errors.push({ key: setting.key, error: 'Locked' });
          continue;
        }

        const updated = await prisma.systemSettings.update({
          where: {
            category_key: {
              category: setting.category.toUpperCase(),
              key: setting.key.toLowerCase(),
            },
          },
          data: {
            value: setting.value,
            lastUpdatedBy: userId,
          },
        });

        results.push({ key: updated.key, value: updated.value });
      } catch (err) {
        errors.push({ key: setting.key, error: err.message });
      }
    }

    res.json({
      success: true,
      message: `Updated ${results.length} settings`,
      updated: results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error bulk updating settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update settings',
      error: error.message,
    });
  }
};

// ============================================
// INITIALIZE DEFAULT SETTINGS
// ============================================

const initializeDefaults = async (req, res) => {
  try {
    const userId = req.user?.id || 'system';
    let created = 0;
    let skipped = 0;

    for (const setting of DEFAULT_SETTINGS) {
      const existing = await prisma.systemSettings.findUnique({
        where: {
          category_key: {
            category: setting.category,
            key: setting.key,
          },
        },
      });

      if (!existing) {
        await prisma.systemSettings.create({
          data: {
            ...setting,
            lastUpdatedBy: userId,
          },
        });
        created++;
      } else {
        skipped++;
      }
    }

    res.json({
      success: true,
      message: `Initialized system settings`,
      created,
      skipped,
      total: DEFAULT_SETTINGS.length,
    });
  } catch (error) {
    console.error('Error initializing settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize default settings',
      error: error.message,
    });
  }
};

// ============================================
// RESET TO DEFAULTS
// ============================================

const resetToDefaults = async (req, res) => {
  try {
    const { category } = req.params;
    const userId = req.user?.id || 'system';

    // Only OWNER can reset settings
    if (req.user?.role !== 'OWNER') {
      return res.status(403).json({
        success: false,
        message: 'Only the Owner can reset settings to defaults',
      });
    }

    const defaultsToReset = category
      ? DEFAULT_SETTINGS.filter(s => s.category === category.toUpperCase())
      : DEFAULT_SETTINGS;

    let reset = 0;

    for (const setting of defaultsToReset) {
      await prisma.systemSettings.upsert({
        where: {
          category_key: {
            category: setting.category,
            key: setting.key,
          },
        },
        update: {
          value: setting.value,
          lastUpdatedBy: userId,
        },
        create: {
          ...setting,
          lastUpdatedBy: userId,
        },
      });
      reset++;
    }

    res.json({
      success: true,
      message: `Reset ${reset} settings to defaults`,
      category: category || 'ALL',
    });
  } catch (error) {
    console.error('Error resetting settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset settings',
      error: error.message,
    });
  }
};

// ============================================
// GET RECEIPT PREVIEW DATA
// ============================================

const getReceiptPreview = async (req, res) => {
  try {
    const posSettings = await prisma.systemSettings.findMany({
      where: { category: 'POS' },
    });

    const businessSettings = await prisma.systemSettings.findMany({
      where: { category: 'BUSINESS' },
    });

    const taxSettings = await prisma.systemSettings.findMany({
      where: { category: 'TAX' },
    });

    const toObject = (settings) => {
      return settings.reduce((acc, s) => {
        acc[s.key] = s.value;
        return acc;
      }, {});
    };

    res.json({
      success: true,
      data: {
        pos: toObject(posSettings),
        business: toObject(businessSettings),
        tax: toObject(taxSettings),
      },
    });
  } catch (error) {
    console.error('Error fetching receipt preview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch receipt preview data',
      error: error.message,
    });
  }
};

module.exports = {
  getAllSettings,
  getSettingsByCategory,
  getSetting,
  updateSetting,
  bulkUpdateSettings,
  initializeDefaults,
  resetToDefaults,
  getReceiptPreview,
};
