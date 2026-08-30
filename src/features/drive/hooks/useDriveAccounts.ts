import { useState, useCallback } from 'react';
import { DriveAccount } from '../types/drive.types';
import { initialDriveAccounts } from '../../../data/initialData';
import { DriveRepository } from '../services/driveRepository';
import { LocalStorageWrapper } from '../../../services/storage/localStorageWrapper';

const STORAGE_KEY = 'antitimpa_drive_accounts_v1';

export function useDriveAccounts() {
  const [driveAccounts, setDriveAccounts] = useState<DriveAccount[]>(() =>
    LocalStorageWrapper.getItem<DriveAccount[]>(STORAGE_KEY, initialDriveAccounts)
  );

  const saveDriveAccountsState = useCallback((accounts: DriveAccount[]) => {
    setDriveAccounts(accounts);
    LocalStorageWrapper.setItem(STORAGE_KEY, accounts);
  }, []);

  const addDriveAccount = useCallback((accountData: Omit<DriveAccount, 'id' | 'createdAt'>) => {
    const newAccount: DriveAccount = {
      ...accountData,
      id: `drive-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [newAccount, ...driveAccounts];
    saveDriveAccountsState(updated);
    DriveRepository.save(newAccount).catch(console.warn);
  }, [driveAccounts, saveDriveAccountsState]);

  const updateDriveAccount = useCallback((id: string, updates: Partial<DriveAccount>) => {
    const updated = driveAccounts.map(d => d.id === id ? { ...d, ...updates } : d);
    saveDriveAccountsState(updated);
    const target = updated.find(d => d.id === id);
    if (target) DriveRepository.save(target).catch(console.warn);
  }, [driveAccounts, saveDriveAccountsState]);

  const deleteDriveAccount = useCallback((id: string) => {
    const updated = driveAccounts.filter(d => d.id !== id);
    saveDriveAccountsState(updated);
    DriveRepository.delete(id).catch(console.warn);
  }, [driveAccounts, saveDriveAccountsState]);

  return {
    driveAccounts,
    setDriveAccounts,
    addDriveAccount,
    updateDriveAccount,
    deleteDriveAccount,
  };
}
