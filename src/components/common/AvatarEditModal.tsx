import React from 'react';
import { ProfileSettingsModal } from './ProfileSettingsModal';

interface AvatarEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: {
    id: string;
    username: string;
    avatar?: string;
    bio?: string;
    role?: string;
  } | null;
}

export const AvatarEditModal: React.FC<AvatarEditModalProps> = ({ isOpen, onClose, targetUser }) => {
  return (
    <ProfileSettingsModal
      isOpen={isOpen}
      onClose={onClose}
      targetUser={targetUser}
      defaultTab="profile"
    />
  );
};
