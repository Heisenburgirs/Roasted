// /app/page.tsx
"use client";

import { useState, useEffect, useMemo, ChangeEvent } from "react";
import { useUpProvider } from "./upProvider";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { connectUP } from "../lib/up-connector";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExclamationTriangleIcon, CheckCircledIcon, ArrowLeftIcon, GearIcon } from "@radix-ui/react-icons";
import { Badge } from "@/components/ui/badge";
import { useSession } from "next-auth/react";
import { useProfile } from "./provider/profileProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner"
import roasted from "../../public/roasted.gif"
import roastedTwitter from "../../public/roasted.webp"
import { useGridOwner } from "./provider/gridOwnerProvider";
import { ethers } from "ethers";
import { ROASTADDRESS } from "./constants/constants";
import Roasted from "./constants/Roasted.json";
import UniversalProfileArtifacts from '@lukso/lsp-smart-contracts/artifacts/UniversalProfile.json';
import {
  createPublicClient,
  custom,
  decodeFunctionResult,
  encodeFunctionData,
  http,
} from "viem";
import { lukso, luksoTestnet } from "viem/chains";
import { useRoastProvider } from './provider/roastProvider';
import { ERC725 } from "@erc725/erc725.js";
import { RoastNFT, useRoastNFTs } from './hooks/useRoastNFTs';
import { useInView } from 'react-intersection-observer';

// Extend Window interface to include our custom properties
declare global {
  interface Window {
    contextAccounts?: string[];
    twitterLinkSuccess?: () => void;
  }
}

// Helper function to format address as handle
function formatAddressAsHandle(address: string): string {
  if (!address) return "@Unknown";
  return "@" + address.replace("0x", "").substring(0, 6);
}

// Roasting steps
type RoastStep = "initial" | "chooseType" | "customRoast" | "aiRoast" | "minting" | "success";

// Simplified and fixed FloatingEmojis component
const FloatingEmojis = () => {
  const emojis = ["🔥", "😂", "💥", "🤣", "🔥", "😆", "🌶️", "🔥", "💯", "🤣", "🧨", "🔥", "😂", "☄️"];
  
  // Create a fixed array of emoji configurations using a deterministic seed
  const emojiConfigs = useMemo(() => {
    // Use a fixed seed for consistent initial render
    let seed = 12345;
    const seededRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      emoji: emojis[Math.floor(seededRandom() * emojis.length)],
      x: seededRandom() * 100,
      y: seededRandom() * 100,
      scale: 0.5 + seededRandom() * 1.5,
      rotation: seededRandom() * 360,
      duration: 2 + seededRandom() * 3,
      delay: seededRandom() * 2,
    }));
  }, []);

  return (
    <>
      {emojiConfigs.map((item) => (
        <motion.div
          key={item.id}
          className="absolute text-white pointer-events-none"
          style={{
            left: `${item.x}%`,
            top: `${item.y}%`,
            fontSize: `${item.scale}rem`,
          }}
          initial={{ opacity: 0, scale: 0.5, rotate: 0 }}
          animate={{ 
            opacity: [0, 1, 0],
            scale: [0.5, 1, 1.2],
            rotate: [0, item.rotation],
            y: [0, -50, -100]
          }}
          transition={{ 
            duration: item.duration,
            delay: item.delay,
            repeat: Infinity,
            repeatDelay: 1
          }}
        >
          {item.emoji}
        </motion.div>
      ))}
    </>
  );
};

export default function Home() {
  const { contextAccounts, accounts, walletConnected, chainId, provider, client } = useUpProvider();
  const { profileData, isLoading: profileLoading } = useProfile();
  const { ready, authenticated, login, logout, user } = usePrivy();
  //const { wallets } = useWallets();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [twitterAuthLoading, setTwitterAuthLoading] = useState(false);
  const [userDocument, setUserDocument] = useState<any>(null);
  const [isRoastable, setIsRoastable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isGridOwner = contextAccounts[0]?.toLowerCase() === accounts[0]?.toLowerCase();
  const { data: session } = useSession();
  const { contractBalance, pricePerRoast, refreshContractData } = useGridOwner();
  const { targetRoastPrice, loadingRoastPrice } = useRoastProvider();
  
  // Roasting state
  const [roastStep, setRoastStep] = useState<RoastStep>("initial");
  const [customRoast, setCustomRoast] = useState("");
  const [aiRoast, setAiRoast] = useState("");
  const [roastPrice, setRoastPrice] = useState(0);
  const [inputValue, setInputValue] = useState<string>("");
  const [activeTab, setActiveTab] = useState('received');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [updatingPrice, setUpdatingPrice] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  // Add these state variables
  const [aiContext, setAiContext] = useState<string>("");
  const [isRoastGenerating, setIsRoastGenerating] = useState<boolean>(false);
  const [aiSuggestion, setAiSuggestion] = useState<boolean>(true);

  // Add these state variables in the component
  const [offset, setOffset] = useState(0);
  const { data: roastsData, loading: loadingRoasts, fetchMore } = useRoastNFTs(10, offset);
  const { ref: loadMoreRef, inView } = useInView();

  // Add this state variable at the top of the component with other states
  const [tippingStates, setTippingStates] = useState<{ [key: string]: 'idle' | 'loading' | 'tipped' }>({});

  // Add this state at the top of the component with other states
  const [selectedRoast, setSelectedRoast] = useState<RoastNFT | null>(null);

  // Add this state at the top of the component with other states
  const [viewingRoast, setViewingRoast] = useState<RoastNFT | null>(null);

  // Add this state to track which roasts we've already processed
  const [processedOffsets, setProcessedOffsets] = useState<number[]>([]);

  // Add this state to store the timeout ID
  const [autoRefreshTimeout, setAutoRefreshTimeout] = useState<NodeJS.Timeout | null>(null);

  // Auto-clear error messages after a timeout
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000); // Clear error after 5 seconds
      
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Fetch user document from API when wallet is connected
  const fetchUserDocument = async () => {
    if (!contextAccounts || contextAccounts.length === 0) return;
    
    setIsLoading(true);
    try {
      const walletAddress = contextAccounts[0].toLowerCase();
      console.log('Client: Fetching user data for address:', walletAddress);
      
      const response = await fetch(`/api/user?address=${walletAddress}`);
      
      console.log('Client: API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Client: API error response:', errorText);
        throw new Error('Failed to fetch user data');
      }
      
      const data = await response.json();
      console.log('Client: API response data:', data);
      
      if (data.success) {
        if (data.exists) {
          setUserDocument(data.data);
          setIsRoastable(data.data?.canBeRoasted || false);
        } else {
          console.log('Client: No document found for this wallet address');
          setUserDocument(null);
          setIsRoastable(false);
        }
      } else {
        throw new Error(data.error || 'API returned error');
      }
    } catch (err) {
      console.error("Error fetching user document:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch user data");
    } finally {
      setIsLoading(false);
    }
  };

  // Set up callback for Twitter link success
  useEffect(() => {
    // Define the callback function that will be called from the popup
    window.twitterLinkSuccess = () => {
      console.log("Twitter link successful, refreshing data");
      fetchUserDocument();
    };
    
    // Clean up the callback when component unmounts
    return () => {
      delete window.twitterLinkSuccess;
    };
  }, []);

  // Fetch user document when wallet is connected
  useEffect(() => {
    if (walletConnected && contextAccounts && contextAccounts.length > 0) {
      fetchUserDocument()
    }
  }, [walletConnected, contextAccounts]);

  // Handle UP connection and Privy authentication
  /*const handleConnectUP = async () => {
    if (!ready) return;
    setLoading(true);
    setError(null);
    
    try {
      // Connect to UP provider
      const { address } = await connectUP();
      
      // Connect wallet through Privy
      await wallets[0].loginOrLink();
      
      // Find the connected wallet and authenticate
      const connectedWallet = wallets.find(wallet => 
        wallet.address.toLowerCase() === address.toLowerCase()
      );
      
      if (connectedWallet) {
        await connectedWallet.loginOrLink();
        console.log("Authenticated with UP:", address);
      } else {
        throw new Error("Connected wallet not found in Privy wallets");
      }
    } catch (error) {
      console.error("Failed to connect/authenticate:", error);
      setError(error instanceof Error ? error.message : "Failed to connect");
    } finally {
      setLoading(false);
    }
  };*/

  // Auto-authenticate when wallet is connected
  /*useEffect(() => {
    if (walletConnected && wallets.length > 0 && !authenticated && ready) {
      const autoAuthenticate = async () => {
        try {
          await wallets[0].loginOrLink();
          console.log("Auto-authenticated with wallet:", wallets[0].address);
        } catch (error) {
          console.error("Auto-authentication failed:", error);
        }
      };
      
      autoAuthenticate();
    }
  }, [walletConnected, wallets, authenticated, ready]);*/

  // Handle Twitter auth button click
  const [clickedAuth, setClickedAuth] = useState(false);

  const handleTwitterAuth = () => {
    setTwitterAuthLoading(true);
    setClickedAuth(true);
    setError(null);
    
    const walletAddress = contextAccounts?.[0] || '';
    
    const width = 600;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    window.open(
      `/authenticatedX?wallet=${encodeURIComponent(walletAddress)}`,
      'Twitter Authentication',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    // Reset loading state after a reasonable time
    setTimeout(() => {
      setTwitterAuthLoading(false);
    }, 1000);

    // Store the timeout ID for the auto-refresh
    const timeoutId = setTimeout(() => {
      fetchUserDocument();
      setClickedAuth(false);
    }, 15000);

    setAutoRefreshTimeout(timeoutId);
  };

  const handleLogin = () => {
    // Clear the auto-refresh timeout if it exists
    if (autoRefreshTimeout) {
      clearTimeout(autoRefreshTimeout);
      setAutoRefreshTimeout(null);
    }
    
    setClickedAuth(false);
    fetchUserDocument();
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Allow empty input or valid number formats (including partial decimals like "0.")
    if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
      setInputValue(value);

      // Only update roastPrice if it's a valid, complete number
      if (value !== "" && !value.endsWith(".")) {
        setRoastPrice(parseFloat(value) || 0);
      }
    }
  };

  const handleBlur = () => {
    // On blur, finalize the value to a number
    if (inputValue === "" || inputValue.endsWith(".")) {
      setInputValue(roastPrice.toString());
    }
  };
  
  // Render Twitter connection status or button
  const renderTwitterStatus = () => {
    if (isLoading) {
      return <p className="h-full w-full flex justify-center items-center text-[18px] animate-pulse text-[#281f20]">Loading account status...</p>;
    }
    
    if (userDocument && (isRoastable || userDocument.canBeRoasted)) {
      return (
        <div className="w-full space-y-4 h-full">
          <AnimatePresence mode="wait" initial={false}>
            {!showSettings ? (
              // Main Profile View
              <motion.div
                key="main-profile-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-2"
              >
                {/* Profile Header */}
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-[#281f20]">
                      <AvatarImage src={profileData?.profileImage || ""} alt={profileData?.name || "Profile"} />
                      <AvatarFallback className="bg-[#fffd01] text-[#281f20] font-bangers">
                        {(profileData?.name || "UP").substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-bangers text-lg text-[#281f20]">{profileData?.name || "GENERIC PROFILE"}</h3>
                      <p className="text-xs text-[#281f20] italic">@{formatAddressAsHandle(contextAccounts[0] || "").substring(1)}</p>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => setShowSettings(true)}
                    className="h-[32px] w-[32px] bg-[#fffd01] text-[#281f20] border-2 border-[#281f20] hover:cursor-pointer font-bangers hover:bg-[#fffd01] hover:opacity-90 shadow-md transform hover:-translate-y-0.5 transition-all"
                  >
                    <GearIcon className="h-5 w-5" />
                  </Button>
                </div>

                <div className="flex items-center justify-between bg-white rounded-lg p-2 border-2 border-[#281f20] shadow-md tracking-wide">
                  <div className="flex items-center gap-2">
                    <p className="text-[#281f20] text-sm font-medium font-bangers">EARNINGS</p>
                    <p className="text-[#ec1a1f] font-bangers text-lg font-bold">${contractBalance && contractBalance.toFixed(3) || '0.00'}</p>
                  </div>
                  <Button
                    onClick={async () => {
                      if (!walletConnected || !contextAccounts || contextAccounts.length === 0) return;
                      
                      setWithdrawing(true);
                      try {
                        // Show pending toast
                        toast.info("Processing withdrawal...", {
                          duration: 5000,
                          position: "bottom-center",
                        });

                        const txHash = await client?.writeContract({
                          address: ROASTADDRESS as `0x${string}`,
                          abi: Roasted,
                          functionName: "withdraw",
                          args: [],
                          account: accounts[0],
                          chain: lukso,
                        });

                        const publicClient = createPublicClient({
                          chain: chainId === 42 ? lukso : luksoTestnet,
                          transport: http(),
                        });

                        await publicClient.waitForTransactionReceipt({
                          hash: txHash as `0x${string}`,
                        });

                        // Show success toast
                        toast.success("Withdrawal successful!", {
                          duration: 3000,
                          position: "bottom-center",
                        });

                        // Refresh the contract data
                        await refreshContractData();
                      } catch (err) {
                        console.error("Error withdrawing:", err);
                        toast.error("Failed to withdraw", {
                          duration: 2000,
                          position: "bottom-center",
                        });
                      } finally {
                        setWithdrawing(false);
                      }
                    }}
                    disabled={withdrawing || !contractBalance || contractBalance <= 0}
                    className="bg-white text-[#281f20] border-2 border-[#281f20] hover:cursor-pointer font-bangers hover:bg-white  hover:opacity-90 shadow-md transform hover:-translate-y-0.5 transition-all h-8 px-3"
                  >
                    {withdrawing ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-[#281f20]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        WITHDRAWING
                      </span>
                    ) : (
                      "WITHDRAW"
                    )}
                  </Button>
                </div>

                {/* Roasts Table */}
                <div className="bg-white rounded-lg p-3 border-2 border-[#281f20] shadow-md h-[275px] overflow-hidden">
                  <div className="flex items-center justify-between mb-3 border-b-2 border-[#281f20] pb-2 sticky top-0 bg-white">
                    <h3 className="font-bangers text-[#281f20]">ROASTS</h3>
                    <Button 
                      onClick={() => setViewingRoast(null)}
                      variant="ghost"
                      size="sm"
                      className={`${viewingRoast ? "block" : "invisible"} p-0 h-8 w-8 hover:bg-transparent hover:cursor-pointer hover:bg-gray-100 transition `}
                    >
                      Back
                    </Button>
                  </div>
                  
                  <div className="overflow-x-auto">
                    {!viewingRoast ? (
                      // List View
                      <table className="w-full">
                        <tbody>
                          {roastsData?.Token.map((roast) => (
                            <tr key={roast.id} className="border-b border-gray-100">
                              <td className="py-1 text-sm text-[#281f20]">
                                {roast.roaster || "Unknown"} ROASTED {roast.roastee || "Unknown"}
                              </td>
                              <td className="py-1 text-right">
                                <Button
                                  onClick={() => setViewingRoast(roast)}
                                  className="text-xs bg-white hover:bg-[#fffd01] text-[#281f20] border-2 border-[#281f20] tracking-widest transition hover:cursor-pointer font-bangers hover:opacity-90 shadow-md h-6 px-2"
                                >
                                  VIEW
                                </Button>
                              </td>
                            </tr>
                          ))}
                          
                          {/* Loading indicator */}
                          {loadingRoasts && (
                            <tr>
                              <td colSpan={3} className="py-3 text-center">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#281f20] mx-auto"></div>
                              </td>
                            </tr>
                          )}
                          
                          {/* Load more trigger */}
                          <tr ref={loadMoreRef}>
                            <td colSpan={3}></td>
                          </tr>
                          
                          {/* No roasts message */}
                          {!loadingRoasts && roastsData?.Token.length === 0 && (
                            <tr>
                              <td colSpan={3} className="py-3 text-center text-sm text-[#281f20]">
                                NO ROASTS YET
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    ) : (
                      // Detail View
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs text-[#281f20] mb-2">
                            <div>
                              <span className="font-bold">From:</span> {viewingRoast.roaster}
                            </div>
                            <div>
                              <span className="font-bold">To:</span> {viewingRoast.roastee}
                            </div>
                          </div>
                          <div className="bg-gray-200 p-3 rounded-lg"> 
                            {/* Roast text with padding to avoid overlapping with quote marks */}
                            <p className="text-sm text-[#281f20] whitespace-pre-wrap z-10 px-4">
                              {viewingRoast.description}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex justify-end">
                          <Button
                            onClick={async () => {
                              if (!walletConnected || !contextAccounts || contextAccounts.length === 0) return;
                              
                              setTippingStates(prev => ({
                                ...prev,
                                [viewingRoast.id]: 'loading'
                              }));
                              
                              try {
                                toast.info("Processing tip...", {
                                  duration: 5000,
                                  position: "bottom-center",
                                });

                                const txHash = await client?.writeContract({
                                  address: ROASTADDRESS as `0x${string}`,
                                  abi: Roasted,
                                  functionName: "tipRoast",
                                  args: [viewingRoast.tokenId],
                                  value: ethers.parseEther("0.01"),
                                  account: accounts[0],
                                  chain: lukso,
                                });

                                const publicClient = createPublicClient({
                                  chain: chainId === 42 ? lukso : luksoTestnet,
                                  transport: http(),
                                });

                                await publicClient.waitForTransactionReceipt({
                                  hash: txHash as `0x${string}`,
                                });

                                setTippingStates(prev => ({
                                  ...prev,
                                  [viewingRoast.id]: 'tipped'
                                }));

                                toast.success("Tip sent successfully!", {
                                  duration: 3000,
                                  position: "bottom-center",
                                });

                                setTimeout(() => {
                                  setTippingStates(prev => ({
                                    ...prev,
                                    [viewingRoast.id]: 'idle'
                                  }));
                                }, 3000);

                              } catch (err) {
                                console.error("Error sending tip:", err);
                                toast.error("Failed to send tip", {
                                  duration: 2000,
                                  position: "bottom-center",
                                });
                                
                                setTippingStates(prev => ({
                                  ...prev,
                                  [viewingRoast.id]: 'idle'
                                }));
                              }
                            }}
                            disabled={tippingStates[viewingRoast.id] === 'loading'}
                            className={`text-xs ${
                              tippingStates[viewingRoast.id] === 'tipped' 
                                ? 'bg-green-500 hover:bg-green-500'
                                : 'bg-[#ef1a22] hover:bg-[#ef1a22]'
                            } text-white border-2 border-[#281f20] tracking-widest transition hover:cursor-pointer font-bangers hover:opacity-90 shadow-md h-8 px-4`}
                          >
                            {tippingStates[viewingRoast.id] === 'loading' ? (
                              <span className="flex items-center gap-2">
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                TIPPING
                              </span>
                            ) : tippingStates[viewingRoast.id] === 'tipped' ? (
                              "TIPPED! 🎉"
                            ) : (
                              "TIP (0.01 LYX) 🔥"
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              // Settings View
              <motion.div
                key="settings-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Settings Header */}
                <div className="flex items-center gap-2 mb-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="p-0 h-8 w-8 hover:bg-gray-100 transition hover:cursor-pointer"
                    onClick={() => setShowSettings(false)}
                  >
                    <ArrowLeftIcon className="h-5 w-5 text-[#281f20]" />
                  </Button>
                  <h3 className="font-bangers text-lg text-[#281f20]">ACCOUNT SETTINGS</h3>
                </div>
                
                {/* Roast Price Setting */}
                <motion.div 
                  className="bg-white rounded-lg p-4 border-2 border-[#281f20] shadow-md"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <h3 className="text-[#281f20] font-bold mb-3 font-bangers tracking-wide">PRICE PER 🔥</h3>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={inputValue}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className="border-2 border-[#281f20] text-[#281f20] font-medium"
                      placeholder="ENTER PRICE"
                    />
                    <Button 
                      onClick={handleUpdateRoastPrice}
                      disabled={updatingPrice || roastPrice === userDocument?.roastPrice}
                      className={`${
                        updatingPrice ? 'bg-gray-300' : 'bg-[#fffd01]'
                      } text-[#281f20] border-2 border-[#281f20] transition hover:cursor-pointer font-bangers hover:bg-[#fffd01] hover:opacity-90 shadow-md`}
                    >
                      {updatingPrice ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-[#281f20]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          UPDATING
                        </span>
                      ) : (
                        "UPDATE"
                      )}
                    </Button>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs italic text-[#281f20]">SET PRICE PER 🔥</p>
                    <p className="text-xs font-medium text-[#281f20]">
                      Current: <span className="text-[#ec1a1f] font-bold tracking-wider">{pricePerRoast && pricePerRoast.toFixed(4) || '0.00'} LYX</span>
                    </p>
                  </div>
                </motion.div>
                
                {/* Twitter Connection */}
                <div className="bg-white rounded-lg p-4 border-2 border-[#281f20] shadow-md">
                  <h3 className="text-[#281f20] font-bold mb-3 font-bangers">X ACCOUNT</h3>
                  <div className="flex items-center gap-2">
                    <img src={userDocument?.twitterImage} className="w-10 h-10 rounded-full"/>
                    <div className="flex flex-col gap-[2px]">
                      <p>{userDocument?.twitterUsername}</p>
                      <p className="text-xs text-[#281f20]">@{userDocument?.twitterHandle}</p>
                    </div>
                  </div>
                </div>
                
                {/* Back Button 
                <Button 
                  onClick={() => setShowSettings(false)}
                  className="w-full bg-white text-[#281f20] border-2 border-[#281f20] transition hover:cursor-pointer font-bangers hover:bg-gray-100 shadow-md"
                >
                  BACK TO PROFILE
                </Button>*/}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    } else {
      // Keep the existing Twitter connect button
      return (
        clickedAuth ? (
          <Button 
            onClick={handleLogin}
            disabled={twitterAuthLoading}
            variant="outline"
            className="w-full transition hover:cursor-pointer border-2 border-[#281f20] font-bangers"
          >
            Login
          </Button>
        )
        :
        (
          <Button 
            onClick={handleTwitterAuth}
            disabled={twitterAuthLoading}
            variant="outline"
            className="w-full transition hover:cursor-pointer border-2 border-[#281f20] font-bangers"
          >
            {twitterAuthLoading ? "OPENING X AUTH..." : "CONNECT X ACCOUNT"}
          </Button>
        )
      );
    }
  };

  // Render Universal Profile information
  const renderProfileInfo = () => {
    const address = contextAccounts[0] || "";
    const handle = formatAddressAsHandle(address);
    const name = profileData?.name || "Universal Profile";
    const imageUrl = profileData?.profileImage || "";
    
    return (
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 border border-gray-200">
          <AvatarImage src={imageUrl} alt={name} />
          <AvatarFallback>{name.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{name}</p>
          <p className="text-sm text-muted-foreground">{handle}</p>
        </div>
      </div>
    );
  };

  // Handle roast button click
  const handleRoastClick = () => {
    setRoastStep("chooseType");
  };

  // Add this function to handle AI roast generation
  const handleAiRoast = async () => {
    setIsRoastGenerating(true);
    
    try {
      // Call our Grok API endpoint
      console.log("Generating roast with AI...");
      console.log(aiContext);
      console.log(userDocument?.twitterHandle);
      const response = await fetch('/api/grok', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          context: aiContext,
          roasteeHandle: userDocument?.twitterHandle || 'unknown' // Pass Twitter handle if available
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate roast');
      }
      
      const data = await response.json();
      setAiRoast(data.roast);
      setAiSuggestion(false);
    } catch (error) {
      console.error('Error generating AI roast:', error);
      toast.info("Failed to generate roast. Please try again.", {
        duration: 3000,
        position: "bottom-center",
      });
    } finally {
      setIsRoastGenerating(false);
    }
  };

  // Render roasting UI based on current step
  const renderRoastingUI = () => {
    const profileName = profileData?.name || "This person";
    
    switch (roastStep) {
      case "customRoast":
        return (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-4">
              <Button 
                variant="ghost" 
                size="sm" 
                className="p-0 h-8 w-8 hover:cursor-pointer"
                onClick={() => setRoastStep("chooseType")}
              >
                <ArrowLeftIcon className="h-4 w-4" />
              </Button>
              <h3 className="font-medium">Write Your Roast</h3>
            </div>
            
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Textarea
                placeholder={`Roast ${profileName} here...`}
                className="min-h-[120px]"
                value={customRoast}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomRoast(e.target.value)}
              />
            </motion.div>
            
            <Button
              onClick={() => handleRoast(customRoast, "custom")}
              disabled={isRoasting || !customRoast.trim()}
              className="w-full bg-[#ec1a1f] hover:bg-[#ec1a1f]/90 transition hover:cursor-pointer text-white font-bold py-3 rounded-md border-2 border-[#281f20] shadow-md"
            >
              {isRoasting ? "MINTING ROAST 🔥..." : "FINISH ROASTING 🔥"}
            </Button>
          </div>
        );

      case "aiRoast":
        return (
          <div className="flex flex-col gap-4">
            {aiSuggestion ? (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="p-0 h-8 w-8 hover:cursor-pointer transition"
                    onClick={() => setRoastStep("chooseType")}
                  >
                    <ArrowLeftIcon className="h-4 w-4" />
                  </Button>
                  <h3 className="font-medium">AI Roast Suggestions</h3>
                </div>
                
                <textarea
                  value={aiContext}
                  disabled={isRoastGenerating}
                  onChange={(e) => setAiContext(e.target.value)}
                  placeholder="Give the AI some context on what to roast (e.g., their profile, tweets, appearance...)"
                  className={`w-full h-32 p-3 border-2 border-[#281f20] rounded-md focus:outline-none focus:ring-2 focus:ring-[#ec1a1f] ${isRoastGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
                
                <Button 
                  onClick={handleAiRoast}
                  className="w-full hover:cursor-pointer transition bg-[#fffc03] hover:bg-[#fffc03] opacity-95 hover:opacity-100 text-black font-bangers transition hover:cursor-pointer transform shadow-lg border-2 border-[#281f20]"
                  disabled={!aiContext.trim() || isRoastGenerating}
                >
                  {isRoastGenerating ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#281f20] mr-2"></div>
                      GENERATING...
                    </div>
                  ) : (
                    "GENERATE ROAST 🤖"
                  )}
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="p-0 h-8 w-8 hover:cursor-pointer transition"
                    onClick={() => setRoastStep("chooseType")}
                  >
                    <ArrowLeftIcon className="h-4 w-4" />
                  </Button>
                  <h3 className="font-medium" onClick={() => setAiSuggestion(true)}>AI Generated Roast</h3>
                </div>
                
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {aiRoast ? (
                    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
                      <p >{aiRoast}</p>
                      <div className="flex items-center mt-2 text-xs text-muted-foreground">
                        <span className="mr-1">🤖</span> Generated by AI
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-center py-8">
                      <div className="w-8 h-8 border-4 border-blue-400 border-t-blue-600 rounded-full animate-spin"></div>
                    </div>
                  )}
                </motion.div>
                
                <Button
                  onClick={() => handleRoast(aiRoast, "ai")}
                  disabled={isRoasting || !aiRoast.trim()}
                  className="w-full bg-[#ec1a1f] hover:bg-[#ec1a1f]/90 transition hover:cursor-pointer text-white font-bold py-3 rounded-md border-2 border-[#281f20] shadow-md"
                >
                  {isRoasting ? "MINTING ROAST 🔥..." : "FINISH ROASTING 🔥"}
                </Button>
              </>
            )}
          </div>
        );

      case "minting":
        return (
          <div className="flex flex-col items-center justify-center gap-6 p-8">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#ec1a1f]"></div>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-[#281f20] mb-2">MINTING YOUR ROAST</h3>
              <p className="text-gray-600">
                Please wait while your roast is being immortalized on the blockchain...
              </p>
            </div>
            <div className="w-full max-w-md bg-gray-100 rounded-lg p-4 mt-4">
              <div className="animate-pulse flex space-x-4">
                <div className="flex-1 space-y-4 py-1">
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-300 rounded"></div>
                    <div className="h-4 bg-gray-300 rounded w-5/6"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "success":
        return (
          <div className="space-y-4 text-center">
            <div>
              <motion.h3 
                className="text-[20px] base:text-[32px] md:text-[40px] font-bold text-[#fffc03] text-shadow-fire"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <span className="text-[#fffc03] text-shadow-fire">🔥</span> ROASTED <span className="text-[#ef1a22] text-shadow-fire">🔥</span>
              </motion.h3>
              
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
                className="my-4 rounded-lg overflow-hidden max-w-md mx-auto"
              >
                <img 
                  src={roasted.src}
                  alt="Michael Scott saying Boom Roasted" 
                  className="w-full h-auto"
                />
              </motion.div>
            </div>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="space-y-3"
            >
              <Button 
                onClick={() => {
                  // Create share text based on whether it was a custom or AI roast
                  const roastText = customRoast || aiRoast;
                  const shareText = `I just roasted someone Onchain! #roasted 🔥\n\n"${roastText.substring(0, 150)}${roastText.length > 150 ? '...' : ''}"\n\nGet paid for your best roasts at roasted.xyz`;
                  
                  // Encode the text for URL
                  const encodedText = encodeURIComponent(shareText);
                  
                  // Open Twitter share dialog
                  window.open(`https://twitter.com/intent/tweet?text=${encodedText}`, '_blank');
                }}
                className="w-full bg-[#fffc03] hover:bg-[#fffc03] opacity-90 hover:opacity-100 text-black font-bangers transition hover:cursor-pointer transform shadow-lg border-2 border-[#281f20]"
              >
                Share your Roast on <span className="mr-2">𝕏</span>
              </Button>

              <Button 
                onClick={() => {
                  // Reset all roast inputs
                  setCustomRoast("");
                  setAiRoast("");
                  setAiContext("");
                  setIsRoastGenerating(false);
                  setAiSuggestion(true);
                  // Return to initial state
                  setRoastStep("initial");
                }}
                variant="outline"
                className="w-full hover:cursor-pointer transition-all hover:bg-[#241d1f] hover:text-white font-bangers"
              >
                Roast AGAIN
              </Button>
            </motion.div>
          </div>
        );

      default:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="w-full"
          >
            {roastStep === "initial" && (
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Button 
                  onClick={handleRoastClick}
                  className="w-full py-6 text-[32px] rounded-lg font-bold bg-[#fffc03] hover:bg-[#fffc03] opacity-90 hover:opacity-100 text-black font-bangers transition hover:cursor-pointer transform shadow-lg border-2 border-[#281f20]"
                >
                  ROAST 🔥
                </Button>
              </motion.div>
            )}
            
            {roastStep === "chooseType" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="p-0 h-8 w-8"
                    onClick={() => setRoastStep("initial")}
                  >
                    <ArrowLeftIcon className="h-4 w-4" />
                  </Button>
                  <h3 className="font-medium">Choose Roast Type</h3>
                </div>
                
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Button 
                    onClick={() => setRoastStep("customRoast")}
                    variant="outline" 
                    className="w-full justify-start hover:cursor-pointer transition"
                  >
                    <span className="mr-2">✍️</span> Custom Roast
                  </Button>
                </motion.div>
                
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                >
                  <Button 
                    onClick={() => {
                      setRoastStep("aiRoast");
                    }}
                    className="w-full transition hover:cursor-pointer justify-start bg-[#fffc03] hover:bg-[#fffc03] opacity-95 hover:opacity-100 text-black font-bangers transition hover:cursor-pointer transform shadow-lg border-2 border-[#281f20]"
                  >
                    <span className="mr-2">🤖</span> Roast with AI (Recommended)
                  </Button>
                </motion.div>
                
                <motion.p 
                  className="text-sm text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  AI roasts are generated based on users Universal Profile and X account history.
                </motion.p>
              </div>
            )}
          </motion.div>
        );
    }
  };

  // Add this function to handle the roast price update
  const handleUpdateRoastPrice = async () => {
    if (!walletConnected || !contextAccounts || contextAccounts.length === 0) return;
    
    setUpdatingPrice(true);
    try {
      // Get the provider
      const rpcProvider = new ethers.JsonRpcProvider('https://lukso.nownodes.io/3eae6d25-6bbb-4de1-a684-9f40dcc3f793');
      
      // Convert the price to wei (ethers format)
      const priceInWei = ethers.parseEther(roastPrice.toString());

      console.log(priceInWei, "price in wei");
      
      const txHash = await client?.writeContract({
        address: ROASTADDRESS as `0x${string}`,
        abi: Roasted,
        functionName: "setRoastPrice",
        args: [priceInWei],
        account: accounts[0],
        chain: lukso,
      });

      const publicClient = createPublicClient({
        chain: chainId === 42 ? lukso : luksoTestnet,
        transport: http(),
      });

      console.log(txHash, "hash");

      // Show pending toast
      toast.info("Transaction submitted. Waiting for confirmation...", {
        duration: 5000,
        position: "bottom-center",
      });

      await publicClient.waitForTransactionReceipt({
        hash: txHash as `0x${string}`,
      });

      // Show pending toast
      toast.success("Roast price updated successfully!", {
        duration: 3000,
        position: "bottom-center",
      });
      
      // Refresh the contract data
      await refreshContractData();
    } catch (err) {
      console.error("Error updating roast price:", err);
      toast.error("Failed to update roast price", {
        duration: 2000,
        position: "bottom-center",
      });
    } finally {
      setUpdatingPrice(false);
    }
  };

  const [isRoasting, setIsRoasting] = useState<boolean>(false);

  // Helper function to upload metadata to IPFS via Pinata
  const uploadMetadataToIPFS = async (metadata: any) => {
    try {
      // Create form data with the metadata JSON file
      const formData = new FormData();
      const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
      const metadataFile = new File([metadataBlob], 'metadata.json', { type: 'application/json' });
      formData.append('file', metadataFile);

      // Upload to Pinata through our API route
      const response = await fetch('/api/pinata', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload metadata to IPFS');
      }

      const ipfsUrl = await response.json();
      return ipfsUrl;
    } catch (error) {
      console.error('Error uploading to IPFS:', error);
      throw error;
    }
  };

  // Updated handleRoast function
  const handleRoast = async (roastText: string, roastType: string) => {
    if (!walletConnected || !accounts || !contextAccounts) {
      toast.error("Wallet not connected", {
        duration: 2000,
        position: "bottom-center",
      });
      return;
    }

    setIsRoasting(true);
    setRoastStep("minting");

    try {
      const images = [
        [
          {
            width: 1024,
            height: 1024,
            url: "ipfs://bafybeifvcf5f4m4cfkvfht6hvbfltojen3nnd7s2n5y2p4hhfyh2jmd24m",
            verification: {
              method: "keccak256(utf8)",
              data: "0x179e9c390b0eff19d6494fccca44093a7ee800857a21ce1afe22ba754b300269"
            }
          }
        ]
      ];
      
      const icon = [
        {
          width: 256,
          height: 256,
          url: "ipfs://bafybeifvcf5f4m4cfkvfht6hvbfltojen3nnd7s2n5y2p4hhfyh2jmd24m",
          verification: {
            method: "keccak256(utf8)",
            data: "0x179e9c390b0eff19d6494fccca44093a7ee800857a21ce1afe22ba754b300269"
          }
        }
      ];

      // Create metadata object
      const metadata = {
        LSP4Metadata: {
          name: "Roast NFT",
          description: roastText,
          links: [{ title: "Website", url: "https://roasted.com" }],
          attributes: [
            { key: "Roaster", value: accounts[0], type: "string" },
            { key: "Roastee Address", value: contextAccounts[0], type: "string" },
            { key: "Roastee X", value: roastedTwitter, type: "string" },
            { key: "Roast", value: roastText, type: "string" },
            { key: "Roast Type", value: roastType, type: "string" },
            { key: "Price", value: targetRoastPrice, type: "string" },
          ],
          images,
          icon,
          assets: []
        }
      };

      // Upload metadata to IPFS
      const metadataIpfsUrl = await uploadMetadataToIPFS(metadata);
      console.log("Metadata uploaded to IPFS:", metadataIpfsUrl);

      // Create ERC725 instance with schema
      const schema = [{
        name: 'LSP4Metadata',
        key: '0x9afb95cacc9f95858ec44aa8c3b685511002e30ae54415823f406128b85b238e',
        keyType: 'Singleton',
        valueType: 'bytes',
        valueContent: 'VerifiableURI',
      }];

      const erc725 = new ERC725(schema);

      // Encode metadata
      const encodedData = erc725.encodeData([{
        keyName: 'LSP4Metadata',
        value: {
          json: metadata,
          url: `ipfs://${metadataIpfsUrl}`,
        },
      }]);

      // Get the encoded metadata value
      const encodedMetadataValue = encodedData.values[0];

      // Encode mint data with roastee address and encoded metadata
      const mintData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "bytes"],
        [contextAccounts[0], encodedMetadataValue]
      );

      // Show pending toast
      toast.info("Minting your roast...", {
        duration: 5000,
        position: "bottom-center",
      });

      console.log(mintData, "mint data");
      console.log(accounts[0], "account");
      console.log(ROASTADDRESS, "roast address");

      // Call the mint function
      const txHash = await client?.writeContract({
        address: ROASTADDRESS as `0x${string}`,
        abi: Roasted,
        functionName: "mint",
        args: [
          accounts[0], // to
          true,        // force
          mintData     // encoded data
        ],
        value: ethers.parseEther(targetRoastPrice), // value to send
        account: accounts[0],
        chain: lukso,
      });

      // Create public client to wait for transaction
      const publicClient = createPublicClient({
        chain: lukso,
        transport: http(),
      });

      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash: txHash as `0x${string}`
      });

      console.log("Roast minted successfully:", receipt);

      // Show success toast
      toast.success("Your roast has been minted!", {
        duration: 3000,
        position: "bottom-center",
      });

      setRoastStep("success");

      // Reset UI state
      setCustomRoast("");
      setAiRoast("");
      setAiContext("");
      setIsRoastGenerating(false);
      setAiSuggestion(true);
    } catch (error) {
      console.error("Error minting roast:", error);
      toast.error("Failed to mint roast", {
        duration: 2000,
        position: "bottom-center",
      });
      setRoastStep("initial");
    } finally {
      setIsRoasting(false);
    }
  };

  useEffect(() => {
    if (error) {
      toast.error(error, {
        duration: 2000,
        position: "bottom-center",
      })
    }
  }, [error])

  return (
    <main className="flex flex-col items-center justify-center w-full h-[100vh] p-6 max-w-md mx-auto">
      <div className="absolute top-0 left-0 z-10 w-full h-full bg-[#ef1a22]  rounded-lg overflow-hidden">
        <FloatingEmojis />
      </div>

      <Card className={`w-full z-50 card-with-stroke gap-0  ${isGridOwner ? walletConnected && "h-[500px]" : ""}`}>
        {!walletConnected &&<CardContent className="flex flex-col items-center justify-center h-full text-center px-12">
          <p className="text-[#241d1f] p-0">
            Please connect your wallet using the button in the top left.
          </p>
        </CardContent>
        }
        
        {walletConnected && (
          <CardFooter className="flex h-full flex-col gap-3">
            {isGridOwner ? (
              // Grid owner UI
              <div className="w-full flex h-full flex-col justify-center items-center gap-3">
                {renderTwitterStatus()}
                
                {error && error.includes("Popup blocked") && (
                  <Button asChild variant="link" className="w-full">
                    <Link 
                      href={`/api/auth/signin/twitter?callbackUrl=${encodeURIComponent('/auth/callback')}`}
                      target="_blank"
                    >
                      Click here to open Twitter authentication
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              // Non-owner UI (Roasting UI)
              <div className="w-full">
                {renderRoastingUI()}
              </div>
            )}
          </CardFooter>
        )}
      </Card>
    </main>
  );
}