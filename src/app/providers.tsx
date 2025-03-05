"use client";

import { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { UpProvider } from "./upProvider";
import { ProfileProvider } from "./provider/profileProvider";
import { GridOwnerProvider } from "./provider/gridOwnerProvider";
import { Toaster } from "sonner";
import { RoastProvider } from './provider/roastProvider';
import { ApolloProvider } from '@apollo/client';
import { client } from './apollo-client';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <UpProvider>
        <ProfileProvider>
          <ApolloProvider client={client}>
            <GridOwnerProvider>
              <RoastProvider>
                  <Toaster />
                  {children}
              </RoastProvider>
            </GridOwnerProvider>
          </ApolloProvider>
        </ProfileProvider>
      </UpProvider>
    </SessionProvider>
  );
}