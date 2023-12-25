"use client";

import { Card, CardHeader, CardBody } from "@nextui-org/react";
import { Input, CardFooter, Divider, Button } from "@nextui-org/react";
import Image from "next/image";
import type { Transaction } from "@near-wallet-selector/core";
import { useWalletSelector } from "~/contexts/WalletSelectorContext";
import { CONTRACT_ID } from "~/config/constants";
import { parseNearAmount } from "near-api-js/lib/utils/format";

import type { BurnHandleProps } from "~/types";
import React from "react";
import { useForm, Resolver } from "react-hook-form";

import toast from "react-hot-toast";

type SecretValue = {
  secret: string;
  token_id: string;
};

export function Playground() {
  const wallet = useWalletSelector();

  const resolver: Resolver<SecretValue> = async (values) => {
    return {
      values: values.secret ? values : {},
      errors: !values.secret
        ? {
            secret: {
              type: "required",
              message: "This is required.",
            },
          }
        : {},
    };
  };

  const { register, handleSubmit } = useForm<SecretValue>({ resolver });
  const onSubmit = handleSubmit((data) => {
    toast("Here is your toast.");
    burnHandle(data);
  });

  const burnHandle = ({ secret, token_id }: BurnHandleProps) => {
    const burn = async () => {
      const tx: Transaction = {
        receiverId: CONTRACT_ID,
        actions: [
          {
            type: "FunctionCall",
            params: {
              methodName: "user_burn",
              args: {
                account_id: wallet.accountId,
                secret,
                token_id,
                memo: "burn maze nft",
              },
              deposit: parseNearAmount("0.00") || "",
              gas: "100000000000000",
            },
          },
        ],
        signerId: wallet.accountId!,
      };
      await wallet
        .signAndSendTransaction(tx)
        .catch((error) => console.log(error));
      toast.success("Successfully burned!");
    };
    burn();
  };
  return (
    <Card className="z-999 container w-full px-6 py-6 md:h-[460px] 2xl:h-[60vh]">
      <CardBody className="grid auto-rows-auto grid-cols-3 gap-6">
        {wallet.allMediaesData.map((item, index) => (
          <Card className="relative h-auto min-h-[380px] max-w-[400px]">
            <CardHeader className="flex gap-3">
              <div className="flex flex-col">
                <p className="text-tiny font-bold uppercase">Author</p>
                <p className="text-md">{item.owner_id}</p>
                <p className="text-tiny font-bold uppercase">
                  Token ID:
                  <span className="ml-2 text-small text-default-500">
                    {item.token_id}
                  </span>
                </p>
              </div>
            </CardHeader>
            <Divider />
            <CardBody className="flex h-56 items-center justify-center">
              <Image
                src={
                  item.metadata.media
                    ? item.metadata.media
                    : "/images/wave-dark-top.svg"
                }
                alt="media"
                width={200}
                height={200}
                key={index}
              />
            </CardBody>
            <Divider />
            <CardFooter className="">
              <form
                onSubmit={onSubmit}
                className="relative flex items-center justify-between px-4"
              >
                <div className="flex items-center ">
                  <Input
                    type="text"
                    placeholder="enter secret"
                    labelPlacement="outside"
                    className="w-2/3"
                    {...register("secret")}
                  />
                  <input
                    className="absolute hidden"
                    value={item.token_id}
                    {...register("token_id")}
                  />
                </div>
                <Button
                  size="sm"
                  onClick={() =>
                    burnHandle({
                      secret: item.metadata.media_hash!.slice(-4),
                      token_id: item.token_id,
                    })
                  }
                  type="submit"
                >
                  burn
                </Button>
              </form>
            </CardFooter>
          </Card>
        ))}
      </CardBody>
    </Card>
  );
}
