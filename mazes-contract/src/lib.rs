use near_contract_standards::non_fungible_token::metadata::{NFTContractMetadata, TokenMetadata};
use near_contract_standards::non_fungible_token::{NonFungibleToken, TokenId};
use near_contract_standards::{
    impl_non_fungible_token_approval, impl_non_fungible_token_core,
    impl_non_fungible_token_enumeration,
};
use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::store::LookupMap;

use near_sdk::{near_bindgen, AccountId, BorshStorageKey, PanicOnDefault, Promise, PromiseOrValue};

pub use crate::events::*;
pub use crate::mazes::*;

pub mod events;
pub mod mazes;

#[near_bindgen] // 定义合约根结构, 一个项目中只能有一个根结构
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)] // 实现 borsh 序列化, 实现不可用的 `default` 方法以通过编译
pub struct Contract {
    // 合约所有者
    owner_id: AccountId,

    tokens: NonFungibleToken,
    // 使用全局自增 id 作为 NFT id
    unique_id: u64,
    // 该容器内的数据与容器本身分开存储, 容器本身是根结构的一部分, 但内部数据是独立的存储记录
    secret: LookupMap<TokenId, String>,
}

// 存储在链上的键结构
#[derive(BorshSerialize, BorshStorageKey)]
pub enum StorageKey {
    Approval,
    Enumeration,
    TokenMetadata,
    NonFungibleToken,
    // 以 1u8 的方式 borsh 序列化
    #[allow(unused)]
    Secret,
}
