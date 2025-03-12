import { NextRequest, NextResponse } from 'next/server';
import {
  createWalletClient,
  http,
  createPublicClient,
  encodeFunctionData,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

const PRIVATE_KEY = process.env.PRIVATE_KEY!;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL!;

const CONTRACT_ADDRESSES = {
  ETH: '0x6B03130617E98A98B40abD02f46c4a9C8443D416' as const,
  DOGE: '0x393F64252e0a8f9461152Dc9501393dD860f5429' as const,
  WBTC: '0xf25e4e1efb5d58888eD81B4F57EfA7F2C8627a5C' as const,
};

const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    name: 'decimals',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress, allocations } = body as {
      walletAddress: string;
      allocations: { ETH: number; DOGE: number; WBTC: number };
    };

    // Validate input
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address' },
        { status: 400 }
      );
    }
    if (!allocations || typeof allocations !== 'object') {
      return NextResponse.json(
        { error: 'Invalid allocations' },
        { status: 400 }
      );
    }

    // Validate private key
    if (!PRIVATE_KEY) {
      throw new Error('PRIVATE_KEY environment variable is not set');
    }
    const privateKey = PRIVATE_KEY.startsWith('0x')
      ? PRIVATE_KEY
      : `0x${PRIVATE_KEY}`;
    if (!privateKey.match(/^0x[0-9a-fA-F]{64}$/)) {
      throw new Error('PRIVATE_KEY is not a valid 32-byte hex string');
    }

    // Set up viem clients
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(RPC_URL),
    });
    const walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http(RPC_URL),
    });

    // Check native ETH balance (for gas fees)
    const nativeBalance = await publicClient.getBalance({
      address: account.address,
    });
    console.log(
      `Native ETH Balance: ${nativeBalance} wei (${
        Number(nativeBalance) / 1e18
      } ETH)`
    );

    const transactions: { symbol: string; txHash: string }[] = [];

    // Process each token allocation
    for (const [tokenSymbol, amount] of Object.entries(allocations)) {
      if (amount <= 0) continue;

      const contractAddress =
        CONTRACT_ADDRESSES[tokenSymbol as keyof typeof CONTRACT_ADDRESSES];
      if (!contractAddress) {
        throw new Error(`No contract address for ${tokenSymbol}`);
      }

      // Get token decimals
      const decimals = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'decimals',
      });

      // Calculate amount in token units
      const amountInUnits = BigInt(Math.floor(amount * 10 ** decimals));

      // Check token balance
      const tokenBalance = (await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [account.address],
      })) as bigint;

      if (tokenBalance < amountInUnits) {
        throw new Error(
          `Insufficient ${tokenSymbol} balance: have ${
            Number(tokenBalance) / 10 ** decimals
          }, need ${amount}`
        );
      }

      // Estimate gas for the transaction
      const gasEstimate = await publicClient.estimateGas({
        account,
        to: contractAddress as `0x${string}`,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [walletAddress as `0x${string}`, amountInUnits],
        }),
      });
      const gasPrice = await publicClient.getGasPrice();
      const gasCost = gasEstimate * gasPrice;

      if (nativeBalance < gasCost) {
        throw new Error(
          `Insufficient ETH for gas: have ${
            Number(nativeBalance) / 1e18
          } ETH, need ${Number(gasCost) / 1e18} ETH`
        );
      }

      // Execute the ERC-20 transfer
      const hash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [walletAddress as `0x${string}`, amountInUnits],
      });
      transactions.push({ symbol: tokenSymbol, txHash: hash });
    }

    return NextResponse.json({
      success: true,
      message: 'Transactions submitted successfully',
      transactions, // Array of { symbol, txHash }
    });
  } catch (error) {
    console.error('Send error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send tokens',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
