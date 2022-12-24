import { BigNumber, Contract, providers, utils } from "ethers";
import div from "next/head";
import Image from "next/image";
import React, { use, useEffect, useRef, useState } from "react";
import Web3Modal from "web3modal";
import { SMART_CONTRACT, abi } from "../constants";
import styles from "../styles/Home.module.css";
import { create } from 'ipfs-http-client';
// const ipfsClient = require('ipfs-api')
// const ipfs = ipfsClient({ host: 'ipfs.infura.io', port: '5001', protocol: 'https'})
// var web3 = require('web3');

const ipfs = create('http://localhost:5001');


export default function Home() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filename, setname] = useState('Upload file')
  const [buffer, setbuffer] = useState(null);
  const [hashfiles, setFiles] = useState([]);
  const web3ModalRef = useRef();
  const nftContainer = useRef();

  const connectWallet = async () => {
    try {
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (err) {
      console.error(err);
    }
  };

  const getProviderOrSigner = async (needSigner = false) => {
    // Connect to Metamask
    // Since we store `web3Modal` as a reference, we need to access the `current` value to get access to the underlying object
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    // If user is not connected to the Goerli network, let them know and throw an error
    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 97) {
      window.alert("Change the network to bnb");
      throw new Error("Change network to bnb");
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };

  const captureFile = (event) => {
    event.preventDefault();
    const file = event.target.files[0];
    console.log(file);
    const reader = new window.FileReader();
    reader.readAsArrayBuffer(file);
    setname(file.name)
    reader.onloadend = () => {
      setbuffer(Buffer.from(reader.result));
    }
    console.log(buffer);
  }

  const files_container = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      const storageContract = new Contract(SMART_CONTRACT, abi, signer);
      const addr = await signer.getAddress();
      await storageContract.getFiles(addr).then(data => {
        setFiles(data);
        console.log(data[0]);
      }).catch(err => { console.log(err) });
    } catch (err) {
      console.error(err);
    }
  }

  const onSubmitClick = async (event) => {
    event.preventDefault();
    try {
      if (!loading) {
        const signer = await getProviderOrSigner(true);
        const storageContract = new Contract(SMART_CONTRACT, abi, signer);
        const addr = await signer.getAddress();
        setLoading(true)
        if (buffer) {
          const file = await ipfs.add(buffer);
          const fileHash = file['path'];
          const tx = await storageContract.sendFile(addr, fileHash);
          await tx.wait().then(() => {
            files_container();
          });
        }
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }

  const removeClick = async (event, id)=>{
    event.preventDefault();
    try {
      if (!loading) {
        const signer = await getProviderOrSigner(true);
        const storageContract = new Contract(SMART_CONTRACT, abi, signer);
        const addr = await signer.getAddress();
        setLoading(true)
        const tx = await storageContract.removeFile(addr, id);
        await tx.wait().then(() => {
          files_container();
        });
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!walletConnected) {
      web3ModalRef.current = new Web3Modal({
        network: "binance-testnet",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet();
      files_container();
    }
  }, [walletConnected]);

  return (

    <div>
      <div className={styles.back}></div>

      <div className={styles.main}>
        <div className={styles.header}>
          <div>Chain Gang DeStorage</div>
        </div>
        <form method="post" encType="multipart/form-data">
          <label className={styles.input_file} onChange={e => captureFile(e)} >
            <input type="file" name="file" />
            <span>{filename}</span>
            <button onClick={e => onSubmitClick(e)} className={`${styles.upload}`}>{loading ? "..." : `⭱`}</button>
          </label>
        </form>
        <div className={styles.container} ref={nftContainer} id="container">
          {hashfiles?.map((it, key) => {
            if(it!=''){
            return <div className={styles.filebar} key={key}>
              {key} <a href={`https://ipfs.io/ipfs/${it}`} target="_blank" rel="noreferrer">{it}</a>
              <button onClick={e => removeClick(e, key)} className={`${styles.delete}`}>{loading ? "..." : `🗑`}</button>
            </div>
          }})}
        </div>
      </div>
    </div>
  );
}