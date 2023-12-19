use near_contract_standards::non_fungible_token::metadata::{
    NFTContractMetadata, NonFungibleTokenMetadataProvider, TokenMetadata,
};
use near_contract_standards::non_fungible_token::{NonFungibleToken, Token, TokenId};
use near_contract_standards::{
    impl_non_fungible_token_approval, impl_non_fungible_token_core,
    impl_non_fungible_token_enumeration,
};
use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};

use near_sdk::{near_bindgen, AccountId, BorshStorageKey, PanicOnDefault, Promise, PromiseOrValue};

pub use crate::events::*;
pub use crate::mazes::*;

mod events;
mod mazes;

#[near_bindgen] // 定义合约根结构, 一个项目中只能有一个根结构
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)] // 实现 borsh 序列化, 实现不可用的 `default` 方法以通过编译
pub struct Contract {
    // 合约所有者
    owner_id: AccountId,

    tokens: NonFungibleToken,
    // 使用全局自增 id 作为 NFT id
    unique_id: u64,
}

// 存储在链上的键结构
#[derive(BorshSerialize, BorshStorageKey)]
enum StorageKey {
    Approval,
    Enumeration,
    TokenMetadata,
    NonFungibleToken,
}

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
        }
    }
}

impl_non_fungible_token_core!(Contract, tokens);
impl_non_fungible_token_approval!(Contract, tokens);
impl_non_fungible_token_enumeration!(Contract, tokens);

// 为合约实现 NEP177
#[near_bindgen]
impl NonFungibleTokenMetadataProvider for Contract {
    fn nft_metadata(&self) -> NFTContractMetadata {
        NFTContractMetadata {
            spec: "nft-1.0.0".to_string(),
            name: "NFT Mazes Contract".to_string(),
            symbol: "Maze".to_string(),
            icon: None,
            base_uri: None,
            reference: None,
            reference_hash: None,
        }
    }
}

#[cfg(test)]
mod test {
    use crate::Contract;
    use near_contract_standards::non_fungible_token::approval::NonFungibleTokenApproval;

    use near_contract_standards::non_fungible_token::core::NonFungibleTokenCore;
    use near_contract_standards::non_fungible_token::enumeration::NonFungibleTokenEnumeration;
    use near_contract_standards::non_fungible_token::metadata::TokenMetadata;
    use near_contract_standards::non_fungible_token::TokenId;

    use near_sdk::json_types::U128;
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::{testing_env, AccountId, ONE_NEAR, ONE_YOCTO};

    fn owner() -> AccountId {
        "owner.near".parse().unwrap()
    }

    fn alice() -> AccountId {
        "alice.near".parse().unwrap()
    }

    fn bob() -> AccountId {
        "bob.near".parse().unwrap()
    }

    fn token(token_id: TokenId) -> TokenMetadata {
        TokenMetadata {
            title: Some(format!("HelloNFT #{}", token_id)),
            description: None,
            media: None,
            media_hash: None,
            copies: None,
            issued_at: None,
            expires_at: None,
            starts_at: None,
            updated_at: None,
            extra: None,
            reference: None,
            reference_hash: None,
        }
    }

    #[test]
    fn test_mint_transfer_burn() {
        let mut contract = Contract::init(owner());

        let token_id_1 = "1".to_string();
        let token_1 = token(token_id_1.clone());
        let token_id_2 = "2".to_string();
        let token_2 = token(token_id_2.clone());

        // --------------------------------- 给 Bob mint NFT ---------------------------------------

        testing_env!(VMContextBuilder::new()
            .predecessor_account_id(owner())
            .build());

        contract.mint(bob(), token_1, None);
        contract.mint(bob(), token_2, None);

        assert_eq!(
            contract.nft_token(token_id_1.clone()).unwrap().owner_id,
            bob()
        );
        assert_eq!(
            contract.nft_token(token_id_2.clone()).unwrap().owner_id,
            bob()
        );
        assert_eq!(contract.nft_total_supply(), U128(2));

        // -------------------------------- Bob 给 Alice 转 NFT -------------------------------------

        // `nft_transfer` 调用需要附加 1 yocto NEAR
        testing_env!(VMContextBuilder::new()
            .predecessor_account_id(bob())
            .attached_deposit(ONE_YOCTO)
            .build());

        contract.nft_transfer(alice(), token_id_1.clone(), None, None);

        assert_eq!(
            contract.nft_token(token_id_1.clone()).unwrap().owner_id,
            alice()
        );
        assert_eq!(
            contract.nft_token(token_id_2.clone()).unwrap().owner_id,
            bob()
        );
        assert_eq!(contract.nft_total_supply(), U128(2));

        // ---------------------------------- 销毁 Bob 的 NFT ---------------------------------------

        testing_env!(VMContextBuilder::new()
            .predecessor_account_id(owner())
            .build());

        contract.burn(bob(), token_id_2.clone(), None);

        assert_eq!(contract.nft_token(token_id_1).unwrap().owner_id, alice());
        assert!(contract.nft_token(token_id_2).is_none());
        assert_eq!(contract.nft_total_supply(), U128(1));
    }

    #[test]
    fn test_approve_transfer() {
        let mut contract = Contract::init(owner());

        let token_id = "1".to_string();
        let token = token(token_id.clone());

        // --------------------------------- 给 Bob mint NFT ---------------------------------------

        testing_env!(VMContextBuilder::new()
            .predecessor_account_id(owner())
            .build());

        contract.mint(bob(), token, None);

        assert_eq!(
            contract.nft_token(token_id.clone()).unwrap().owner_id,
            bob()
        );

        // ------------------------------- Bob 授权 NFT 给 Alice ------------------------------------

        // `nft_approve` 需要附加一些 NEAR 作为被授权账户的存储费
        testing_env!(VMContextBuilder::new()
            .predecessor_account_id(bob())
            .attached_deposit(ONE_NEAR / 100) // 附加 0.01 NEAR
            .build());

        contract.nft_approve(token_id.clone(), alice(), None);

        assert!(contract.nft_is_approved(token_id.clone(), alice(), None));

        // ---------------------------- Alice 通过授权把 Bob 的NFT 转给自己 ---------------------------

        // `nft_transfer` 调用需要附加 1 yocto NEAR
        testing_env!(VMContextBuilder::new()
            .predecessor_account_id(alice())
            .attached_deposit(ONE_YOCTO)
            .build());

        contract.nft_transfer(alice(), token_id.clone(), None, None);

        assert_eq!(
            contract.nft_token(token_id.clone()).unwrap().owner_id,
            alice()
        );
        assert!(!contract.nft_is_approved(token_id, alice(), None));
    }
}
