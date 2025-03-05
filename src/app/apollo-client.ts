import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

const universalGraphLink = new HttpLink({
  uri: "https://envio.lukso-mainnet.universal.tech/v1/graphql",
});

export const client = new ApolloClient({
  link: universalGraphLink,
  cache: new InMemoryCache(),
});