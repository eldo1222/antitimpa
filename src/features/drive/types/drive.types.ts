export interface DriveAccount {
  id: string;
  name: string;
  email: string;
  folderUrl?: string;
  status: 'active' | 'warning' | 'full' | 'backup';
  notes?: string;
  storageUsedGb?: number;
  storageTotalGb?: number;
  colorTag?: string;
  createdAt: string;
}
