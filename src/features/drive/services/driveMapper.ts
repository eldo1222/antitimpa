import { DriveAccount } from '../types/drive.types';

export function mapDriveAccountToDb(d: Partial<DriveAccount>): Record<string, any> {
  const row: Record<string, any> = {};
  if (d.id !== undefined) row.id = d.id;
  if (d.name !== undefined) row.name = d.name;
  if (d.email !== undefined) row.email = d.email;
  if (d.folderUrl !== undefined) row.folder_url = d.folderUrl;
  if (d.status !== undefined) row.status = d.status;
  if (d.notes !== undefined) row.notes = d.notes;
  if (d.storageUsedGb !== undefined) row.storage_used_gb = d.storageUsedGb;
  if (d.storageTotalGb !== undefined) row.storage_total_gb = d.storageTotalGb;
  if (d.colorTag !== undefined) row.color_tag = d.colorTag;
  row.created_at = d.createdAt || new Date().toISOString();
  return row;
}

export function mapDbToDriveAccount(d: Record<string, any>): DriveAccount {
  return {
    id: d.id,
    name: d.name || '',
    email: d.email || '',
    folderUrl: d.folder_url || undefined,
    status: d.status || 'active',
    notes: d.notes || undefined,
    storageUsedGb: d.storage_used_gb ? Number(d.storage_used_gb) : undefined,
    storageTotalGb: d.storage_total_gb ? Number(d.storage_total_gb) : undefined,
    colorTag: d.color_tag || undefined,
    createdAt: d.created_at || new Date().toISOString(),
  };
}
