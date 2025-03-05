import { gql, useQuery } from '@apollo/client';
import React from 'react';

export interface RoastNFTAttribute {
    key: string;
    value: string;
    attributeType: string;
}

export interface RoastNFTIcon {
    url: string;
}

export interface RoastNFTImage {
    url: string;
}

export interface RoastNFTBaseAsset {
    id: string;
    totalSupply: string;
}

export interface RoastNFT {
    id: string;
    tokenId: string;
    formattedTokenId: string;
    name: string;
    description: string;
    lsp4TokenName: string;
    lsp4TokenSymbol: string;
    lsp4TokenType: number;
    baseAsset: RoastNFTBaseAsset;
    icons: RoastNFTIcon[];
    images: RoastNFTImage[];
    attributes: RoastNFTAttribute[];
    createdTimestamp: string;
    roaster?: string;
    roastee?: string;
}

export interface RoastNFTsData {
    Token: RoastNFT[];
}

export interface Profile {
    id: string;
    name: string;
}

export interface ProfileData {
    Profile: Profile[];
}

export const GET_PROFILE = gql`
  query GetProfiles($addresses: [String!]!) {
    Profile(
      where: {
        id: {
          _in: $addresses
        }
      }
    ) {
      id
      name
    }
  }
`;

export const GET_ROAST_NFTS = gql`
  query GetMetadataForTokens($limit: Int!, $offset: Int!) {
    Token(
      where: {
        baseAsset_id: {
          _eq: "0x2a010a3dbd0760099da8a87e090899e68ba6285d"
        }
      }
      order_by: {createdTimestamp: desc}
      limit: $limit
      offset: $offset
    ) {
      id
      tokenId
      formattedTokenId
      name
      description
      lsp4TokenName
      lsp4TokenSymbol
      lsp4TokenType
      baseAsset {
        id
        totalSupply
      }
      icons {
        url
      }
      images {
        url
      }
      attributes {
        key
        value
        attributeType
      }
      createdTimestamp
    }
  }
`;

const formatProfileName = (name: string, address: string): string => {
  return `${name}#${address.substring(2, 6)}`;
};

export function useRoastNFTs(limit: number = 10, offset: number = 0) {
  // First query: Get NFTs
  const { 
    data: nftData, 
    loading: nftLoading, 
    error: nftError,
    fetchMore 
  } = useQuery<RoastNFTsData>(GET_ROAST_NFTS, {
    variables: { limit, offset },
    notifyOnNetworkStatusChange: true,
  });

  // Extract addresses from NFTs
  const uniqueAddresses = new Set<string>();
  const processedNFTs = nftData?.Token?.map(nft => {
    const roasterAttr = nft.attributes.find(
      attr => attr.attributeType === "string" && attr.key === "Roaster"
    );
    const roasteeAttr = nft.attributes.find(
      attr => attr.attributeType === "string" && attr.key === "Roastee Address"
    );
    
    const roasterAddress = roasterAttr?.value?.toLowerCase();
    const roasteeAddress = roasteeAttr?.value?.toLowerCase();
    
    if (roasterAddress) uniqueAddresses.add(roasterAddress);
    if (roasteeAddress) uniqueAddresses.add(roasteeAddress);
    
    return {
      ...nft,
      roasterAddress,
      roasteeAddress
    };
  }) || [];

  // Second query: Get Profiles
  const { 
    data: profileData, 
    loading: profileLoading, 
    error: profileError 
  } = useQuery<{ Profile: Profile[] }>(GET_PROFILE, {
    variables: { addresses: Array.from(uniqueAddresses) },
    skip: uniqueAddresses.size === 0 || nftLoading,
  });

  // If either query is loading or has error, return appropriate state
  if (nftLoading) {
    return { data: { Token: [] }, loading: true, error: null, fetchMore };
  }

  if (nftError) {
    return { data: { Token: [] }, loading: false, error: nftError, fetchMore };
  }

  if (profileLoading) {
    return { data: { Token: processedNFTs }, loading: true, error: null, fetchMore };
  }

  if (profileError) {
    return { data: { Token: processedNFTs }, loading: false, error: profileError, fetchMore };
  }

  // Create profile mapping
  const profileMap = new Map<string, string>();
  profileData?.Profile?.forEach(profile => {
    profileMap.set(
      profile.id.toLowerCase(),
      formatProfileName(profile.name, profile.id)
    );
  });

  // Combine NFT data with profile names
  const finalNFTs = processedNFTs.map(nft => ({
    ...nft,
    roaster: nft.roasterAddress ? profileMap.get(nft.roasterAddress) : undefined,
    roastee: nft.roasteeAddress ? profileMap.get(nft.roasteeAddress) : undefined,
  }));

  return {
    data: { Token: finalNFTs },
    loading: false,
    error: null,
    fetchMore,
  };
}