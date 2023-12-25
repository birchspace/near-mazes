use near_contract_standards::non_fungible_token::{Token, TokenId};
use near_sdk::collections::UnorderedSet;
use near_sdk::json_types::U128;
use near_sdk::{env, near_bindgen, require, AccountId};

use crate::*;

pub const NFT_METADATA_SPEC: &str = "1.0.0";
pub const NFT_STANDARD_NAME: &str = "nep177";

// 定义合约方法
#[near_bindgen]
impl Contract {
    #[init] // 标记合约初始化方法
    pub fn init(owner_id: AccountId) -> Self {
        Self {
            owner_id: owner_id.clone(),
            tokens: NonFungibleToken::new(
                StorageKey::NonFungibleToken,
                owner_id,
                Some(StorageKey::TokenMetadata),
                Some(StorageKey::Enumeration),
                Some(StorageKey::Approval),
            ),
            unique_id: 0,
            secret: LookupMap::new(StorageKey::Secret),
        }
    }

    // set NFT secret
    pub fn set_account_description(&mut self, token_id: TokenId, secret: String) {
        self.secret.insert(token_id, secret);
    }

    // mint NFT
    pub fn mint(
        &mut self,
        account_id: AccountId,
        metadata: TokenMetadata,
        secret: String,
        memo: Option<String>,
    ) {
        let token_id = self.next_id().to_string();
        self.internal_mint(&account_id, &token_id, &metadata, memo, secret);
    }

    //  burn NFT
    pub fn burn(&mut self, account_id: AccountId, token_id: TokenId, memo: Option<String>) {
        require!(
            env::predecessor_account_id() == self.owner_id,
            "Only contract owner can call this method."
        );
        self.internal_burn(&account_id, &token_id, memo);
    }

    // user burn NFT
    pub fn user_burn(
        &mut self,
        account_id: AccountId,
        token_id: TokenId,
        secret: &String,
        memo: Option<String>,
    ) {
        let token_secret = self.secret.get(&token_id);

        require!(
            token_secret.expect("The secret is not correct.") == secret,
            "The secret is not correct."
        );
        self.internal_burn(&account_id, &token_id, memo);
    }

    // 转移 NFT
    pub fn transfer_maze(
        &mut self,
        receiver_id: AccountId,
        token_id: TokenId,
        approval_id: Option<u64>,
        memo: Option<String>,
    ) {
        require!(
            env::predecessor_account_id() == self.owner_id,
            "Only contract owner can call this method."
        );
        self.nft_transfer(receiver_id, token_id, approval_id, memo)
    }

    // 查询某个用户拥有的NFT
    pub fn view_nft_by_id(
        &self,
        account_id: AccountId,
        from_index: Option<U128>,
        limit: Option<u64>,
    ) -> Vec<Token> {
        let tokens_per_owner = self
            .tokens
            .tokens_per_owner
            .as_ref()
            .expect("Could not find tokens_per_owner in view_nft_by_id enumeration.");
        let token_set = tokens_per_owner
            .get(&account_id)
            .expect("The account does not own any tokens.");
        let limit = limit.map(|v| v as usize).unwrap_or(usize::MAX);
        assert_ne!(limit, 0, "Cannot provide limit of 0.");
        if limit == 0 {
            return vec![];
        }
        let start_index = from_index.map(From::from).unwrap_or_default();

        if token_set.len() as u128 <= start_index {
            return vec![];
        }

        token_set
            .iter()
            .skip(start_index as usize)
            .map(|token_id| self.nft_token(token_id).unwrap())
            .collect()
    }

    // 查看所有的nft
    pub fn view_all_nft(&self, from_index: Option<U128>, limit: Option<u64>) -> Vec<Token> {
        let all_tokens = self.tokens.nft_tokens(from_index, limit);
        all_tokens.into_iter().collect()
    }

    pub(crate) fn next_id(&mut self) -> u64 {
        self.unique_id += 1;
        self.unique_id
    }

    // 创建NFT
    pub(crate) fn internal_mint(
        &mut self,
        account_id: &AccountId,
        token_id: &TokenId,
        metadata: &TokenMetadata,
        memo: Option<String>,
        secret: String,
    ) {
        self.tokens.owner_by_id.insert(token_id, account_id);
        // 添加 secret
        self.set_account_description(token_id.clone(), secret);

        if let Some(tokens_per_owner) = &mut self.tokens.tokens_per_owner {
            let mut token_ids = tokens_per_owner.get(account_id).unwrap_or_else(|| {
                UnorderedSet::new(
                    near_contract_standards::non_fungible_token::core::StorageKey::TokensPerOwner {
                        account_hash: env::sha256(&account_id.try_to_vec().unwrap()), // 也可以用 `account_id.as_bytes()`, 但使用 borsh 字节更加通用
                    },
                )
            });
            token_ids.insert(token_id);
            tokens_per_owner.insert(account_id, &token_ids);
        }

        if let Some(token_metadata_by_id) = &mut self.tokens.token_metadata_by_id {
            token_metadata_by_id.insert(token_id, metadata);
        }

        let nft_mint_log: EventLog = EventLog {
            // Standard name ("nep177").
            standard: NFT_STANDARD_NAME.to_string(),
            // Version of the standard ("nft-1.0.0").
            version: NFT_METADATA_SPEC.to_string(),
            // The data related with the event stored in a vector.
            event: EventLogVariant::NftMint(vec![NftMintLog {
                // Owner of the token.
                owner_id: account_id.clone(),
                // Vector of token IDs that were minted.
                token_ids: vec![token_id.to_string()],
                // An optional memo to include.
                memo,
            }]),
        };

        env::log_str(&nft_mint_log.to_string());
    }

    pub(crate) fn internal_burn(
        &mut self,
        account_id: &AccountId,
        token_id: &TokenId,
        memo: Option<String>,
    ) {
        // 移除 token_id -> token_owner_id 映射
        self.tokens.owner_by_id.remove(token_id);

        // 更新或移除 token_owner_id -> token_ids 映射
        if let Some(tokens_per_owner) = &mut self.tokens.tokens_per_owner {
            if let Some(mut token_ids) = tokens_per_owner.remove(account_id) {
                token_ids.remove(token_id);
                if !token_ids.is_empty() {
                    tokens_per_owner.insert(account_id, &token_ids);
                }
            }
        };

        // 移除 token_id -> token_metadata 映射
        if let Some(token_metadata_by_id) = &mut self.tokens.token_metadata_by_id {
            token_metadata_by_id.remove(token_id);
        }

        // 移除 token_id -> approval_ids 映射
        if let Some(approvals_by_id) = &mut self.tokens.approvals_by_id {
            approvals_by_id.remove(token_id);
        }

        // 移除 token_id -> next_approval_id 映射
        if let Some(next_approval_id_by_id) = &mut self.tokens.next_approval_id_by_id {
            next_approval_id_by_id.remove(token_id);
        }

        let nft_burn_log: EventLog = EventLog {
            // Standard name ("nep171").
            standard: NFT_STANDARD_NAME.to_string(),
            // Version of the standard ("nft-1.0.0").
            version: NFT_METADATA_SPEC.to_string(),
            // The data related with the event stored in a vector.
            event: EventLogVariant::NftBurnLog(vec![NftBurnLog {
                authorized_id: Some(account_id.to_string()),
                // Owner of the token.
                owner_id: account_id.to_string(),
                // Vector of token IDs that were minted.
                token_ids: vec![token_id.to_string()],
                // An optional memo to include.
                memo,
            }]),
        };

        env::log_str(&nft_burn_log.to_string());
    }
}

impl_non_fungible_token_core!(Contract, tokens);
impl_non_fungible_token_approval!(Contract, tokens);
impl_non_fungible_token_enumeration!(Contract, tokens);

pub trait MazesNonFungibleTokenMetadataProvider {
    fn nft_metadata(&self, base_uri: Option<String>) -> NFTContractMetadata;
}
// 为合约实现 NEP177
#[near_bindgen]
impl MazesNonFungibleTokenMetadataProvider for Contract {
    fn nft_metadata(&self, base_uri: Option<String>) -> NFTContractMetadata {
        NFTContractMetadata {
            spec: "nft-1.0.0".to_string(),
            name: "NFT Mazes Contract".to_string(),
            symbol: "Maze".to_string(),
            icon: None,
            base_uri,
            reference: None,
            reference_hash: None,
        }
    }
}
