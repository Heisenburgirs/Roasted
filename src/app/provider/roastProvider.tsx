import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import { useUpProvider } from '../upProvider';
import { ROASTADDRESS } from '../constants/constants';
import Roasted from '../constants/Roasted.json';
import { useGridOwner } from './gridOwnerProvider';

// Define the context type
interface RoastProviderContextType {
  targetRoastPrice: string;
  loadingRoastPrice: boolean;
  refreshRoastPrice: (targetAddress?: string) => Promise<void>;
}

// Create the context with default values
const RoastProviderContext = createContext<RoastProviderContextType>({
  targetRoastPrice: '0',
  loadingRoastPrice: true,
  refreshRoastPrice: async () => {},
});

// Export the hook to use this context
export const useRoastProvider = () => useContext(RoastProviderContext);

// Provider component
export const RoastProvider = ({ children }: { children: ReactNode }) => {
  const { contextAccounts, walletConnected } = useUpProvider();
  const { isGridOwner } = useGridOwner();
  const [targetRoastPrice, setTargetRoastPrice] = useState<string>('0');
  const [loadingRoastPrice, setLoadingRoastPrice] = useState<boolean>(true);
  const [targetAddress, setTargetAddress] = useState<string | null>(null);

  // Function to fetch roast price for a specific address
  const fetchRoastPrice = async (address: string) => {
    setLoadingRoastPrice(true);
    try {
      console.log(`Fetching roast price for address: ${address}`);
      
      // Setup provider and contract
      const provider = new ethers.JsonRpcProvider('https://lukso.nownodes.io/3eae6d25-6bbb-4de1-a684-9f40dcc3f793');
      const roastedContract = new ethers.Contract(
        ROASTADDRESS,
        Roasted,
        provider
      );

      // Get roast price for the target address
      let price;
      try {
        price = await roastedContract.roastPrices(address);
        console.log("Raw price response:", price);
      } catch (err) {
        console.log("Error fetching price, defaulting to zero:", err);
        price = ethers.parseEther("0");
      }
      
      // If price is "0x" or undefined, set it to zero
      if (!price || price === "0x") {
        console.log("Price is empty or 0x, setting to zero");
        price = ethers.parseEther("0");
      }
      
      const formattedPrice = ethers.formatEther(price);
      console.log(`Roast price for ${address}: ${formattedPrice} LYX`);
      setTargetRoastPrice(formattedPrice);
    } catch (error) {
      console.error("Error fetching roast price:", error);
      setTargetRoastPrice('0');
    } finally {
      setLoadingRoastPrice(false);
    }
  };

  // Function to refresh the roast price (can be called from outside)
  const refreshRoastPrice = async (newTargetAddress?: string) => {
    if (newTargetAddress) {
      setTargetAddress(newTargetAddress);
      await fetchRoastPrice(newTargetAddress);
    } else if (targetAddress) {
      await fetchRoastPrice(targetAddress);
    } else if (contextAccounts && contextAccounts.length > 0) {
      await fetchRoastPrice(contextAccounts[0]);
    }
  };

  // Fetch roast price when the target address changes
  useEffect(() => {
    if (!isGridOwner && walletConnected && contextAccounts && contextAccounts.length > 0) {
      // If we're not the grid owner, we want to know how much it costs to roast the current account
      setTargetAddress(contextAccounts[0]);
      fetchRoastPrice(contextAccounts[0]);
    } else {
      setLoadingRoastPrice(false);
    }
  }, [isGridOwner, walletConnected, contextAccounts]);

  return (
    <RoastProviderContext.Provider value={{ 
      targetRoastPrice,
      loadingRoastPrice,
      refreshRoastPrice
    }}>
      {children}
    </RoastProviderContext.Provider>
  );
};
