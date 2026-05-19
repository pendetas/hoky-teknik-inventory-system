import { ShopeeReturnStatus } from './types';

const waitingForShopee: ShopeeReturnStatus = 'Barang Rusak - Menunggu Shopee';

// @ts-expect-error Menunggu Cek is merged into Barang Rusak - Menunggu Shopee.
const removedWaitingCheckStatus: ShopeeReturnStatus = 'Menunggu Cek';

void waitingForShopee;
void removedWaitingCheckStatus;
