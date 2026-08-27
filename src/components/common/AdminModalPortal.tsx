import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface AdminModalPortalProps {
  isOpen: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  maxWidth?: string;
  zIndex?: string;
}

/**
 * Universal Modal Portal for Admin Panels
 * Mounts directly into document.body with fixed viewport anchoring,
 * preventing modals from getting pushed off-screen or stuck inside long scrollable tables.
 */
export const AdminModalPortal: React.FC<AdminModalPortalProps> = ({
  isOpen,
  onClose,
  children,
  maxWidth = 'max-w-md',
  zIndex = 'z-[9999]'
}) => {
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div 
      className={`fixed inset-0 ${zIndex} bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto`}
      style={{ margin: 0 }}
    >
      {/* Clickable Backdrop */}
      <div 
        className="fixed inset-0 bg-transparent" 
        onClick={onClose}
        aria-hidden="true" 
      />
      {/* Centered Modal Content Card */}
      <div className={`relative w-full ${maxWidth} z-10 my-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200`}>
        {children}
      </div>
    </div>,
    document.body
  );
};

export default AdminModalPortal;
