import { supabase } from '../lib/supabaseClient';
import {
  ShopeeDeliveryMethod,
  ShopeeOrderItem,
  ShopeeOrderStatus,
  ShopeePurchaseMethod,
  ShopeeReturnCase,
  ShopeeReturnStatus,
  ShopeeSale,
} from '../lib/types';

type ShopeeOrderItemRow = {
  id: string;
  product_id: string;
  quantity: number;
};

type ShopeeOrderRow = {
  id: string;
  order_id: string;
  delivery_id: string | null;
  order_date: string;
  status: string;
  payment_method: string;
  delivery_method: string;
  estimated_receipt_amount: number;
  final_receipt_amount: number | null;
  receivable_amount: number;
  note: string | null;
  created_at: string;
  shopee_order_items?: ShopeeOrderItemRow[];
};

type ShopeeReturnCaseRow = {
  id: string;
  shopee_order_id: string;
  return_status: string;
  compensation_amount: number;
  note: string | null;
  created_at: string;
  updated_at: string;
  shopee_orders: ShopeeOrderRow | ShopeeOrderRow[];
};

export type ShopeeOrderInput = Omit<ShopeeSale, 'id' | 'createdAt' | 'items' | 'receivableAmount'> & {
  items: Omit<ShopeeOrderItem, 'id'>[];
};

export type ShopeeOrderStatusInput = {
  status: ShopeeOrderStatus;
  finalReceiptAmount?: number | null;
};

const assertShopeeStatus = (status: string): ShopeeOrderStatus => {
  if (status === 'Shipped' || status === 'Delivered' || status === 'Returned') {
    return status;
  }

  throw new Error(`Status Shopee tidak dikenal: ${status}`);
};

const assertPaymentMethod = (method: string): ShopeePurchaseMethod => {
  if (method === 'Online Payment' || method === 'COD' || method === 'Shopee Pay Later' || method === 'Instant') {
    return method;
  }

  throw new Error(`Metode pembayaran Shopee tidak dikenal: ${method}`);
};

const assertDeliveryMethod = (method: string): ShopeeDeliveryMethod => {
  if (
    method === 'Shopee Xpress' ||
    method === 'J&T Express' ||
    method === 'JNE' ||
    method === 'SiCepat' ||
    method === 'Anteraja' ||
    method === 'Lainnya'
  ) {
    return method;
  }

  throw new Error(`Metode pengiriman Shopee tidak dikenal: ${method}`);
};

const assertReturnStatus = (status: string): ShopeeReturnStatus => {
  if (
    status === 'Barang Bagus' ||
    status === 'Barang Rusak - Menunggu Shopee' ||
    status === 'Barang Rusak - Dikompensasi' ||
    status === 'Barang Rusak - Ditolak'
  ) {
    return status;
  }

  throw new Error(`Status pengembalian Shopee tidak dikenal: ${status}`);
};

const toShopeeSale = (row: ShopeeOrderRow): ShopeeSale => ({
  id: row.id,
  orderId: row.order_id,
  deliveryId: row.delivery_id || '',
  items: (row.shopee_order_items || []).map((item) => ({
    id: item.id,
    productId: item.product_id,
    quantity: item.quantity,
  })),
  price: row.estimated_receipt_amount,
  finalReceiptAmount: row.final_receipt_amount,
  receivableAmount: row.receivable_amount,
  deliveryMethod: assertDeliveryMethod(row.delivery_method || 'Shopee Xpress'),
  purchaseMethod: assertPaymentMethod(row.payment_method),
  note: row.note || '',
  status: assertShopeeStatus(row.status),
  date: row.order_date,
  createdAt: row.created_at,
});

const toShopeeReturnCase = (row: ShopeeReturnCaseRow): ShopeeReturnCase => ({
  id: row.id,
  shopeeOrderId: row.shopee_order_id,
  returnStatus: assertReturnStatus(row.return_status),
  compensationAmount: row.compensation_amount,
  note: row.note || '',
  order: toShopeeSale(Array.isArray(row.shopee_orders) ? row.shopee_orders[0] : row.shopee_orders),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const shopeeOrdersService = {
  async listShopeeOrders(): Promise<ShopeeSale[]> {
    const { data, error } = await supabase
      .from('shopee_orders')
      .select(`
        id,
        order_id,
        delivery_id,
        order_date,
        status,
        payment_method,
        delivery_method,
        estimated_receipt_amount,
        final_receipt_amount,
        receivable_amount,
        note,
        created_at,
        shopee_order_items (
          id,
          product_id,
          quantity
        )
      `)
      .order('order_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return ((data || []) as ShopeeOrderRow[]).map(toShopeeSale);
  },

  async createShopeeOrder(order: ShopeeOrderInput): Promise<void> {
    const { error } = await supabase.rpc('create_shopee_order', {
      p_order_id: order.orderId,
      p_delivery_id: order.deliveryId,
      p_order_date: order.date,
      p_status: order.status,
      p_payment_method: order.purchaseMethod,
      p_delivery_method: order.deliveryMethod,
      p_estimated_receipt_amount: order.price,
      p_final_receipt_amount: order.finalReceiptAmount,
      p_note: order.note,
      p_items: order.items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
      })),
    });

    if (error) {
      throw new Error(error.message);
    }
  },

  async updateShopeeOrderStatus(id: string, input: ShopeeOrderStatus | ShopeeOrderStatusInput): Promise<void> {
    const status = typeof input === 'string' ? input : input.status;
    const finalReceiptAmount = typeof input === 'string' ? undefined : input.finalReceiptAmount;

    const { error } = await supabase.rpc('update_shopee_order_status', {
      p_shopee_order_id: id,
      p_status: status,
      p_final_receipt_amount: finalReceiptAmount ?? null,
    });

    if (error) {
      throw new Error(error.message);
    }
  },

  async updateShopeeOrder(id: string, order: ShopeeOrderInput): Promise<void> {
    const { error } = await supabase.rpc('update_shopee_order', {
      p_shopee_order_id: id,
      p_order_id: order.orderId,
      p_delivery_id: order.deliveryId,
      p_order_date: order.date,
      p_status: order.status,
      p_payment_method: order.purchaseMethod,
      p_delivery_method: order.deliveryMethod,
      p_estimated_receipt_amount: order.price,
      p_final_receipt_amount: order.finalReceiptAmount,
      p_note: order.note,
      p_items: order.items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
      })),
    });

    if (error) {
      throw new Error(error.message);
    }
  },

  async listShopeeReturnCases(): Promise<ShopeeReturnCase[]> {
    const { data, error } = await supabase
      .from('shopee_return_cases')
      .select(`
        id,
        shopee_order_id,
        return_status,
        compensation_amount,
        note,
        created_at,
        updated_at,
        shopee_orders!inner (
          id,
          order_id,
          delivery_id,
          order_date,
          status,
          payment_method,
          delivery_method,
          estimated_receipt_amount,
          final_receipt_amount,
          receivable_amount,
          note,
          created_at,
          shopee_order_items (
            id,
            product_id,
            quantity
          )
        )
      `)
      .eq('shopee_orders.status', 'Returned')
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return ((data || []) as unknown as ShopeeReturnCaseRow[]).map(toShopeeReturnCase);
  },

  async updateShopeeReturnCase(
    id: string,
    returnStatus: ShopeeReturnStatus,
    compensationAmount: number,
    note: string
  ): Promise<void> {
    const { error } = await supabase.rpc('update_shopee_return_case', {
      p_return_case_id: id,
      p_return_status: returnStatus,
      p_compensation_amount: compensationAmount,
      p_note: note,
    });

    if (error) {
      throw new Error(error.message);
    }
  },

  async deleteShopeeOrder(id: string): Promise<void> {
    const { error } = await supabase.rpc('delete_shopee_order', {
      p_shopee_order_id: id,
    });

    if (error) {
      throw new Error(error.message);
    }
  },
};
