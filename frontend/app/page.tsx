// Home.tsx
'use client';

import { useState, useEffect } from 'react';
import TokenAllocation from './TokenAllocation';
import GenerateProof from './GenerateProof';
import VerifyProof from './VerifyProof';
import { startPolling } from './polling'; // Import the polling logic

type ProofData = {
  vkey: string;
  publicValues: string;
  proof: string;
};

export default function Home() {
  const [walletAddress, setWalletAddress] = useState('');
  const [proofData, setProofData] = useState<ProofData>({
    vkey: '',
    publicValues: '',
    proof: '',
  });
  const [isGenerating, setIsGenerating] = useState(false);

  // Wrap setProofData to include logging
  const handleSetProofData = (data: ProofData) => {
    setProofData(data);
  };

  // Start polling once when the component mounts
  useEffect(() => {
    startPolling(handleSetProofData, setIsGenerating);
    // No cleanup: polling continues indefinitely
  }, []); // Empty dependency array: runs once on mount

  return (
    <div className="flex items-center justify-center min-h-screen gap-4 p-4 bg-gray-900 text-white">
      <div className="flex flex-col md:flex-row gap-4 max-w-5xl w-full">
        <div className="flex-1">
          <TokenAllocation onWalletAddressChange={setWalletAddress} />
        </div>
        <div className="flex-1">
          <GenerateProof
            walletAddress={walletAddress}
            proofData={proofData}
            isGenerating={isGenerating}
            setIsGenerating={setIsGenerating}
          />
        </div>
        <div className="flex-1">
          <VerifyProof
            vkey={proofData.vkey}
            publicValues={proofData.publicValues}
            proof={proofData.proof}
          />
        </div>
      </div>
    </div>
  );
}
