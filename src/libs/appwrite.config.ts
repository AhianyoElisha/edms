import { Client, Account, Databases, Storage, Avatars, TablesDB } from "appwrite";

export const appwriteConfig = {
  api: 'standard_d66eacaf9cc16d0614716c5e6d9451e1d17230bd5bdf343f6a1544e8ac79bff9238d57512830ea11a4ec4b2d5dd1d9d7962f8e8eb9c2fcff76c2d05d46fe61f6a789f81f7d6a4efb10c33c448640a4648289216fdd3001642375d7d053c76c1c56241a0b2c453d80f05941a7602ba5a9a51a72ddf0a843f4f90cc0cff3cdc194',
  project:'68c8989000381e194776',
  database:'68d5e82e00304125c0ae',
  roles:'68d5e8650013cd602cbd',
  permissions:'68d5e91c00199b41987c',
  rolePermissions:'68d5e9e700352da19b9c',
  returns: '6836c786002d2e8527e0',
  expenses: '6835de68001ebc3f8216',
  customers: '67816cba000ee1965910',
  suppliers: '6776925b001ca687c855',
  workers: '68344c21001258fc1f54',
  workersproduction: '6838fd86002d05082fd6',
  vehicles: '68d5fee7003e1d64d4cb',
  distributedproducts: '677d92d30001b9567338',
  soldproducts: '6780fe6b0003aee2eefa',
  distribution: '677f969a0009a8c70dd0',
  orders: '677791610021312c5a43',
  productioncategory: '6737332200129e30fa86',
  requisitionhistory: '673ce306001f923a6b20',
  warehouse:'66c245e500065eaf9f6f',
  storesrequisition:'676e11fc00040264e32a',
  productionrequisition:'676e1215001082576857',
  warehouserequisition:'676e1222003df5e30ac0',
  salesrequisition:'676e123400360eba7c42',
  sales:'66c2460a00339fb96286',
  bucket:'66c246e400356ab125ee',
  endpoint:'https://cloud.appwrite.io/v1',
  users: '68d5eb2a0035c2892e30',
  packages: '68d5f888003df624b455',
  pickuplocations: '68d5f9f600152a86e41e',
  dropofflocations: '68d5fb6700187a5d2ddd',
  drivers: '68d601d5002442e07af8',
  routes: '68d5fd6d001724b175fa',
  manifests: '68d605dd001bd30c7ff4',
  deliveries: '68d60b47002c4d3883eb',
  tripexenses: '68d60fa6002c88a35f3f',
  trips: '68d60fed0006e92089b6',
  ratecards: '68d615200027173fa63e',
  notifications: '68d617c100052a1662ee',
  machinery: '68d617c100052a1662ee', // Using same as notifications for now
  production: '68d617c100052a1662ee', // Using same as notifications for now
  salesestimate: '68d617c100052a1662ee', // Using same as notifications for now
  warehouseestimate: '68d617c100052a1662ee', // Using same as notifications for now
  productionestimate: '68d617c100052a1662ee', // Using same as notifications for now
  salescategory: '68d617c100052a1662ee', // Using same as notifications for now
  inventorycategory: '68d617c100052a1662ee', // Using same as notifications for now
  spoilage: '68d617c100052a1662ee', // Using same as notifications for now
  stores: '68d617c100052a1662ee', // Using same as notifications for now
};


export const client = new Client();

client.setEndpoint('https://cloud.appwrite.io/v1');
client.setProject('68c8989000381e194776');  

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const avatars = new Avatars(client);
export const tablesDB = new TablesDB(client);