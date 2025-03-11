'use client';

import { useState } from 'react';
import { createPublicClient, http, createWalletClient, custom } from 'viem';
import { sepolia } from 'viem/chains';
import { Button } from '@/components/ui/button';

const CONTRACT_ADDRESS = '0xd5E4802Cc79C7067501124fA33cDD2f1cd2f22aC';
const ABI = [
  {
    name: 'verifyFibonacciProof',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: '_publicValues', type: 'bytes' },
      { name: '_proofBytes', type: 'bytes' },
    ],
    outputs: [{ type: 'uint32' }, { type: 'uint32' }, { type: 'uint32' }],
  },
  {
    name: 'ProofInvalid',
    type: 'error',
    inputs: [],
  },
] as const;

const PUBLIC_VALUES =
  '0x00000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000001a6d0000000000000000000000000000000000000000000000000000000000002ac2';
const PROOF =
  '0x11b6a09d27e42f8e881b9c1f2ddae066839bff31818df3c2a870ae804d7efc74e65f6fd326e581c67d782ede433dcc1d71dd1488a6bbc9bbde1d3fab4897a164d55dceb80ffbeee5dd74c7f50a3eb20d81192ce2e57d9df537230030fbff0c8ba267bcc51b8e1ecc21dfbe5089b33c05668d86a7d8aa6433418fd98e4bc55fc4613849241d8e2e79249214dde5bb55a5021655d4c45e17edb608db2b4ddf1ae6b0c3edfb0b6c879612536bf8ce3531fd3746752a0e0f78b119df0fea49da4a4ede74859d2dd22be55dad1942f15e26eeb5788a921a48eae493ef3ed3a9e7201ad870e23f24eff7e0de249715c000dd2b0fd2d3cf16108d779aafc59239c3b70c77d45ce7';

export default function Home() {
  const [result, setResult] = useState<[number, number, number] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verifyProof = async () => {
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(),
    });

    const walletClient = createWalletClient({
      chain: sepolia,
      // @ts-expect-error
      transport: custom(window.ethereum!),
    });

    const [account] = await walletClient.requestAddresses();

    try {
      const data = (await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: ABI,
        functionName: 'verifyFibonacciProof',
        args: [PUBLIC_VALUES, PROOF],
        account,
      })) as [number, number, number];
      setResult(data);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Proof verification failed');
      setResult(null);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4 bg-gray-900 text-white">
      <Button className="bg-gray-700 hover:bg-gray-600" onClick={verifyProof}>
        Verify Proof
      </Button>
      {result && (
        <div className="text-center">
          n: {result[0].toString()}, a: {result[1].toString()}, b:{' '}
          {result[2].toString()}
        </div>
      )}
      {error && <div className="text-red-500">Error</div>}
    </div>
  );
}
