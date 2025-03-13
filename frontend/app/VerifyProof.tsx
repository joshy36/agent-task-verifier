'use client';

import { useState } from 'react';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { Button } from '@/components/ui/button';

const CONTRACT_ADDRESS = '0xfa9Cc30e4d458D6A327c8407414CcAfc61D0884c';
const ABI = [
  {
    name: 'verifyProof',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: '_vkey', type: 'bytes32' },
      { name: '_publicValues', type: 'bytes' },
      { name: '_proofBytes', type: 'bytes' },
    ],
    outputs: [
      { type: 'uint64' },
      { type: 'uint64' },
      { type: 'uint64' },
      { type: 'uint64' },
      { type: 'uint64' },
    ],
  },
] as const;

const EXISTING_PROOF = {
  vkey: '0x00993713b0a77bb6a30ac108493cb8ff4330fad739a2236bec515afdbbbf9b6b',
  publicValues:
    '0x000000000000000000000000000000000000000000000000e789a4b06bc4b78f000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000001e000000000000000000000000000000000000000000000000000000000000003c0000000000000000000000000000000000000000000000000000000000000001',
  proof:
    '0x11b6a09d162d45b6ef7b75be209659e0175446323760dc1fd19f3d471e787b813f99d6941946bf0ae30b03bd01ae6e6e31c65f12c2b6d55bad7878af40d1454f043963920fec4b8b6dc0fa46bc4a8d394c1302ff850e60ba86aa2749ea554070135739fe2393e7095b28868852bf0c0aab9d7a73717179df96fcced1d55ce9b715f7a5dd01d83f560d6e732d8f8034097ef454369350c37a2db617e517052a407918d64e068d38e4b156afe0cbc68837eae9cce2f88b82d50c97d5ba407474089c0ba7fd03ff0f02d9dcdba0a4a240ff32574c8833ad2b2c83e0743f57ae728dfde1ef380ae9779f45c00ac7f9f36805fa62be3185841240953edb1d479731a19e7639e7',
};

const WALLET_ADDRESS = '0xe789a4B06Bc4b78F0Db311B74F537cEcBf64c302';

interface VerifyProofProps {
  vkey: string;
  publicValues: string;
  proof: string;
}

const VerifyProof = ({ vkey, publicValues, proof }: VerifyProofProps) => {
  const [result, setResult] = useState<
    [number, number, number, number, number] | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);

  const verifyProof = async (proofData: {
    vkey: string;
    publicValues: string;
    proof: string;
  }) => {
    const loadingSetter =
      proofData === EXISTING_PROOF ? setIsLoadingExisting : setIsLoading;
    loadingSetter(true);
    setError(null);
    setResult(null);

    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(process.env.NEXT_PUBLIC_RPC_URL!),
    });

    try {
      const rawData = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: ABI,
        functionName: 'verifyProof',
        args: [
          proofData.vkey as `0x${string}`,
          proofData.publicValues as `0x${string}`,
          proofData.proof as `0x${string}`,
        ],
      });

      const resultTuple = rawData as [bigint, bigint, bigint, bigint, bigint];
      setResult([
        Number(resultTuple[0]),
        Number(resultTuple[1]),
        Number(resultTuple[2]),
        Number(resultTuple[3]),
        Number(resultTuple[4]),
      ]);
    } catch (err) {
      if ((err as { details?: string }).details?.includes('revert')) {
        setError('Proof verification failed: The contract rejected the proof.');
      } else if ((err as Error).message.includes('out of bounds')) {
        setError('Invalid response format from contract. Check the ABI.');
      } else if ((err as Error).message.includes('eth_call')) {
        setError('Network error: Failed to connect to the blockchain.');
      } else {
        setError('An unexpected error occurred. Please try again.');
        console.error('Detailed error:', err);
      }
    } finally {
      loadingSetter(false);
    }
  };

  const handleVerifyExistingProof = async () => {
    await verifyProof(EXISTING_PROOF);
  };

  return (
    <div className="bg-gray-900 p-4 rounded-lg w-full border border-gray-800">
      <h2 className="text-xl font-semibold mb-4 text-gray-300">Verify Proof</h2>
      {(vkey || publicValues || proof) && (
        <div className="my-4 text-sm text-gray-400">
          <p className="text-gray-400 font-semibold">
            Most recently generated proof
          </p>
          <p className=" flex justify-between">
            <span className="font-medium">Verification Key:</span>{' '}
            <span className="break-all text-xs">
              {vkey.slice(0, 10)}...{vkey.slice(-8)}
            </span>
          </p>
          <p className=" flex justify-between">
            <span className="font-medium">Public Values:</span>{' '}
            <span className="break-all text-xs">
              {publicValues.slice(0, 10)}...
              {publicValues.slice(-8)}
            </span>
          </p>
          <p className=" flex justify-between">
            <span className="font-medium">Proof Bytes:</span>{' '}
            <span className="break-all text-xs">
              {proof.slice(0, 10)}...{proof.slice(-8)}
            </span>
          </p>
        </div>
      )}
      <Button
        onClick={() => verifyProof({ vkey, publicValues, proof })}
        className="w-full bg-gray-700 hover:bg-gray-600 text-white mb-4"
        disabled={isLoading || !vkey || !publicValues || !proof}
      >
        {isLoading ? 'Verifying...' : 'Verify Generated Proof'}
      </Button>
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-300 mb-2">
          Existing Proof
        </h3>
        <div className="text-sm text-gray-400 space-y-2">
          <div>
            <p className="font-medium flex justify-between items-center">
              Verifier Contract:{' '}
              <a
                href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline flex items-center"
              >
                {CONTRACT_ADDRESS.slice(0, 6)}...{CONTRACT_ADDRESS.slice(-4)}
              </a>
            </p>
          </div>
          <div>
            <p className="font-medium flex justify-between items-center">
              Wallet:{' '}
              <a
                href={`https://sepolia.etherscan.io/address/${WALLET_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline flex items-center"
              >
                {WALLET_ADDRESS.slice(0, 6)}...{WALLET_ADDRESS.slice(-4)}
              </a>
            </p>
          </div>
          <div>
            <p className="font-medium">Verification Key:</p>
            <p className="break-all text-xs">
              {EXISTING_PROOF.vkey.slice(0, 10)}...
              {EXISTING_PROOF.vkey.slice(-8)}
            </p>
          </div>
          <div>
            <p className="font-medium">Public Values:</p>
            <p className="break-all text-xs">
              {EXISTING_PROOF.publicValues.slice(0, 10)}...
              {EXISTING_PROOF.publicValues.slice(-8)}
            </p>
          </div>
          <div>
            <p className="font-medium">Proof Bytes:</p>
            <p className="break-all text-xs">
              {EXISTING_PROOF.proof.slice(0, 10)}...
              {EXISTING_PROOF.proof.slice(-8)}
            </p>
          </div>
        </div>
        <Button
          onClick={handleVerifyExistingProof}
          className="w-full bg-gray-700 hover:bg-gray-600 text-white mt-2"
          disabled={isLoadingExisting}
        >
          {isLoadingExisting ? 'Verifying...' : 'Verify Existing Proof'}
        </Button>
      </div>
      {result && (
        <div className="mt-2 text-sm text-gray-400">
          <p className="text-green-400">Verification successful!</p>
          <p>wBTC: {result[1].toString()}</p>
          <p>ETH: {result[2].toString()}</p>
          <p>DOGE: {result[3].toString()}</p>
          <p>Status: {result[4].toString() === '1' ? 'Valid' : 'Invalid'}</p>
        </div>
      )}
      {error && (
        <div className="mt-2 text-sm text-red-500">
          <p>{error}</p>
          <p className="text-xs mt-1">
            Check your network connection and contract configuration.
          </p>
        </div>
      )}
    </div>
  );
};

export default VerifyProof;
