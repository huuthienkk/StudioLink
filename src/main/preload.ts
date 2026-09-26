import { contextBridge, ipcRenderer } from 'electron';

// Cung cấp API an toàn cho cửa sổ giao diện React
contextBridge.exposeInMainWorld('electronAPI', {
  // Accounts
  getAccounts: () => ipcRenderer.invoke('accounts:list'),
  getAccount: (id: string) => ipcRenderer.invoke('accounts:get', id),
  createAccount: (data: any) => ipcRenderer.invoke('accounts:create', data),
  deleteAccount: (id: string) => ipcRenderer.invoke('accounts:delete', id),
  testProxy: (rawProxy: string) => ipcRenderer.invoke('accounts:testProxy', rawProxy),
  startAccountLogin: (id: string) => ipcRenderer.invoke('accounts:startLogin', id),
  finishAccountLogin: (id: string) => ipcRenderer.invoke('accounts:finishLogin', id),
  cancelAccountLogin: (id: string) => ipcRenderer.invoke('accounts:cancelLogin', id),

  // Campaigns
  getCampaigns: () => ipcRenderer.invoke('campaigns:list'),
  getCampaign: (id: string) => ipcRenderer.invoke('campaigns:get', id),
  createCampaign: (data: any) => ipcRenderer.invoke('campaigns:create', data),
  updateCampaign: (campaign: any) => ipcRenderer.invoke('campaigns:update', campaign),
  deleteCampaign: (id: string) => ipcRenderer.invoke('campaigns:delete', id),
  generateVariants: (options: any) => ipcRenderer.invoke('campaigns:generateVariants', options),
  scanJoinedGroups: (accountId: string, keyword?: string) => ipcRenderer.invoke('campaigns:scanJoinedGroups', { accountId, keyword }),
  selectImages: () => ipcRenderer.invoke('campaigns:selectImages'),
  openGeminiLogin: () => ipcRenderer.invoke('campaigns:openGeminiLogin'),
  closeGeminiLogin: () => ipcRenderer.invoke('campaigns:closeGeminiLogin'),
  generateGeminiWeb: (content: string, count?: number) => ipcRenderer.invoke('campaigns:generateGeminiWeb', { content, count }),
  startCampaign: (id: string) => ipcRenderer.invoke('campaigns:start', id),
  pauseCampaign: (id: string) => ipcRenderer.invoke('campaigns:pause', id),
  resumeCampaign: (id: string) => ipcRenderer.invoke('campaigns:resume', id),
  stopCampaign: (id: string) => ipcRenderer.invoke('campaigns:stop', id),

  // Events & Realtime Progress
  onCampaignProgress: (callback: (data: any) => void) => {
    const sub = (_: any, data: any) => callback(data);
    ipcRenderer.on('campaign:progress', sub);
    return () => ipcRenderer.removeListener('campaign:progress', sub);
  },
  onCampaignLog: (callback: (data: any) => void) => {
    const sub = (_: any, data: any) => callback(data);
    ipcRenderer.on('campaign:log', sub);
    return () => ipcRenderer.removeListener('campaign:log', sub);
  },
  onCampaignStatusChanged: (callback: (data: any) => void) => {
    const sub = (_: any, data: any) => callback(data);
    ipcRenderer.on('campaign:statusChanged', sub);
    return () => ipcRenderer.removeListener('campaign:statusChanged', sub);
  },

  // Reports
  getReports: () => ipcRenderer.invoke('reports:list'),
  getReportsByCampaign: (id: string) => ipcRenderer.invoke('reports:byCampaign', id),
  getCampaignStats: (id: string) => ipcRenderer.invoke('reports:stats', id),
  exportExcel: (campaignId?: string) => ipcRenderer.invoke('reports:exportExcel', campaignId),

  // App & System
  getAppTarget: () => ipcRenderer.invoke('app:getTarget'),
  getLicenseInfo: () => ipcRenderer.invoke('license:getInfo'),
  activateLicense: (key: string) => ipcRenderer.invoke('license:activate', key),
  verifyLicense: () => ipcRenderer.invoke('license:verify'),
  deactivateLicense: () => ipcRenderer.invoke('license:deactivate'),

  // Auto Updater
  getAppVersion: () => ipcRenderer.invoke('updater:getVersion'),
  getUpdateStatus: () => ipcRenderer.invoke('updater:getStatus'),
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  restartAndInstall: () => ipcRenderer.invoke('updater:restartAndInstall'),
  onUpdateStatus: (callback: (data: any) => void) => {
    const sub = (_: any, data: any) => callback(data);
    ipcRenderer.on('updater:status', sub);
    return () => ipcRenderer.removeListener('updater:status', sub);
  },
});
