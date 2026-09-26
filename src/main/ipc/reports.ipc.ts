import { ipcMain } from 'electron';
import path from 'path';
import * as XLSX from 'xlsx';
import { ReportsRepository } from '../../data/repositories/reports.repo';
import { getExportsDir } from '../../core/paths';

export function registerReportsIpc(): void {
  const repo = new ReportsRepository();

  // 1. Lấy toàn bộ báo cáo
  ipcMain.handle('reports:list', async () => {
    return repo.getAll();
  });

  // 2. Lấy báo cáo theo chiến dịch
  ipcMain.handle('reports:byCampaign', async (_event, campaignId: string) => {
    return repo.getReportsByCampaign(campaignId);
  });

  // 3. Thống kê theo chiến dịch
  ipcMain.handle('reports:stats', async (_event, campaignId: string) => {
    return repo.getStatsByCampaign(campaignId);
  });

  // 4. Xuất báo cáo ra định dạng Excel (.xlsx)
  ipcMain.handle('reports:exportExcel', async (_event, campaignId?: string) => {
    const reports = campaignId ? repo.getReportsByCampaign(campaignId) : repo.getAll();

    if (reports.length === 0) {
      return { success: false, message: 'Không có dữ liệu báo cáo để xuất.' };
    }

    // Chuẩn hóa dữ liệu sang dạng bảng
    const rows = reports.map((r, index) => ({
      'STT': index + 1,
      'Mã Báo Cáo': r.id,
      'Mã Chiến Dịch': r.campaignId,
      'Nền Tảng': r.platform.toUpperCase(),
      'Tài Khoản': r.accountId,
      'Mục Tiêu (Nhóm/Profile)': r.targetIdentifier,
      'Trạng Thái': r.status === 'success' ? 'Thành công' : 'Thất bại',
      'Chi Tiết Phản Hồi': r.message || '',
      'Thời Gian Thực Hiện': r.timestamp,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'BaoCaoChiTiet');

    // Thư mục lưu an toàn theo chuẩn AppData
    const exportDir = getExportsDir();
    const fileName = `BaoCao_NexaLink_${Date.now()}.xlsx`;
    const defaultFilePath = path.join(exportDir, fileName);

    XLSX.writeFile(workbook, defaultFilePath);
    console.log(`[Reports] Đã xuất báo cáo Excel thành công tại: ${defaultFilePath}`);

    return {
      success: true,
      filePath: defaultFilePath,
      totalRecords: rows.length,
    };
  });
}
