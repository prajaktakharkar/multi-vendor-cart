import { CartItem, Seller } from "@/types/cart";

export const mockSellers: Seller[] = [
  {
    id: "seller-1",
    name: "Artisan Home Co.",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
    rating: 4.9,
  },
  {
    id: "seller-2",
    name: "Nordic Essentials",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
    rating: 4.7,
  },
  {
    id: "seller-3",
    name: "Green Thumb Gardens",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    rating: 4.8,
  },
];

export const mockCartItems: CartItem[] = [
  {
    id: "item-1",
    name: "Handcrafted Ceramic Vase",
    price: 89.00,
    quantity: 1,
    image: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=300&h=300&fit=crop",
    sellerId: "seller-1",
  },
  {
    id: "item-2",
    name: "Woven Cotton Throw Blanket",
    price: 65.00,
    quantity: 2,
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=300&h=300&fit=crop",
    sellerId: "seller-1",
  },
  {
    id: "item-3",
    name: "Minimalist Desk Lamp",
    price: 129.00,
    quantity: 1,
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=300&h=300&fit=crop",
    sellerId: "seller-2",
  },
  {
    id: "item-4",
    name: "Linen Cushion Cover Set",
    price: 45.00,
    quantity: 3,
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=300&fit=crop",
    sellerId: "seller-2",
  },
  {
    id: "item-5",
    name: "Monstera Deliciosa Plant",
    price: 42.00,
    quantity: 1,
    image: "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=300&h=300&fit=crop",
    sellerId: "seller-3",
  },
];
