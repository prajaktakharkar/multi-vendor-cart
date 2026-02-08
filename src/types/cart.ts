export interface Seller {
  id: string;
  name: string;
  avatar: string;
  rating: number;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  sellerId: string;
}

export interface CartState {
  items: CartItem[];
  sellers: Seller[];
}
