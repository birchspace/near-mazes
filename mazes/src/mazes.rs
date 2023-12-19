use near_sdk::collections::UnorderedSet;
use near_sdk::{env, near_bindgen, require, AccountId};

use crate::*;

pub const NFT_METADATA_SPEC: &str = "1.0.0";
pub const NFT_STANDARD_NAME: &str = "nep171";

#[near_bindgen]
impl Contract {
    // 合约所有者能为任意用户 mint NFT
    pub fn mint(&mut self, account_id: AccountId, metadata: TokenMetadata, memo: Option<String>) {
        require!(
            env::predecessor_account_id() == self.owner_id,
            "Only contract owner can call this method."
        );
        let token_id = self.next_id().to_string();
        self.internal_mint(&account_id, &token_id, &metadata, memo);
    }

    // 合约所有者能为任意用户 burn NFT
    pub fn burn(&mut self, account_id: AccountId, token_id: TokenId, memo: Option<String>) {
        require!(
            env::predecessor_account_id() == self.owner_id,
            "Only contract owner can call this method."
        );
        self.internal_burn(&account_id, &token_id, memo);
    }

    pub(crate) fn next_id(&mut self) -> u64 {
        self.unique_id += 1;
        self.unique_id
    }

    pub(crate) fn internal_mint(
        &mut self,
        account_id: &AccountId,
        token_id: &TokenId,
        metadata: &TokenMetadata,
        memo: Option<String>,
    ) {
        // 添加 token_id -> token_owner_id 映射
        self.tokens.owner_by_id.insert(token_id, account_id);

        // 更新或添加 token_owner_id -> token_ids 映射
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

        // 添加 token_id -> token_metadata 映射
        if let Some(token_metadata_by_id) = &mut self.tokens.token_metadata_by_id {
            token_metadata_by_id.insert(token_id, metadata);
        }

        let nft_mint_log: EventLog = EventLog {
            // Standard name ("nep171").
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
