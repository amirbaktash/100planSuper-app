// orderbook.ts — تغییر Fill:
export interface Fill { price: number; qty: number;
  buyOrderId: string; sellOrderId: string;
  buyUserId: string; sellUserId: string; }
// هنگام ساخت fill: userId از هر دو سفارش کپی شود
