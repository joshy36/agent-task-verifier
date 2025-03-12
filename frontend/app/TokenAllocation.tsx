'use client';

import { useState, useEffect } from 'react';
import { createPublicClient, http, isAddress } from 'viem';
import { sepolia } from 'viem/chains';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const TOKENS = {
  ETH: {
    name: 'Ethereum',
    symbol: 'ETH',
    tokens: 30,
    image: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
    contractAddress: process.env.NEXT_PUBLIC_ETH_ADDRESS,
  },
  DOGE: {
    name: 'Dogecoin',
    symbol: 'DOGE',
    tokens: 60,
    image: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png',
    contractAddress: process.env.NEXT_PUBLIC_DOGE_ADDRESS,
  },
  WBTC: {
    name: 'Wrapped Bitcoin',
    symbol: 'wBTC',
    tokens: 10,
    image: 'https://cryptologos.cc/logos/wrapped-bitcoin-wbtc-logo.png',
    contractAddress: process.env.NEXT_PUBLIC_WBTC_ADDRESS,
  },
};

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL),
});

const generateRandomAddress = () => {
  const chars = '0123456789abcdef';
  let address = '0x';
  for (let i = 0; i < 40; i++) {
    address += chars[Math.floor(Math.random() * chars.length)];
  }
  return address;
};

type Transaction = { symbol: string; txHash: `0x${string}` };
type ReceiptStatus = 'pending' | 'success' | 'reverted' | 'error';

interface TokenAllocationProps {
  onWalletAddressChange?: (address: string) => void;
}

const TokenAllocation = ({ onWalletAddressChange }: TokenAllocationProps) => {
  const [walletAddress, setWalletAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [receipts, setReceipts] = useState<
    Record<string, { status: ReceiptStatus; error?: string }>
  >({});
  const [addressError, setAddressError] = useState<string | null>(null);

  useEffect(() => {
    const checkTransactionStatus = async () => {
      if (transactions.length === 0) return;

      const updatedReceipts = { ...receipts };
      let hasPending = false;

      for (const tx of transactions) {
        if (
          !updatedReceipts[tx.txHash] ||
          updatedReceipts[tx.txHash].status === 'pending'
        ) {
          hasPending = true;
          updatedReceipts[tx.txHash] = { status: 'pending' };
          try {
            const receipt = await publicClient.waitForTransactionReceipt({
              hash: tx.txHash,
            });
            updatedReceipts[tx.txHash] = { status: receipt.status };
          } catch (error) {
            updatedReceipts[tx.txHash] = {
              status: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        }
      }

      setReceipts(updatedReceipts);
      if (hasPending) {
        setTimeout(checkTransactionStatus, 2000);
      }
    };

    checkTransactionStatus();
  }, [transactions, receipts]);

  const validateAddress = (address: string): boolean => {
    if (!address) {
      setAddressError('Address is required');
      return false;
    }
    if (!isAddress(address)) {
      setAddressError('Invalid Ethereum address format');
      return false;
    }
    setAddressError(null);
    return true;
  };

  const handleSend = async () => {
    if (!validateAddress(walletAddress)) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
          allocations: {
            ETH: TOKENS.ETH.tokens,
            DOGE: TOKENS.DOGE.tokens,
            WBTC: TOKENS.WBTC.tokens,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send allocation');
      }

      const data = await response.json();
      if (data.success) {
        setTransactions(data.transactions);
        console.log('Transactions submitted:', data.transactions);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error sending allocation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWalletAddressChange = (address: string) => {
    setWalletAddress(address);
    validateAddress(address);
    if (onWalletAddressChange) {
      onWalletAddressChange(address);
    }
  };

  const handleGenerateAddress = () => {
    const newAddress = generateRandomAddress();
    setWalletAddress(newAddress);
    validateAddress(newAddress);
    handleWalletAddressChange(newAddress);
  };

  const isAnyPending = Object.values(receipts).some(
    (receipt) => receipt.status === 'pending'
  );
  const isSendDisabled =
    !walletAddress || isLoading || isAnyPending || !!addressError;

  return (
    <div className="bg-gray-900 p-4 rounded-lg w-full max-w-2xl border border-gray-800">
      <h2 className="text-xl font-semibold mb-2 text-gray-300">Send Tokens</h2>
      <p className="text-xs text-gray-500 mb-4">
        Note: These are ERC20 tokens deployed on Sepolia testnet
      </p>

      <div className="mb-6 space-y-3">
        {Object.entries(TOKENS).map(([key, token]) => (
          <div key={key} className="flex items-center space-x-3">
            <img
              src={token.image}
              alt={`${token.name} logo`}
              className="w-6 h-6 rounded-full"
            />
            <div className="flex-1">
              <div className="flex items-center">
                <p className="text-base text-gray-400">{token.name}</p>
                <a
                  href={`https://sepolia.etherscan.io/address/${token.contractAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-gray-500 hover:text-gray-300"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              </div>
              <p className="text-sm text-gray-500">
                {token.symbol}: {token.tokens} tokens
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Wallet Address
          </label>
          <Input
            type="text"
            value={walletAddress}
            onChange={(e) => handleWalletAddressChange(e.target.value)}
            placeholder="Enter wallet address (0x...)"
            className={`w-full bg-gray-800 border-gray-700 text-gray-300 focus:border-blue-500 focus:ring-blue-500 ${
              addressError ? 'border-red-500' : ''
            }`}
          />
          {addressError && (
            <p className="text-xs text-red-500 mt-1">{addressError}</p>
          )}
          <button
            onClick={handleGenerateAddress}
            className="mt-2 flex items-center text-sm text-gray-400 hover:text-gray-300 focus:outline-none"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Generate Random Address
          </button>
          <p className="text-xs text-gray-500 mt-1">
            Note: For testing, please use a different address each time.
          </p>
        </div>

        <Button
          onClick={handleSend}
          className="w-full bg-gray-700 hover:bg-gray-600 text-white"
          disabled={isSendDisabled}
        >
          {isLoading || isAnyPending ? 'Processing...' : 'Send Allocation'}
        </Button>

        {transactions.length > 0 && (
          <div className="mt-4">
            <h3 className="text-lg text-gray-300">Transaction Status</h3>
            {transactions.map((tx) => (
              <div key={tx.txHash} className="mt-2 text-sm text-gray-400">
                <p>
                  {tx.symbol} Transfer - Tx Hash:{' '}
                  <a
                    href={`https://sepolia.etherscan.io/tx/${tx.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    {tx.txHash.slice(0, 6)}...{tx.txHash.slice(-4)}
                  </a>
                </p>
                <p>
                  Status:{' '}
                  {receipts[tx.txHash]?.status === 'pending'
                    ? 'Waiting for confirmation...'
                    : receipts[tx.txHash]?.status === 'success'
                    ? 'Success'
                    : receipts[tx.txHash]?.status === 'reverted'
                    ? 'Failed'
                    : receipts[tx.txHash]?.status === 'error'
                    ? `Error: ${receipts[tx.txHash]?.error}`
                    : 'Unknown'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TokenAllocation;
