'use client';

import { useState, useEffect } from 'react';
import TokenAllocation from './TokenAllocation';
import GenerateProof from './GenerateProof';
import VerifyProof from './VerifyProof';

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
  const [isGenerating, setIsGenerating] = useState(false); // New state to track generation

  useEffect(() => {
    const fetchProof = async () => {
      try {
        const res = await fetch('/api/receive-proof');
        const { data } = await res.json();
        if (data && data.vkey !== proofData.vkey) {
          // Only update if new data
          console.log('Polled proof data:', data);
          setProofData({
            vkey: data.vkey,
            publicValues: data.public_values,
            proof: data.proof,
          });
          setIsGenerating(false); // Re-enable the button when proof is received
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    fetchProof(); // Initial fetch
    const interval = setInterval(fetchProof, 2000); // Poll every 2 seconds

    return () => {
      clearInterval(interval);
      console.log('Polling stopped');
    };
  }, [proofData.vkey]); // Dependency to avoid unnecessary updates

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
