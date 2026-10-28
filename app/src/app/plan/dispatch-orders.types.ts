import { dispatchOrderActions, dispatchOrderAssets } from './dispatch-orders.constants';
import { IDispatchOrder } from './dispatch-orders.interfaces';

export type DispatchOrderAction = (typeof dispatchOrderActions)[keyof typeof dispatchOrderActions];

export type DispatchOrderAsset = (typeof dispatchOrderAssets)[keyof typeof dispatchOrderAssets];

export type DispatchOrderDraft = Omit<IDispatchOrder, 'id' | 'number' | 'actionLabel' | 'assetLabel' | 'timeRange'> &
  Partial<Pick<IDispatchOrder, 'timeRange'>>;
