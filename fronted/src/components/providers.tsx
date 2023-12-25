"use client";

import { Toaster } from "react-hot-toast";
import { NextUIProvider } from "@nextui-org/react";
import { WalletSelectorContextProvider } from "~/contexts/WalletSelectorContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextUIProvider>
      <WalletSelectorContextProvider>
        <div>
          {children}
          <Toaster />
        </div>
      </WalletSelectorContextProvider>
    </NextUIProvider>
  );
}
