'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Assuming you have an Input component from your UI library

type ProofData = {
  vkey: string;
  publicValues: string;
  proof: string;
};

interface GenerateProofProps {
  walletAddress?: string; // Optional prop from parent, can be used as initial value
  proofData: ProofData;
  onProofGenerated: (data: ProofData) => void;
}

const KNOWN_VALID_ADDRESS = '0xfa9Cc30e4d458D6A327c8407414CcAfc61D0884c';

const GenerateProof = ({
  walletAddress: initialWalletAddress = '',
  proofData,
  onProofGenerated,
}: GenerateProofProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState(initialWalletAddress); // Local state for address input

  const generateProof = async () => {
    if (!address) {
      setError('Please provide a wallet address');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('http://127.0.0.1:3001/generate_proof', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent: address, // Use local address state
          system: 'core',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate proof');
      }

      const data = await response.json();
      const newProofData: ProofData = {
        vkey: data.vkey,
        publicValues: data.public_values.join(','),
        proof: data.proof,
      };
      onProofGenerated(newProofData);
    } catch (err) {
      setError((err as Error).message || 'Failed to generate proof');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectKnownAddress = () => {
    setAddress(KNOWN_VALID_ADDRESS);
    setError(null); // Clear any existing error
  };

  return (
    <div className="bg-gray-900 p-4 rounded-lg w-full border border-gray-800">
      <h2 className="text-xl font-semibold mb-4 text-gray-300">
        Generate Proof
      </h2>

      <div className="text-gray-400 mb-2">Generate proof for</div>
      <div className="flex flex-col gap-2 mb-4">
        <Input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter wallet address (e.g., 0x...)"
          className="bg-gray-800 text-gray-300 border-gray-700 focus:border-gray-600"
          disabled={isLoading}
        />
        <Button
          onClick={handleSelectKnownAddress}
          className="bg-gray-700 hover:bg-gray-600 text-white text-sm"
          disabled={isLoading}
        >
          Use Known Valid Address ({KNOWN_VALID_ADDRESS.slice(0, 6)}...
          {KNOWN_VALID_ADDRESS.slice(-4)})
        </Button>
      </div>

      <Button
        onClick={generateProof}
        className="w-full bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center"
        disabled={isLoading || !address}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-5 w-5 mr-2 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span>Generating...</span>
          </>
        ) : (
          'Generate Proof'
        )}
      </Button>

      {/* Display proofData if it exists */}
      {(proofData.vkey || proofData.publicValues || proofData.proof) && (
        <div className="mt-4 text-sm text-gray-400">
          <p className="text-green-400">Proof generated successfully!</p>
          <p>
            <span className="font-medium">Verification Key:</span>{' '}
            <span className="break-all text-xs">
              {proofData.vkey.slice(0, 10)}...{proofData.vkey.slice(-8)}
            </span>
          </p>
          <p>
            <span className="font-medium">Public Values:</span>{' '}
            <span className="break-all text-xs">
              {proofData.publicValues.slice(0, 10)}...
              {proofData.publicValues.slice(-8)}
            </span>
          </p>
          <p>
            <span className="font-medium">Proof Bytes:</span>{' '}
            <span className="break-all text-xs">
              {proofData.proof.slice(0, 10)}...{proofData.proof.slice(-8)}
            </span>
          </p>
        </div>
      )}

      {error && (
        <div className="mt-2 text-sm text-red-500">
          <p>{error}</p>
          <p className="text-xs mt-1">
            Check your network connection or server status.
          </p>
        </div>
      )}
    </div>
  );
};

export default GenerateProof;
