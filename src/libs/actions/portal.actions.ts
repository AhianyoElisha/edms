'use server'

import { Account, Client, Databases, Query, Storage } from 'node-appwrite'
import { appwriteConfig } from '../appwrite.config'
import { isCompanyRoleName } from '@/utils/companyAccess'

/**
 * Data for company logins (see utils/companyAccess).
 *
 * Every function takes the caller's short-lived session token, works out which
 * company that account belongs to, and reads with the server key filtered to
 * that company. The company is never taken from the request, so one company
 * cannot ask for another's rows, and only the fields listed here leave the
 * server (no prices, driver rates or internal notes).
 */

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!
const PROJECT = process.env.NEXT_PUBLIC_APPWRITE_PROJECT!

const admin = () => new Client().setEndpoint(ENDPOINT).setProject(PROJECT).setKey(process.env.APPWRITE_API_KEY!)
const db = () => new Databases(admin())

export type PortalProfile = {
  $id: string
  name: string
  email: string
  avatar?: string | null
  companyId: string
  companyName: string
}

export type PortalTrip = {
  $id: string
  tripNumber: string
  tripDate: string
  status: string
  route: string
  vehicle: string
  driver: string
  tonnage: string | null
  totalPackages: number
  manifestCount: number
  startTime: string | null
  endTime: string | null
}

export type PortalManifest = {
  $id: string
  manifestNumber: string
  manifestDate: string | null
  status: string
  tripId: string | null
  tripNumber: string
  dropoff: string
  packageSize: string | null
  packageCount: number
  deliveredCount: number
  shortageCount: number
  deliveryTime: string | null
  hasManifestPhoto: boolean
  hasDeliveryPhoto: boolean
}

type Session = { user: any; companyId: string; companyName: string }

// Who is asking, and for which company. Throws unless it is an active company login.
async function requireCompany(jwt: string): Promise<Session> {
  if (!jwt) throw new Error('Not signed in')

  let accountId: string

  try {
    const account = await new Account(new Client().setEndpoint(ENDPOINT).setProject(PROJECT).setJWT(jwt)).get()

    accountId = account.$id
  } catch {
    throw new Error('Your session has expired. Please sign in again.')
  }

  const users = await db().listDocuments(appwriteConfig.database, appwriteConfig.users, [
    Query.equal('accountId', accountId),
    Query.select(['*', 'role.name', 'role.displayName']),
    Query.limit(1)
  ])

  const user = users.documents[0] as any

  if (!user || user.status === 'deleted') throw new Error('This account is not active.')
  if (!user.companyId || !isCompanyRoleName(user.role?.name)) throw new Error('This account is not a company login.')

  const company = (await db().getDocument(appwriteConfig.database, appwriteConfig.companies, user.companyId)) as any

  if (company.isActive === false) throw new Error('This company is not active.')

  return { user, companyId: user.companyId, companyName: company.name }
}

// Appwrite returns at most 500 rows a page when relationships are expanded
async function listAll(collectionId: string, queries: string[]) {
  const rows: any[] = []
  let cursor: string | undefined

  for (let page = 0; page < 40; page++) {
    const response = await db().listDocuments(appwriteConfig.database, collectionId, [
      ...queries,
      Query.limit(500),
      ...(cursor ? [Query.cursorAfter(cursor)] : [])
    ])

    rows.push(...response.documents)
    if (response.documents.length < 500) break
    cursor = response.documents[response.documents.length - 1].$id
  }

  return rows
}

const locationLabel = (location: any) =>
  location && typeof location === 'object' ? location.locationName || location.city || location.address || '' : ''

export async function portalGetProfile(jwt: string): Promise<PortalProfile> {
  const { user, companyId, companyName } = await requireCompany(jwt)

  return { $id: user.$id, name: user.name, email: user.email, avatar: user.avatar, companyId, companyName }
}

export async function portalListTrips(jwt: string): Promise<PortalTrip[]> {
  const { companyId } = await requireCompany(jwt)

  const trips = await listAll(appwriteConfig.trips, [
    Query.equal('companyId', companyId),
    Query.notEqual('status', 'deleted'),
    Query.orderDesc('tripDate'),
    Query.select([
      '$id', 'tripNumber', 'tripDate', 'status', 'tonnage', 'totalPackages', 'startTime', 'endTime', 'checkpoints',
      'route.routeName', 'vehicle.vehicleNumber', 'driver.name'
    ])
  ])

  return trips.map(trip => {
    let manifestCount = 0

    try {
      const checkpoints = trip.checkpoints ? JSON.parse(trip.checkpoints) : []

      manifestCount = Array.isArray(checkpoints) ? checkpoints.length : 0
    } catch {
      manifestCount = 0
    }

    return {
      $id: trip.$id,
      tripNumber: trip.tripNumber,
      tripDate: trip.tripDate,
      status: trip.status,
      route: trip.route?.routeName || '',
      vehicle: trip.vehicle?.vehicleNumber || '',
      driver: trip.driver?.name || '',
      tonnage: trip.tonnage || null,
      totalPackages: trip.totalPackages || 0,
      manifestCount,
      startTime: trip.startTime || null,
      endTime: trip.endTime || null
    }
  })
}

export async function portalListManifests(jwt: string): Promise<PortalManifest[]> {
  const { companyId } = await requireCompany(jwt)

  const manifests = await listAll(appwriteConfig.manifests, [
    Query.equal('companyId', companyId),
    Query.orderDesc('$createdAt'),
    Query.select([
      '$id', 'manifestNumber', 'manifestDate', 'status', 'packageSize', 'packageCount', 'deliveredCount',
      'shortageCount', 'deliveryTime', 'manifestImage', 'proofOfDeliveryImage',
      'trip.$id', 'trip.tripNumber', 'trip.status',
      'dropofflocation.locationName', 'dropofflocation.city', 'dropofflocation.address'
    ])
  ])

  return manifests
    .filter(manifest => manifest.trip?.status !== 'deleted')
    .map(manifest => ({
      $id: manifest.$id,
      manifestNumber: manifest.manifestNumber,
      manifestDate: manifest.manifestDate || null,
      status: manifest.status,
      tripId: manifest.trip?.$id || null,
      tripNumber: manifest.trip?.tripNumber || '',
      dropoff: locationLabel(manifest.dropofflocation),
      packageSize: manifest.packageSize || null,
      packageCount: manifest.packageCount || 0,
      deliveredCount: manifest.deliveredCount || 0,
      shortageCount: manifest.shortageCount || 0,
      deliveryTime: manifest.deliveryTime || null,
      hasManifestPhoto: !!manifest.manifestImage,
      hasDeliveryPhoto: !!manifest.proofOfDeliveryImage
    }))
}

/**
 * A manifest's photo as a data URL. The file bucket is closed to company accounts,
 * so the picture is read here, and only after checking the manifest is theirs.
 */
export async function portalGetManifestPhoto(jwt: string, manifestId: string, kind: 'manifest' | 'delivery'): Promise<string | null> {
  const { companyId } = await requireCompany(jwt)

  const manifest = (await db().getDocument(appwriteConfig.database, appwriteConfig.manifests, manifestId)) as any

  if (manifest.companyId !== companyId) throw new Error('Not found')

  const stored: string | null = kind === 'manifest' ? manifest.manifestImage : manifest.proofOfDeliveryImage

  if (!stored) return null

  // Stored either as a bare file id or as a full .../files/<id>/view URL
  const fileId = stored.match(/\/files\/([^/?]+)/)?.[1] || stored

  const storage = new Storage(admin())
  const file = await storage.getFile(appwriteConfig.bucket, fileId)
  const bytes = await storage.getFileView(appwriteConfig.bucket, fileId)

  return `data:${file.mimeType || 'image/jpeg'};base64,${Buffer.from(bytes).toString('base64')}`
}
