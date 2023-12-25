"use client";

import React from "react";

import { Create } from "./create";
import { MyMazes } from "./my_mazes";
import { Playground } from "./playground";
import { Key } from "@react-types/shared";
import { Tabs, Tab } from "@nextui-org/react";

export default function Mazes() {
  const [selectedKeys, setSelectedKeys] = React.useState<Key>("Create");

  return (
    <div className="flex h-[90vh] w-full flex-col pt-10">
      <Tabs
        aria-label="Options"
        defaultSelectedKey={"Create"}
        selectedKey={selectedKeys}
        onSelectionChange={setSelectedKeys}
        className="flex justify-center"
      >
        <Tab key="playground" title="Playground">
          <Playground />
        </Tab>
        <Tab key="Create" title="Create">
          <Create />
        </Tab>
        <Tab key="my_mazes" title="My mazes">
          <MyMazes />
        </Tab>
      </Tabs>
    </div>
  );
}
