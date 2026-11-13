import { applyTextCase, TEXT_CASE_RULES } from '@/utils/textCase'
import type { TextCaseRules } from '@/utils/textCase'

/**
 * Makes a database client store typed text the standard way (see utils/textCase)
 * no matter which screen or action does the saving.
 *
 * Saves go through a handful of SDK methods, so the rule is applied there once
 * instead of in every form: a new form or action cannot forget it.
 */

const WRITE_METHODS = ['createDocument', 'updateDocument', 'upsertDocument', 'createRow', 'updateRow', 'upsertRow'] as const

// collection id -> rules, built from the env-configured ids
const rulesByCollectionId = (): Record<string, TextCaseRules> => {
  const ids: Record<keyof typeof TEXT_CASE_RULES, string | undefined> = {
    users: process.env.NEXT_PUBLIC_USERS_COLLECTION_ID,
    roles: process.env.NEXT_PUBLIC_ROLES_COLLECTION_ID,
    pickuplocations: process.env.NEXT_PUBLIC_PICKUP_LOCATIONS_COLLECTION_ID,
    dropofflocations: process.env.NEXT_PUBLIC_DROPOFF_LOCATIONS_COLLECTION_ID,
    routes: process.env.NEXT_PUBLIC_ROUTES_COLLECTION_ID,
    vehicles: process.env.NEXT_PUBLIC_VEHICLES_COLLECTION_ID,
    expenses: process.env.NEXT_PUBLIC_EXPENSES_COLLECTION_ID,
    ratecards: process.env.NEXT_PUBLIC_RATE_CARDS_COLLECTION_ID,
    companies: process.env.NEXT_PUBLIC_COMPANIES_COLLECTION_ID || 'companies',
    trips: process.env.NEXT_PUBLIC_TRIPS_COLLECTION_ID,
    manifests: process.env.NEXT_PUBLIC_MANIFESTS_COLLECTION_ID,
    returnwaybills: process.env.NEXT_PUBLIC_RETURN_WAYBILLS_COLLECTION_ID
  }

  const map: Record<string, TextCaseRules> = {}

  for (const [name, id] of Object.entries(ids)) {
    if (id) map[id] = TEXT_CASE_RULES[name as keyof typeof TEXT_CASE_RULES]
  }

  return map
}

/**
 * Wraps the write methods of an Appwrite Databases / TablesDB client in place and
 * returns the same client. Reads are untouched.
 */
export function withTextCase<T extends object>(db: T): T {
  const rules = rulesByCollectionId()

  for (const method of WRITE_METHODS) {
    const original = (db as any)[method]

    if (typeof original !== 'function') continue

    ;(db as any)[method] = function (...args: any[]) {
      // The SDK accepts either one params object or positional arguments
      // (databaseId, collectionId | tableId, documentId | rowId, data, ...)
      if (args.length === 1 && args[0] && typeof args[0] === 'object') {
        const params = args[0]
        const collectionRules = rules[params.collectionId ?? params.tableId]

        if (collectionRules && params.data) args[0] = { ...params, data: applyTextCase(params.data, collectionRules) }
      } else if (typeof args[1] === 'string' && rules[args[1]] && args[3]) {
        args[3] = applyTextCase(args[3], rules[args[1]])
      }

      return original.apply(this, args)
    }
  }

  return db
}
