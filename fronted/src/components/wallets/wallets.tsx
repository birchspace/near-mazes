"use client";

import { Fragment } from "react";
import { WalletSelectorContextProvider } from "~/contexts/WalletSelectorContext";
import Content from "./content";

export const Wallet = () => {
  return (
    <Fragment>
      <div className="title-container">
        <WalletSelectorContextProvider>
          <Content />
        </WalletSelectorContextProvider>
      </div>
    </Fragment>
  );
};
