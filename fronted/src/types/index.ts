import { SVGProps } from "react";
import type { AccountView } from "near-api-js/lib/providers/provider";
import { BrowserWalletBehaviour } from "@near-wallet-selector/core/src/lib/wallet/wallet.types";

export type IconSvgProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

export interface Message {
  premium: boolean;
  sender: string;
  text: string;
}

export type Account = AccountView & {
  account_id: string;
};

export type TViewFunction = <T>(params: {
  receiverId: string;
  methodName: string;
  args: unknown;
}) => Promise<T>;

export type TSignAndSendTransaction =
  BrowserWalletBehaviour["signAndSendTransaction"];

export interface MintHandleProps {
  account_id: string;
  media: string;
  media_hash: string;
}

export interface MazesTokenProps {
  token_id: string;
  owner_id: string;
  metadata: {
    title?: string;
    description?: string;
    media?: string;
    media_hash?: string;
    copies?: string;
    issued_at?: string;
    expires_at?: string;
    starts_at?: string;
    updated_at?: string;
    extra?: string;
    reference?: string;
    reference_hash?: string;
  };
  approved_account_ids: {};
}


export interface BurnHandleProps {
  secret: string;
  token_id: string;
}