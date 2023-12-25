import React, { Fragment, useCallback, useEffect, useState } from "react";
import { providers, utils } from "near-api-js";
import type {
  AccountView,
  CodeResult,
} from "near-api-js/lib/providers/provider";
import type {
  SignedMessage,
  SignMessageParams,
} from "@near-wallet-selector/core";
import { verifyFullKeyBelongsToUser } from "@near-wallet-selector/core";
import { verifySignature } from "@near-wallet-selector/core";
import BN from "bn.js";

import type { Account } from "~/types";
import { useWalletSelector } from "~/contexts/WalletSelectorContext";
import { CONTRACT_ID } from "~/config/constants";
import { SignOut } from "~/components/wallets/signOut";
import { Button } from "@nextui-org/react";

interface GetAccountBalanceProps {
  provider: providers.Provider;
  accountId: string;
}

const getAccountBalance = async ({
  provider,
  accountId,
}: GetAccountBalanceProps) => {
  try {
    const { amount } = await provider.query<AccountView>({
      request_type: "view_account",
      finality: "final",
      account_id: accountId,
    });
    const bn = new BN(amount);
    return { hasBalance: !bn.isZero() };
  } catch {
    return { hasBalance: false };
  }
};

const Content: React.FC = () => {
  const { selector, modal, accounts, accountId } = useWalletSelector();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const getAccount = useCallback(async (): Promise<Account | null> => {
    if (!accountId) {
      return null;
    }

    const { network } = selector.options;
    const provider = new providers.JsonRpcProvider({ url: network.nodeUrl });

    const { hasBalance } = await getAccountBalance({
      provider,
      accountId,
    });

    if (!hasBalance) {
      window.alert(
        `Account ID: ${accountId} has not been founded. Please send some NEAR into this account.`,
      );
      const wallet = await selector.wallet();
      await wallet.signOut();
      return null;
    }

    return provider
      .query<AccountView>({
        request_type: "view_account",
        finality: "final",
        account_id: accountId,
      })
      .then((data) => ({
        ...data,
        account_id: accountId,
      }));
  }, [accountId, selector]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      verifyMessageBrowserWallet();
    }, 500);

    return () => {
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!accountId) {
      return setAccount(null);
    }

    setLoading(true);

    getAccount().then((nextAccount) => {
      setAccount(nextAccount);
      setLoading(false);
    });
  }, [accountId, getAccount]);

  const handleSignIn = () => {
    modal.show();
  };

  const handleSignOut = async () => {
    const wallet = await selector.wallet();

    wallet.signOut().catch((err) => {
      console.log("Failed to sign out");
      console.error(err);
    });
  };

  const verifyMessage = async (
    message: SignMessageParams,
    signedMessage: SignedMessage,
  ) => {
    const verifiedSignature = verifySignature({
      message: message.message,
      nonce: message.nonce,
      recipient: message.recipient,
      publicKey: signedMessage.publicKey,
      signature: signedMessage.signature,
      callbackUrl: message.callbackUrl,
    });
    const verifiedFullKeyBelongsToUser = await verifyFullKeyBelongsToUser({
      publicKey: signedMessage.publicKey,
      accountId: signedMessage.accountId,
      network: selector.options.network,
    });

    const isMessageVerified = verifiedFullKeyBelongsToUser && verifiedSignature;

    const alertMessage = isMessageVerified
      ? "Successfully verified"
      : "Failed to verify";

    alert(
      `${alertMessage} signed message: '${
        message.message
      }': \n ${JSON.stringify(signedMessage)}`,
    );
  };

  const verifyMessageBrowserWallet = useCallback(async () => {
    const urlParams = new URLSearchParams(
      window.location.hash.substring(1), // skip the first char (#)
    );
    const accId = urlParams.get("accountId") as string;
    const publicKey = urlParams.get("publicKey") as string;
    const signature = urlParams.get("signature") as string;

    if (!accId && !publicKey && !signature) {
      return;
    }

    const message: SignMessageParams = JSON.parse(
      localStorage.getItem("message")!,
    );

    const signedMessage = {
      accountId: accId,
      publicKey,
      signature,
    };

    await verifyMessage(message, signedMessage);

    const url = new URL(location.href);
    url.hash = "";
    url.search = "";
    window.history.replaceState({}, document.title, url);
    localStorage.removeItem("message");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return null;
  }

  if (!account) {
    return (
      <Fragment>
        <Button
          onClick={handleSignIn}
          className="break-words bg-gray-950 font-bold text-white"
        >
          Sign in
        </Button>
      </Fragment>
    );
  }

  return <SignOut click={handleSignOut} />;
};

export default Content;
