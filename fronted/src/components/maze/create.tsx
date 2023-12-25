"use client";

import React from "react";
import Image from "next/image";
import { Card, CardBody, image } from "@nextui-org/react";
import { Button, CardHeader } from "@nextui-org/react";
import { DeleIcon, MintIcon } from "../icons";
import { sha256 } from "js-sha256";
import { Kbd } from "@nextui-org/react";
import { Dropdown, DropdownTrigger } from "@nextui-org/react";
import { DropdownMenu, DropdownItem } from "@nextui-org/react";
import { CONTRACT_ID } from "~/config/constants";
import type { Transaction } from "@near-wallet-selector/core";

import ImageUploading, { ImageListType } from "react-images-uploading";
import { useWalletSelector } from "~/contexts/WalletSelectorContext";
import { parseNearAmount } from "near-api-js/lib/utils/format";
import toast from "react-hot-toast";

interface CreateHandleProps {
  imageBase64: string;
}

export function Create() {
  const wallet = useWalletSelector();
  const [images, setImages] = React.useState<ImageListType>([]);
  const maxNumber = 6;
  const createHandle = ({ imageBase64 }: CreateHandleProps) => {
    const sendTx = async () => {
      const hash = sha256(imageBase64);
      if (wallet.accountId) {
        const tx: Transaction = {
          receiverId: CONTRACT_ID,
          actions: [
            {
              type: "FunctionCall",
              params: {
                methodName: "mint",
                args: {
                  account_id: wallet.accountId,
                  metadata: {
                    media: imageBase64,
                    media_hash: hash,
                  },
                  secret: hash.slice(-4),
                  memo: "",
                },
                deposit: parseNearAmount("0.00") || "",
                gas: "100000000000000",
              },
            },
          ],
          signerId: wallet.accountId,
        };

        await wallet.signAndSendTransaction(tx);
        wallet.setCount((count) => count + 1);
        toast.success("Successfully minted!");
      }
    };
    sendTx();
  };
  const onChange = (imageList: ImageListType) => {
    setImages(imageList as never[]);
  };

  return (
    <div className="z-999 container px-6 py-4">
      <Card className="z-999 w-full px-6 py-4 md:h-[400px] 2xl:h-[50vh]">
        <CardBody className="flex h-full flex-1 flex-row flex-wrap items-center justify-center gap-4 2xl:gap-8">
          {images.map((image, index) => (
            <Card
              className="relative flex items-center rounded-lg p-4 shadow"
              key={index}
            >
              <Dropdown>
                <DropdownTrigger className=" absolute right-2.5 top-3">
                  <Kbd className="z-20 bg-gradient-to-tr  text-sm shadow">
                    More
                  </Kbd>
                </DropdownTrigger>
                <DropdownMenu
                  variant="faded"
                  aria-label="Dropdown menu with icons"
                  className=""
                >
                  <DropdownItem
                    key="Mint"
                    className="w-fit"
                    color="danger"
                    shortcut="sha256(-4)"
                    startContent={
                      <MintIcon
                        className={
                          "pointer-events-none flex-shrink-0 text-xl text-default-500"
                        }
                      />
                    }
                    onClick={() =>
                      createHandle({ imageBase64: image.dataURL! })
                    }
                  >
                    Mint:
                    <span className="text-danger ">
                      {sha256(image.dataURL!).slice(-4)}
                    </span>
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
              <CardHeader className="flex-col items-start px-4 pb-0 pt-2">
                <p className="text-tiny font-bold uppercase">File name</p>
                <small className="text-default-500">{image.file?.name}</small>
              </CardHeader>
              <CardBody className="relative mt-2.5 h-64 w-64">
                <Image
                  fill
                  src={image.dataURL!}
                  alt={image.file!.name}
                  className="h-full w-full"
                />
              </CardBody>
            </Card>
          ))}
        </CardBody>
      </Card>
      <div className="flex justify-center md:mt-5">
        <ImageUploading
          multiple
          value={images}
          onChange={onChange}
          maxNumber={maxNumber}
        >
          {({ onImageUpload, onImageRemoveAll, isDragging, dragProps }) => (
            // write your building UI
            <div className="upload__image-wrapper flex gap-6">
              <Button
                style={isDragging ? { color: "red" } : undefined}
                onClick={onImageUpload}
                className="z-10"
                color="default"
                {...dragProps}
              >
                Click or Drop here
              </Button>

              <Button
                className="z-10 flex flex-row items-center gap-4"
                onClick={onImageRemoveAll}
              >
                <DeleIcon
                  className={
                    " pointer-events-none flex-shrink-0 text-xl text-default-500"
                  }
                />
                Remove all images
              </Button>
            </div>
          )}
        </ImageUploading>
      </div>
    </div>
  );
}
