'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

type ProofData = {
  vkey: string;
  publicValues: string;
  proof: string;
};

interface GenerateProofProps {
  walletAddress: string;
  onProofGenerated: (data: ProofData) => void;
}

const GenerateProof = ({
  walletAddress,
  onProofGenerated,
}: GenerateProofProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateProof = async () => {
    if (!walletAddress) {
      setError('Please provide a wallet address');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Mock API call
      const response = await fetch('/api/generate-proof', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate proof');
      }

      const data: ProofData = await response.json();
      onProofGenerated(data);
    } catch (err) {
      setError((err as Error).message || 'Failed to generate proof');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 p-4 rounded-lg w-full border border-gray-800">
      <h2 className="text-xl font-semibold mb-4 text-gray-300">
        Generate Proof
      </h2>
      <div>{walletAddress}</div>
      <Button
        onClick={generateProof}
        className="w-full bg-gray-700 hover:bg-gray-600 text-white"
        disabled={isLoading || !walletAddress}
      >
        {isLoading ? 'Generating...' : 'Generate Proof'}
      </Button>
      {error && <div className="mt-2 text-red-500 text-sm">{error}</div>}
    </div>
  );
};

export default GenerateProof;
