"use client";

import { ethers } from "ethers";

// Define a type for providers with the UP extension property
interface EthereumProvider extends ethers.Eip1193Provider {
  isUniversalProfileExtension?: boolean;
  providers?: EthereumProvider[];
}

/**
 * Connects to the Universal Profile (UP) browser extension
 * @returns Object containing the connected address and ethers provider
 */
export async function connectUP() {
  if (typeof window === "undefined") {
    throw new Error("Cannot connect to UP provider in server environment");
  }

  // Check for ethereum providers
  if (!window.ethereum) {
    throw new Error("No wallet provider detected");
  }

  // Request EIP-6963 providers
  const ethereum = window.ethereum as unknown as EthereumProvider;
  const providers = ethereum.providers || [ethereum];
  const upProvider = providers.find((p) => p.isUniversalProfileExtension); // UP-specific check

  if (!upProvider) {
    throw new Error("Universal Profile Extension not detected");
  }

  // Create ethers provider from UP provider
  const browserProvider = new ethers.BrowserProvider(upProvider);
  
  // Request accounts
  await upProvider.request({ method: "eth_requestAccounts" });
  
  // Get signer and address
  const signer = await browserProvider.getSigner();
  const address = await signer.getAddress();

  return { 
    address, 
    browserProvider,
    signer,
    upProvider
  };
} 