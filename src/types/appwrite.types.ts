import { Models } from "appwrite";

export interface Inventory extends Models.Document {
  userId: string;
  vendorName: string;
  category: string;
  InvoiceNumber: string;
  batchNumber: string;
  description: string;
  images: string[];
}

export interface AddToStores extends Models.Document {
  inventory: Inventory;
  schedule: Date;
  status: Status;
  reason: string;
  note: string;
  userId: string;
  cancellationReason: string | null;
}

export interface AddToProduction extends Models.Document {
  inventory: Inventory;
  schedule: Date;
  status: Status;
  reason: string;
  note: string;
  userId: string;
  cancellationReason: string | null;
}

export interface AddToWareHouse extends Models.Document {
  inventory: Inventory;
  schedule: Date;
  status: Status;
  reason: string;
  note: string;
  userId: string;
  cancellationReason: string | null;
}

export interface AddToSales extends Models.Document {
  inventory: Inventory;
  schedule: Date;
  status: Status;
  reason: string;
  note: string;
  userId: string;
  cancellationReason: string | null;
}