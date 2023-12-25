"use client";

import { useRef, useState, FC, ReactNode } from "react";
import {
  NavbarContent,
  NavbarItem,
  Navbar as NextUINavbar,
  link,
} from "@nextui-org/react";
import { Fragment } from "react";
import { WalletSelectorContextProvider } from "~/contexts/WalletSelectorContext";
import Content from "~/components/wallets/content";
import { clsx } from "@nextui-org/shared-utils";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { trackEvent } from "~/utils/va";
import { siteConfig } from "~/config/site";
import { SmallLogo, LargeLogo } from "~/components/icons";

export interface NavbarProps {
  tag?: string;
  slug?: string;
  children?: ReactNode;
}

export const Navbar: FC<NavbarProps> = () => {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean | undefined>(false);

  const ref = useRef<HTMLElement>(null);

  const pathname = usePathname();

  useEffect(() => {
    if (isMenuOpen) {
      setIsMenuOpen(false);
    }
  }, [pathname]);

  const handlePressNavbarItem = (name: string, url: string) => {
    trackEvent("NavbarItem", {
      name,
      action: "press",
      category: "navbar",
      data: url,
    });
  };

  return (
    <NextUINavbar
      ref={ref}
      className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      isMenuOpen={isMenuOpen}
      maxWidth="xl"
      position="static"
      onMenuOpenChange={setIsMenuOpen}
    >
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <span className="font-blod text-2xl">Mazes</span>
        </div>
        <Fragment>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <div className="title-container flex items-center justify-end">
              <WalletSelectorContextProvider>
                <Content />
              </WalletSelectorContextProvider>
            </div>
          </div>
        </Fragment>
      </div>
    </NextUINavbar>
  );
};
