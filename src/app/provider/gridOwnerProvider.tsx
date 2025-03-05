"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useUpProvider } from '../upProvider';
import Roasted from '../constants/Roasted.json';
import { ethers } from 'ethers';
import { ROASTADDRESS } from '../constants/constants';

interface GridOwnerContextType {
  isGridOwner: boolean;
  loading: boolean;
  contractBalance: number;
  pricePerRoast: number;
  refreshContractData: () => Promise<void>;
}

const GridOwnerContext = createContext<GridOwnerContextType>({
  isGridOwner: false,
  loading: true,
  contractBalance: 0,
  pricePerRoast: 0,
  refreshContractData: async () => {},
});

export const useGridOwner = () => useContext(GridOwnerContext);

export const GridOwnerProvider = ({ children }: { children: ReactNode }) => {
  const { contextAccounts, accounts, walletConnected } = useUpProvider();
  const [isGridOwner, setIsGridOwner] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [contractBalance, setContractBalance] = useState<number>(0);
  const [pricePerRoast, setPricePerRoast] = useState<number>(0);

  // Single effect for initial load
  useEffect(() => {
    const initializeData = async () => {
      if (!walletConnected || !contextAccounts?.length || !accounts?.length) {
        setLoading(false);
        return;
      }

      try {
        // Check grid owner status
        const gridOwnerStatus = contextAccounts[0]?.toLowerCase() === accounts[0]?.toLowerCase();
        setIsGridOwner(gridOwnerStatus);

        if (gridOwnerStatus) {
          await fetchContractData();
        }
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [walletConnected, contextAccounts, accounts]);

  const fetchLyxPrice = async (): Promise<number> => {
    try {
      const response = await fetch('/api/dia');
      const data = await response.json();
      return data.price || 0;
    } catch (error) {
      console.error('Failed to fetch LYX price:', error);
      return 0;
    }
  };

  const fetchContractData = async () => {
    if (!accounts?.length) return;

    try {
      const provider = new ethers.JsonRpcProvider('https://42.rpc.thirdweb.com');
      const roastedContract = new ethers.Contract(ROASTADDRESS, Roasted, provider);
      const userAddress = accounts[0];
      const luksoPrice = await fetchLyxPrice();

      // Fetch balance and price concurrently
      const [balanceResult, priceResult] = await Promise.all([
        roastedContract.userBalances(userAddress).catch(() => ethers.parseEther("0")),
        roastedContract.roastPrices(userAddress).catch(() => ethers.parseEther("0"))
      ]);

      console.log("RPC CALLS", balanceResult, priceResult);
      const balanceWei = balanceResult.toString() === '0x' ? ethers.parseEther("0") : balanceResult;
      const priceWei = priceResult.toString() === '0x' ? ethers.parseEther("0") : priceResult;

      const balance = luksoPrice * Number(ethers.formatEther(balanceWei));
      const price = luksoPrice * Number(ethers.formatEther(priceWei));

      setContractBalance(balance);
      setPricePerRoast(price);

      console.log(`Loaded: Balance=${balance} LYX, Price=${price} LYX`);
    } catch (error) {
      console.error('Contract data fetch failed:', error);
      setContractBalance(0);
      setPricePerRoast(0);
    }
  };

  const refreshContractData = async () => {
    if (isGridOwner) {
      await fetchContractData();
    }
  };

  return (
    <GridOwnerContext.Provider value={{ 
      isGridOwner, 
      loading, 
      contractBalance, 
      pricePerRoast,
      refreshContractData
    }}>
      {children}
    </GridOwnerContext.Provider>
  );
};