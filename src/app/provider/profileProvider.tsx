'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { ERC725 } from '@erc725/erc725.js';
import erc725schema from '@erc725/erc725.js/schemas/LSP3ProfileMetadata.json';
import { useUpProvider } from "../upProvider";

const RPC_ENDPOINT = 'https://lukso.nownodes.io/3eae6d25-6bbb-4de1-a684-9f40dcc3f793';
const IPFS_GATEWAY = 'https://api.universalprofile.cloud/ipfs';

interface ProfileData {
  name: string;
  profileImage: string;
}

interface ProfileContextType {
  profileData: ProfileData | null;
  isLoading: boolean;
  error: string | null;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { accounts, walletConnected } = useUpProvider();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      if (!walletConnected || !accounts[0]) return;

      setIsLoading(true);
      setError(null);

      try {
        const profile = new ERC725(
          erc725schema, 
          accounts[0], 
          RPC_ENDPOINT, 
          { ipfsGateway: IPFS_GATEWAY }
        );

        const fetchedData = await profile.fetchData('LSP3Profile');

        if (fetchedData.value && typeof fetchedData.value === 'object' && 'LSP3Profile' in fetchedData.value) {
          const { LSP3Profile } = fetchedData.value;
          setProfileData({
            name: LSP3Profile.name || 'Generic Profile',
            profileImage: LSP3Profile.profileImage?.[0]?.url.replace('ipfs://', IPFS_GATEWAY) || ''
          });
        }
      } catch (err) {
        setError('Failed to load profile');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfile();
  }, [walletConnected]);

  return (
    <ProfileContext.Provider value={{ profileData, isLoading, error }}>
      {children}
    </ProfileContext.Provider>
  );
}