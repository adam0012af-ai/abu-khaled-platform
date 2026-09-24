export type ProviderStatus =
  | "ready_after_account"
  | "affiliate_available_api_pending"
  | "client_only_docs"
  | "researching";

export type NormalizedProduct = {
  provider: string;
  provider_product_id: string;
  store_id: string;
  store_name: string;
  title: string;
  description?: string;
  image_url?: string;
  gallery?: string[];
  product_url: string;
  affiliate_url: string;
  currency: string;
  price: number;
  old_price?: number;
  discount_percent?: number;
  availability?: "in_stock" | "out_of_stock" | "unknown";
  coupon_code?: string;
  category?: string;
  brand?: string;
  locale?: string;
  country?: string;
  last_updated_at?: string;
};

export type AffiliateProviderDefinition = {
  id: string;
  name: string;
  status: ProviderStatus;
  integration: "api" | "feed" | "api_or_feed";
  auth: "bearer" | "api_key" | "account_specific" | "pending";
  supports: {
    products: boolean;
    prices: boolean;
    images: boolean;
    availability: boolean;
    coupons: boolean;
    affiliateLinks: boolean;
    reporting: boolean;
  };
  notes: string[];
};
