'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type ProofData = {
  vkey: string;
  publicValues: string;
  proof: string;
};

interface GenerateProofProps {
  walletAddress?: string;
  proofData: ProofData;
  isGenerating: boolean; // Tracks generation status
  setIsGenerating: (value: boolean) => void; // Updates generation status
}

const KNOWN_VALID_ADDRESS = '0xe789a4B06Bc4b78F0Db311B74F537cEcBf64c302';

const GenerateProof = ({
  walletAddress: initialWalletAddress = '',
  proofData,
  isGenerating,
  setIsGenerating,
}: GenerateProofProps) => {
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState(initialWalletAddress);

  const startProofGeneration = async () => {
    if (!address) {
      setError('Please provide a wallet address');
      return;
    }

    setError(null);
    setIsGenerating(true); // Optimistically set to generating state

    try {
      const response = await fetch('/api/generate-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: address, system: 'groth16' }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to start proof generation: ${response.statusText}`
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to start proof generation'
      );
      setIsGenerating(false); // Re-enable on error
    }
    // No finally block needed since we don't rely on isLoading
  };

  const handleSelectKnownAddress = () => {
    setAddress(KNOWN_VALID_ADDRESS);
    setError(null);
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
          disabled={isGenerating} // Disable input during generation
        />
        <Button
          onClick={handleSelectKnownAddress}
          className="bg-gray-700 hover:bg-gray-600 text-white text-sm"
          disabled={isGenerating} // Disable button during generation
        >
          Use Known Valid Address ({KNOWN_VALID_ADDRESS.slice(0, 6)}...
          {KNOWN_VALID_ADDRESS.slice(-4)})
        </Button>
      </div>

      <Button
        onClick={startProofGeneration}
        className="w-full bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center"
        disabled={!address || isGenerating} // Disable if no address or generating
      >
        {isGenerating ? (
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

      <div className="mt-2 text-xs text-gray-400">
        Proof generation takes around 3 minutes. Try not to run multiple proofs
        at once.
      </div>

      {(proofData.vkey || proofData.publicValues || proofData.proof) && (
        <div className="mt-4 text-sm text-gray-400">
          <p className="text-gray-400 font-semibold">
            Most recently generated proof
          </p>
          <p className="flex justify-between">
            <span className="font-medium">Verification Key:</span>{' '}
            <span className="break-all text-xs">
              {proofData.vkey.slice(0, 10)}...{proofData.vkey.slice(-8)}
            </span>
          </p>
          <p className="flex justify-between">
            <span className="font-medium">Public Values:</span>{' '}
            <span className="break-all text-xs">
              {proofData.publicValues.slice(0, 10)}...
              {proofData.publicValues.slice(-8)}
            </span>
          </p>
          <p className="flex justify-between">
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
        </div>
      )}
    </div>
  );
};

export default GenerateProof;
