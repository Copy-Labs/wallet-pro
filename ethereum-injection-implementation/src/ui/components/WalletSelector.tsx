/**
 * Wallet Selector Component
 * UI for selecting between multiple detected wallets (EIP-6963)
 */

import React, { useState, useEffect } from 'react';
import './WalletSelector.css';

export interface WalletInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

interface WalletSelectorProps {
  wallets: WalletInfo[];
  currentWallet?: string; // rdns of current wallet
  onSelect: (rdns: string) => void;
  onClose: () => void;
}

export const WalletSelector: React.FC<WalletSelectorProps> = ({
  wallets,
  currentWallet,
  onSelect,
  onClose,
}) => {
  const [selectedRdns, setSelectedRdns] = useState<string>(currentWallet || '');

  const handleSelect = (rdns: string) => {
    setSelectedRdns(rdns);
    onSelect(rdns);
  };

  return (
    <div className="wallet-selector-overlay" onClick={onClose}>
      <div
        className="wallet-selector-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="wallet-selector-header">
          <h2>Select Wallet</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="wallet-selector-description">
          Multiple wallets detected. Choose which one to use for this site.
        </div>

        <div className="wallet-list">
          {wallets.map((wallet) => (
            <div
              key={wallet.uuid}
              className={`wallet-item ${
                selectedRdns === wallet.rdns ? 'selected' : ''
              }`}
              onClick={() => handleSelect(wallet.rdns)}
            >
              <img
                src={wallet.icon}
                alt={wallet.name}
                className="wallet-icon"
                onError={(e) => {
                  // Fallback icon if image fails to load
                  (e.target as HTMLImageElement).src =
                    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="%237C3AED"/></svg>';
                }}
              />
              <div className="wallet-info">
                <div className="wallet-name">{wallet.name}</div>
                <div className="wallet-rdns">{wallet.rdns}</div>
              </div>
              {selectedRdns === wallet.rdns && (
                <div className="check-icon">✓</div>
              )}
            </div>
          ))}
        </div>

        <div className="wallet-selector-footer">
          <button className="cancel-button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Hook to detect and manage multiple wallets
 */
export const useWalletDetection = () => {
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const detectWallets = async () => {
      try {
        // Request wallet information from background
        const response = await chrome.runtime.sendMessage({
          type: 'getDetectedWallets',
        });

        if (response && response.wallets) {
          setWallets(response.wallets);
        }
      } catch (error) {
        console.error('Failed to detect wallets:', error);
      } finally {
        setIsLoading(false);
      }
    };

    detectWallets();
  }, []);

  return { wallets, isLoading };
};

/**
 * Compact Wallet Switcher Button
 */
interface WalletSwitcherButtonProps {
  currentWallet: WalletInfo;
  onClick: () => void;
}

export const WalletSwitcherButton: React.FC<WalletSwitcherButtonProps> = ({
  currentWallet,
  onClick,
}) => {
  return (
    <button className="wallet-switcher-button" onClick={onClick}>
      <img
        src={currentWallet.icon}
        alt={currentWallet.name}
        className="wallet-switcher-icon"
      />
      <span className="wallet-switcher-name">{currentWallet.name}</span>
      <span className="wallet-switcher-arrow">▼</span>
    </button>
  );
};

/**
 * Example usage component
 */
export const WalletSelectorExample: React.FC = () => {
  const [showSelector, setShowSelector] = useState(false);
  const [currentWallet, setCurrentWallet] = useState<string>('com.yourwallet');
  const { wallets, isLoading } = useWalletDetection();

  const handleWalletSelect = async (rdns: string) => {
    try {
      // Save preference
      await chrome.runtime.sendMessage({
        type: 'setPreferredWallet',
        rdns,
      });

      setCurrentWallet(rdns);
      setShowSelector(false);

      // Notify page of wallet change
      window.dispatchEvent(
        new CustomEvent('wallet:changed', {
          detail: { rdns },
        })
      );
    } catch (error) {
      console.error('Failed to switch wallet:', error);
    }
  };

  if (isLoading) {
    return <div>Loading wallets...</div>;
  }

  const currentWalletInfo = wallets.find((w) => w.rdns === currentWallet);

  return (
    <div className="wallet-selector-container">
      {wallets.length > 1 && currentWalletInfo && (
        <WalletSwitcherButton
          currentWallet={currentWalletInfo}
          onClick={() => setShowSelector(true)}
        />
      )}

      {showSelector && (
        <WalletSelector
          wallets={wallets}
          currentWallet={currentWallet}
          onSelect={handleWalletSelect}
          onClose={() => setShowSelector(false)}
        />
      )}
    </div>
  );
};

export default WalletSelector;
