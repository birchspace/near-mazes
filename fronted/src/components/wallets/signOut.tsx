"use client";

import React, { Fragment } from "react";
import { CopyIcon } from "~/components/icons";
import { useWalletSelector } from "~/contexts/WalletSelectorContext";
import { DropdownMenu, DropdownItem } from "@nextui-org/react";
import { Dropdown, DropdownTrigger, Button } from "@nextui-org/react";
0;

interface SignOutProps {
  click: () => void;
}

export const SignOut: React.FC<SignOutProps> = ({ click }) => {
  const wallet = useWalletSelector();
  return (
    <Fragment>
      <Dropdown>
        <DropdownTrigger>
          <Button className="break-words bg-gray-950 font-bold text-white">
            {wallet.accountId}
          </Button>
        </DropdownTrigger>
        <DropdownMenu
          variant="faded"
          aria-label="Dropdown menu with description"
        >
          <DropdownItem
            key="copy"
            value={wallet.accountId ? wallet.accountId.toString() : ""}
            shortcut="⌘C"
            startContent={
              <CopyIcon
                className={
                  "pointer-events-none flex-shrink-0 text-xl text-default-500"
                }
              />
            }
          >
            Copy address
          </DropdownItem>
          <DropdownItem
            key="copy"
            shortcut="⌘C"
            startContent={
              <CopyIcon
                className={
                  "pointer-events-none flex-shrink-0 text-xl text-default-500"
                }
              />
            }
            onClick={click}
          >
            Sign Out
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </Fragment>
  );
};
