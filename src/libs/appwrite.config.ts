import { Client, Account, Databases, Storage, Avatars, TablesDB } from "appwrite";

export const appwriteConfig = {
  api: '6b27b3c2320cf79ed942fc4306938f0f0549dcfdc35e50e1c54f712d7c20f6ee096576b7b65b9fa5582e374b1229129b8f3670795698a69c8cefcc12721076f6f0bc756396976872166514afbc3da0070d6c29f09e1da2a46c9e21a9749044562e0409529b7fd1933076e7e72ecde330c264053920990a460e65d3c83b6e00bb',
  project:'66c243a20028cef0b093',
  database:'677ea3c633278f5467ad',
  roles:'68d0a7800023b120fa0d',
  permissions:'68d165cf0037866f4fe3',
  rolePermissions:'68d165160023a8c79b3b',
  stores:'66c2458100073be018db',
  production: '66c245b0000629eb3998',
  productionestimate: '67411f5500381c88dc1b',
  warehouseestimate: '6743443c00174a36d8de',
  salesestimate: '6775ca8d003ca204d1fb',
  salescategory: '682b493d0034550d6be8',
  spoilage: '6838652e0036851fabed',
  inventorycategory: '677f2786003a6cb148b8',
  machinerycategory: '6818da0f002e3657395d',
  machinery: '6818e8320015bd7d02e7',
  returns: '6836c786002d2e8527e0',
  expenses: '6835de68001ebc3f8216',
  customers: '67816cba000ee1965910',
  suppliers: '6776925b001ca687c855',
  workers: '68344c21001258fc1f54',
  workersproduction: '6838fd86002d05082fd6',
  vehicles: '677f9484000ff23b650b',
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
  users: '677f9b83001edd5a6608',
};


export const client = new Client();

client.setEndpoint('https://cloud.appwrite.io/v1');
client.setProject('66c243a20028cef0b093');  

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const avatars = new Avatars(client);
export const tablesDB = new TablesDB(client);