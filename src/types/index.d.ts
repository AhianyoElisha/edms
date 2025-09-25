/* eslint-disable no-unused-vars */

declare type SearchParamProps = {
  params: { [key: string]: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

declare type Status = "stores" | "production" | "warehouse" | "sales";


declare interface User  {
    $id: string;
    accountname: string;
    email: string;
    phone: string;
    role: string;
}

declare interface InventoryParams {
  vendorName: string;
  category: string;
  InvoiceNumber: string;
  batchNumber: string;
  description: string;
  images: string[];
}

declare type AddToStoreParams = {
  userId: string;
  inventory: string;
  primaryPhysician: string;
  reason: string;
  schedule: Date;
  status: Status;
  note: string | undefined;
};

declare type UpdateAppointmentParams = {
  appointmentId: string;
  userId: string;
  appointment: Appointment;
  type: string;
};