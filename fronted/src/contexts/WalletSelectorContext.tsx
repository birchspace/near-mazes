import type { AccountState, WalletSelector } from "@near-wallet-selector/core";
import { setupWalletSelector } from "@near-wallet-selector/core";
import type { WalletSelectorModal } from "@near-wallet-selector/modal-ui";
import { setupModal } from "@near-wallet-selector/modal-ui";
import { setupNearWallet } from "@near-wallet-selector/near-wallet";
import { setupSender } from "@near-wallet-selector/sender";
import { Transaction } from "@near-wallet-selector/core";
import { setupBitgetWallet } from "@near-wallet-selector/bitget-wallet";
import { parseNearAmount } from "near-api-js/lib/utils/format";

import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import { setupLedger } from "@near-wallet-selector/ledger";

import type { ReactNode } from "react";
import React, {
  useCallback,
  useContext,
  useEffect,
  useState,
  useMemo,
} from "react";
import { distinctUntilChanged, map } from "rxjs";

import { Loading } from "~/components/loading";
import { CONTRACT_ID } from "~/config/constants";
import { providers } from "near-api-js";
import {
  MazesTokenProps,
  TSignAndSendTransaction,
  TViewFunction,
} from "~/types";
import { contract, nearConfig } from "~/config/contract";

declare global {
  interface Window {
    selector: WalletSelector;
    modal: WalletSelectorModal;
  }
}

interface WalletSelectorContextValue {
  selector: WalletSelector;
  modal: WalletSelectorModal;
  accounts: Array<AccountState>;
  accountId: string | null;
  viewFunction: TViewFunction;
  signAndSendTransaction: TSignAndSendTransaction;
  mediaesData: MazesTokenProps[];
  allMediaesData: MazesTokenProps[];
  setCount: React.Dispatch<React.SetStateAction<number>>;
}

const WalletSelectorContext =
  React.createContext<WalletSelectorContextValue | null>(null);

export const WalletSelectorContextProvider: React.FC<{
  children: ReactNode;
}> = ({ children }) => {
  const [selector, setSelector] = useState<WalletSelector | null>(null);
  const [modal, setModal] = useState<WalletSelectorModal | null>(null);
  const [mediaes, setMediaes] = useState<MazesTokenProps[]>([]);
  const [allMediaesData, setAllMediaesData] = useState<MazesTokenProps[]>([]);
  const [accounts, setAccounts] = useState<Array<AccountState>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [count, setCount] = useState<number>(0);
  const init = useCallback(async () => {
    const _selector = await setupWalletSelector({
      network: "testnet",
      debug: true,
      modules: [
        setupMyNearWallet(),
        setupLedger(),
        setupNearWallet(),
        setupSender(),
        setupBitgetWallet(),
      ],
    });
    const _modal = setupModal(_selector, {
      contractId: CONTRACT_ID,
    });
    const state = _selector.store.getState();
    setAccounts(state.accounts);

    // this is added for debugging purpose only
    // for more information (https://github.com/near/wallet-selector/pull/764#issuecomment-1498073367)
    window.selector = _selector;
    window.modal = _modal;

    setSelector(_selector);
    setModal(_modal);
    setLoading(false);
  }, []);

  useEffect(() => {
    init().catch((err) => {
      console.error(err);
      alert("Failed to initialise wallet selector");
    });
  }, [init]);

  useEffect(() => {
    if (!selector) {
      return;
    }

    const subscription = selector.store.observable
      .pipe(
        map((state) => state.accounts),
        distinctUntilChanged(),
      )
      .subscribe((nextAccounts) => {
        setAccounts(nextAccounts);
      });

    const onHideSubscription = modal!.on("onHide", ({ hideReason }) => {
      console.log(`The reason for hiding the modal ${hideReason}`);
    });

    return () => {
      subscription.unsubscribe();
      onHideSubscription.remove();
    };
  }, [selector, modal]);

  useEffect(() => {
    if (!selector || accounts.length < 1) {
      return;
    }

    const mazesTokensById = () => {
      const result = async () => {
        const res: MazesTokenProps[] = await viewFunction({
          receiverId: contract.contractName,
          methodName: "view_nft_by_id",
          args: {
            account_id: accounts[0]?.accountId,
            from_index: "0",
            limit: 3,
          },
        });

        const filterRes = res.filter((item) => item.metadata.media !== null);
        setMediaes(filterRes);
      };
      result();
    };
    mazesTokensById();
  }, [selector, accounts, modal, mediaes, count]);

  useEffect(() => {
    if (!selector || accounts.length < 1) {
      return;
    }

    const mazesTokensById = () => {
      const result = async () => {
        const res: MazesTokenProps[] = await viewFunction({
          receiverId: contract.contractName,
          methodName: "view_all_nft",
          args: {
            from_index: "0",
            limit: 30,
          },
        });

        const filterRes = res.filter((item) => item.metadata.media !== null);
        setAllMediaesData(filterRes);
      };
      result();
    };
    mazesTokensById();
  }, [selector, accounts, modal, allMediaesData, count]);

  const viewFunction: TViewFunction = ({
    receiverId,
    methodName,
    args = "",
  }) => {
    return new providers.JsonRpcProvider({ url: nearConfig.nodeUrl })
      .query({
        request_type: "call_function",
        account_id: receiverId,
        method_name: methodName,
        args_base64: Buffer.from(JSON.stringify(args)).toString("base64"),
        finality: "optimistic",
      })
      .then((res) =>
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        JSON.parse(Buffer.from(res.result).toString()),
      );
  };

  const signAndSendTransaction: TSignAndSendTransaction = async (params) => {
    if (!selector) {
      return;
    }
    const wallet = await selector.wallet();
    return wallet.signAndSendTransaction(params);
  };

  const walletSelectorContextValue = useMemo<WalletSelectorContextValue>(
    () => ({
      selector: selector!,
      modal: modal!,
      accounts,
      viewFunction,
      signAndSendTransaction,
      mediaesData: mediaes,
      allMediaesData: allMediaesData,
      setCount: setCount,
      accountId: accounts.find((account) => account.active)?.accountId || null,
    }),
    [selector, modal, accounts, mediaes],
  );

  if (loading) {
    return <Loading />;
  }

  return (
    <WalletSelectorContext.Provider value={walletSelectorContextValue}>
      {children}
    </WalletSelectorContext.Provider>
  );
};

export function useWalletSelector() {
  const context = useContext(WalletSelectorContext);

  if (!context) {
    throw new Error(
      "useWalletSelector must be used within a WalletSelectorContextProvider",
    );
  }

  return context;
}
