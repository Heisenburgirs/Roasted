import { ethers } from 'ethers';
import { ERC725 } from '@erc725/erc725.js';
import { abi } from '../contracts/abi';

async function setCollectionMetadata(metadataJson: any) {
  const provider = new ethers.JsonRpcProvider("https://rpc.testnet.lukso.network");
  const wallet = new ethers.Wallet("0x43361a4e65f999bb2fe735d873f393763a931121a4f4ee4d775e8a3cd228a34a", provider);
  const universalProfileAddress = "0x61d397d2c872F521c0A0BCD13d1cb31ec2c8Bc05";

  const contractAddress = process.env.VITE_LUKSO_CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error('VITE_LUKSO_CONTRACT_ADDRESS environment variable is not set');
  }

  const universalProfile = new ethers.Contract(
    universalProfileAddress,
    abi,
    wallet
  );

  const ABI = [
    "function execute(uint256 operationType, address target, uint256 value, bytes calldata data) external returns (bytes)"
  ];

  const lsp8Contract = new ethers.Contract(
    contractAddress,
    abi,
    wallet
  );

  const schema = [
    {
      name: 'LSP4Metadata',
      key: '0x9afb95cacc9f95858ec44aa8c3b685511002e30ae54415823f406128b85b238e',
      keyType: 'Singleton',
      valueType: 'bytes',
      valueContent: 'VerifiableURI',
    },
  ];

  const erc725 = new ERC725(schema);

  const encodedData = erc725.encodeData([
    {
      keyName: 'LSP4Metadata',
      value: {
        json: metadataJson,
        url: "ipfs://bafkreiegzm55gle3yn6hnbehqhb5zpm37bc7722daubusaey6ukaqywg4a",
      },
    },
  ]);

  // Encode the setData function call
  const setDataInterface = new ethers.Interface([
    "function setData(bytes32 key, bytes value) external"
  ]);
  const setDataData = setDataInterface.encodeFunctionData("setData", [
    encodedData.keys[0],
    encodedData.values[0]
  ]);

  // Call execute on the Universal Profile
  const tx = await universalProfile.execute(
    0, // CALL operation
    contractAddress, // target contract
    0, // value (0 ETH)
    setDataData // encoded setData call
  );
  await tx.wait();
} 