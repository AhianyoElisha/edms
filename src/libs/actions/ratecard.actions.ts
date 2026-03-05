// Appwrite Imports
import { databases } from '@/libs/appwrite.config'
import { appwriteConfig } from '@/libs/appwrite.config'
import { ID, Query } from 'appwrite'

// Type Imports
import type { 
  RateCardType, 
  RateCardInput, 
  RateCardFilters,
  VolumePrice,
  TruckCategoryType 
} from '@/types/apps/deliveryTypes'

// Helper to parse volume prices from string (stored in DB) to array
function parseVolumePrices(volumePrices: string | VolumePrice[]): VolumePrice[] {
  if (typeof volumePrices === 'string') {
    try {
      return JSON.parse(volumePrices)
    } catch {
      return []
    }
  }
  return volumePrices
}

// Helper to get truck category from volume
export function getTruckCategoryFromVolume(volume: number): TruckCategoryType {
  return volume <= 18 ? 'small' : 'big'
}

/**
 * Get all rate cards with optional filtering
 */
export async function getAllRateCards(filters?: RateCardFilters): Promise<RateCardType[]> {
  try {
    const queries: string[] = []

    if (filters) {
      if (filters.clientCode) {
        queries.push(Query.equal('clientCode', filters.clientCode))
      }
      if (filters.routeCode) {
        queries.push(Query.equal('routeCode', filters.routeCode))
      }
      if (filters.isActive !== undefined) {
        queries.push(Query.equal('isActive', filters.isActive))
      }
      if (filters.search) {
        queries.push(Query.search('routeDescription', filters.search))
      }
    }

    queries.push(Query.orderDesc('$createdAt'))
    queries.push(Query.limit(500))

    const response = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.ratecards,
      queries
    )

    // Parse volume prices from JSON string
    const rateCards = response.documents.map((doc: any) => ({
      ...doc,
      volumePrices: parseVolumePrices(doc.volumePrices)
    }))

    return rateCards as unknown as RateCardType[]
  } catch (error) {
    console.error('Error fetching rate cards:', error)
    throw new Error('Failed to fetch rate cards')
  }
}

/**
 * Get active rate cards only
 */
export async function getActiveRateCards(): Promise<RateCardType[]> {
  try {
    const today = new Date().toISOString()

    const queries = [
      Query.equal('isActive', true),
      Query.lessThanEqual('effectiveFrom', today),
      Query.orderDesc('$createdAt'),
      Query.limit(500)
    ]

    const response = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.ratecards,
      queries
    )

    // Filter out expired rate cards (effectiveTo is past today)
    const activeCards = response.documents.filter((card: any) => {
      if (!card.effectiveTo) return true // No expiry = still active
      return new Date(card.effectiveTo) >= new Date(today)
    }).map((doc: any) => ({
      ...doc,
      volumePrices: parseVolumePrices(doc.volumePrices)
    }))

    return activeCards as unknown as RateCardType[]
  } catch (error) {
    console.error('Error fetching active rate cards:', error)
    throw new Error('Failed to fetch active rate cards')
  }
}

/**
 * Get a specific rate card by ID
 */
export async function getRateCardById(rateCardId: string): Promise<RateCardType> {
  try {
    const rateCard = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.ratecards,
      rateCardId
    )

    return {
      ...rateCard,
      volumePrices: parseVolumePrices((rateCard as any).volumePrices)
    } as unknown as RateCardType
  } catch (error) {
    console.error('Error fetching rate card:', error)
    throw new Error('Failed to fetch rate card')
  }
}

/**
 * Get rate cards by client code
 */
export async function getRateCardsByClient(clientCode: string): Promise<RateCardType[]> {
  try {
    const queries = [
      Query.equal('clientCode', clientCode),
      Query.equal('isActive', true),
      Query.orderAsc('routeCode'),
      Query.limit(500)
    ]

    const response = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.ratecards,
      queries
    )

    const rateCards = response.documents.map((doc: any) => ({
      ...doc,
      volumePrices: parseVolumePrices(doc.volumePrices)
    }))

    return rateCards as unknown as RateCardType[]
  } catch (error) {
    console.error('Error fetching rate cards by client:', error)
    throw new Error('Failed to fetch rate cards by client')
  }
}

/**
 * Get rate cards by route code
 */
export async function getRateCardsByRoute(routeCode: string): Promise<RateCardType[]> {
  try {
    const queries = [
      Query.equal('routeCode', routeCode),
      Query.equal('isActive', true),
      Query.orderDesc('effectiveFrom')
    ]

    const response = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.ratecards,
      queries
    )

    const rateCards = response.documents.map((doc: any) => ({
      ...doc,
      volumePrices: parseVolumePrices(doc.volumePrices)
    }))

    return rateCards as unknown as RateCardType[]
  } catch (error) {
    console.error('Error fetching rate cards by route:', error)
    throw new Error('Failed to fetch rate cards by route')
  }
}

/**
 * Find applicable rate for a trip
 * @param clientCode - Client/importer code
 * @param routeCode - Route code (e.g., "Route A")
 * @param volumeCBM - Volume of truck in CBM
 */
export async function findApplicableRate(
  clientCode: string,
  routeCode: string,
  volumeCBM: number
): Promise<{ rateCard: RateCardType; rate: number } | null> {
  try {
    const today = new Date().toISOString()

    const queries = [
      Query.equal('clientCode', clientCode),
      Query.equal('routeCode', routeCode),
      Query.equal('isActive', true),
      Query.lessThanEqual('effectiveFrom', today),
      Query.orderDesc('effectiveFrom'), // Get most recent rate
      Query.limit(1)
    ]

    const response = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.ratecards,
      queries
    )

    // Filter out expired rate cards
    const validCards = response.documents.filter((card: any) => {
      if (!card.effectiveTo) return true
      return new Date(card.effectiveTo) >= new Date(today)
    })

    if (validCards.length === 0) return null

    const rateCard = {
      ...validCards[0],
      volumePrices: parseVolumePrices(validCards[0].volumePrices)
    } as unknown as RateCardType

    // Find the rate for the specific volume
    const volumePrices = rateCard.volumePrices as VolumePrice[]
    const volumePrice = volumePrices.find(vp => vp.volume === volumeCBM)

    if (!volumePrice) {
      // If exact volume not found, find closest available
      const closestVolume = volumePrices.reduce((prev, curr) => 
        Math.abs(curr.volume - volumeCBM) < Math.abs(prev.volume - volumeCBM) ? curr : prev
      )
      return { rateCard, rate: closestVolume?.rate || 0 }
    }

    return { rateCard, rate: volumePrice.rate }
  } catch (error) {
    console.error('Error finding applicable rate:', error)
    return null
  }
}

/**
 * Calculate trip cost based on rate card
 * @param clientCode - Client/importer code
 * @param routeCode - Route code
 * @param volumeCBM - Truck volume in CBM
 */
export async function calculateTripCost(
  clientCode: string,
  routeCode: string,
  volumeCBM: number
): Promise<{
  rateCard: RateCardType | null
  rate: number
  truckCategory: TruckCategoryType
  volume: number
  error?: string
}> {
  try {
    const result = await findApplicableRate(clientCode, routeCode, volumeCBM)
    const truckCategory = getTruckCategoryFromVolume(volumeCBM)

    if (!result) {
      return {
        rateCard: null,
        rate: 0,
        truckCategory,
        volume: volumeCBM,
        error: `No applicable rate found for ${clientCode} on ${routeCode} with ${volumeCBM}CBM truck`
      }
    }

    return {
      rateCard: result.rateCard,
      rate: result.rate,
      truckCategory,
      volume: volumeCBM
    }
  } catch (error) {
    console.error('Error calculating trip cost:', error)
    const truckCategory = getTruckCategoryFromVolume(volumeCBM)
    return {
      rateCard: null,
      rate: 0,
      truckCategory,
      volume: volumeCBM,
      error: 'Failed to calculate trip cost'
    }
  }
}

/**
 * Get all rates for a specific route (all volume tiers)
 */
export async function getRouteRateMatrix(
  clientCode: string,
  routeCode: string
): Promise<VolumePrice[] | null> {
  try {
    const result = await findApplicableRate(clientCode, routeCode, 10) // Any volume to get the card
    
    if (!result) return null
    
    return result.rateCard.volumePrices as VolumePrice[]
  } catch (error) {
    console.error('Error getting route rate matrix:', error)
    return null
  }
}

/**
 * Create a new rate card
 */
export async function createRateCard(
  rateCardData: RateCardInput,
  creator: string
): Promise<RateCardType> {
  try {
    const rateCard = await databases.createDocument(
      appwriteConfig.database,
      appwriteConfig.ratecards,
      ID.unique(),
      {
        clientName: rateCardData.clientName,
        clientCode: rateCardData.clientCode.toUpperCase(),
        routeCode: rateCardData.routeCode,
        routeDescription: rateCardData.routeDescription,
        route: rateCardData.route || null,
        volumePrices: JSON.stringify(rateCardData.volumePrices), // Store as JSON string
        effectiveFrom: rateCardData.effectiveFrom,
        effectiveTo: rateCardData.effectiveTo || null,
        isActive: rateCardData.isActive !== undefined ? rateCardData.isActive : true,
        notes: rateCardData.notes || null,
        creator
      }
    )

    return {
      ...rateCard,
      volumePrices: rateCardData.volumePrices
    } as unknown as RateCardType
  } catch (error) {
    console.error('Error creating rate card:', error)
    throw new Error('Failed to create rate card')
  }
}

/**
 * Update a rate card
 */
export async function updateRateCard(
  rateCardId: string,
  updateData: Partial<RateCardInput>
): Promise<RateCardType> {
  try {
    const dataToUpdate: any = { ...updateData }

    // Convert client code to uppercase if provided
    if (dataToUpdate.clientCode) {
      dataToUpdate.clientCode = dataToUpdate.clientCode.toUpperCase()
    }

    // Stringify volume prices if provided
    if (dataToUpdate.volumePrices) {
      dataToUpdate.volumePrices = JSON.stringify(dataToUpdate.volumePrices)
    }

    const rateCard = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.ratecards,
      rateCardId,
      dataToUpdate
    )

    return {
      ...rateCard,
      volumePrices: parseVolumePrices((rateCard as any).volumePrices)
    } as unknown as RateCardType
  } catch (error) {
    console.error('Error updating rate card:', error)
    throw new Error('Failed to update rate card')
  }
}

/**
 * Delete a rate card
 */
export async function deleteRateCard(rateCardId: string): Promise<void> {
  try {
    await databases.deleteDocument(
      appwriteConfig.database,
      appwriteConfig.ratecards,
      rateCardId
    )
  } catch (error) {
    console.error('Error deleting rate card:', error)
    throw new Error('Failed to delete rate card')
  }
}

/**
 * Deactivate a rate card (soft delete)
 */
export async function deactivateRateCard(rateCardId: string): Promise<RateCardType> {
  try {
    const rateCard = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.ratecards,
      rateCardId,
      { isActive: false }
    )

    return {
      ...rateCard,
      volumePrices: parseVolumePrices((rateCard as any).volumePrices)
    } as unknown as RateCardType
  } catch (error) {
    console.error('Error deactivating rate card:', error)
    throw new Error('Failed to deactivate rate card')
  }
}

/**
 * Get unique client codes from rate cards
 */
export async function getUniqueClients(): Promise<{ code: string; name: string }[]> {
  try {
    const response = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.ratecards,
      [Query.limit(500)]
    )

    const clientMap = new Map<string, string>()
    response.documents.forEach((doc: any) => {
      if (!clientMap.has(doc.clientCode)) {
        clientMap.set(doc.clientCode, doc.clientName)
      }
    })

    return Array.from(clientMap.entries()).map(([code, name]) => ({ code, name }))
  } catch (error) {
    console.error('Error fetching unique clients:', error)
    throw new Error('Failed to fetch unique clients')
  }
}

/**
 * Get unique route codes from rate cards
 */
export async function getUniqueRoutes(): Promise<{ code: string; description: string }[]> {
  try {
    const response = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.ratecards,
      [Query.limit(500)]
    )

    const routeMap = new Map<string, string>()
    response.documents.forEach((doc: any) => {
      if (!routeMap.has(doc.routeCode)) {
        routeMap.set(doc.routeCode, doc.routeDescription)
      }
    })

    return Array.from(routeMap.entries()).map(([code, description]) => ({ code, description }))
  } catch (error) {
    console.error('Error fetching unique routes:', error)
    throw new Error('Failed to fetch unique routes')
  }
}

/**
 * Duplicate a rate card with new dates
 * Useful when rates change but old structure remains
 */
export async function duplicateRateCard(
  sourceRateCardId: string,
  newEffectiveFrom: string,
  newEffectiveTo?: string,
  creator?: string
): Promise<RateCardType> {
  try {
    const source = await getRateCardById(sourceRateCardId)

    const volumePrices = typeof source.volumePrices === 'string' 
      ? source.volumePrices 
      : JSON.stringify(source.volumePrices)

    const newRateCard = await databases.createDocument(
      appwriteConfig.database,
      appwriteConfig.ratecards,
      ID.unique(),
      {
        clientName: source.clientName,
        clientCode: source.clientCode,
        routeCode: source.routeCode,
        routeDescription: source.routeDescription,
        volumePrices,
        effectiveFrom: newEffectiveFrom,
        effectiveTo: newEffectiveTo || null,
        isActive: true,
        notes: source.notes || null,
        creator: creator || source.creator
      }
    )

    return {
      ...newRateCard,
      volumePrices: parseVolumePrices((newRateCard as any).volumePrices)
    } as unknown as RateCardType
  } catch (error) {
    console.error('Error duplicating rate card:', error)
    throw new Error('Failed to duplicate rate card')
  }
}

/**
 * Bulk create rate cards from a matrix (e.g., from Excel import)
 * Each entry represents one route with all volume prices
 */
export async function bulkCreateRateCards(
  clientName: string,
  clientCode: string,
  routes: Array<{
    routeCode: string
    routeDescription: string
    volumePrices: VolumePrice[]
  }>,
  effectiveFrom: string,
  creator: string,
  effectiveTo?: string
): Promise<RateCardType[]> {
  try {
    const createdCards: RateCardType[] = []

    for (const route of routes) {
      const rateCard = await createRateCard(
        {
          clientName,
          clientCode,
          routeCode: route.routeCode,
          routeDescription: route.routeDescription,
          volumePrices: route.volumePrices,
          effectiveFrom,
          effectiveTo,
          isActive: true
        },
        creator
      )
      createdCards.push(rateCard)
    }

    return createdCards
  } catch (error) {
    console.error('Error bulk creating rate cards:', error)
    throw new Error('Failed to bulk create rate cards')
  }
}

/**
 * Get rate card statistics
 */
export async function getRateCardStats(): Promise<{
  total: number
  active: number
  inactive: number
  clientCount: number
  routeCount: number
}> {
  try {
    const [allCards, clients, routes] = await Promise.all([
      getAllRateCards(),
      getUniqueClients(),
      getUniqueRoutes()
    ])

    const activeCards = allCards.filter(card => card.isActive)

    return {
      total: allCards.length,
      active: activeCards.length,
      inactive: allCards.length - activeCards.length,
      clientCount: clients.length,
      routeCount: routes.length
    }
  } catch (error) {
    console.error('Error getting rate card stats:', error)
    return {
      total: 0,
      active: 0,
      inactive: 0,
      clientCount: 0,
      routeCount: 0
    }
  }
}
