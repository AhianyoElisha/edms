/**
 * Company logins: accounts that belong to one of the companies whose goods are
 * carried, and may only see that company's trips and manifests.
 *
 * Two things together keep a company account inside its own data:
 *
 *  1. The database. Every collection and the file bucket are readable only by
 *     accounts carrying the `staff` label. A company account carries `company`
 *     instead, so asking the database directly for anything returns nothing.
 *  2. The portal. A company account's screens get their data from server actions
 *     (libs/actions/portal.actions) that check who is asking and only ever return
 *     rows whose companyId is that account's company.
 *
 * Hiding menu items alone would not be enough: the browser talks to the database
 * directly, so anything the account is allowed to read it can fetch.
 */

/** The role a company login holds. Which company is on the user record (`companyId`). */
export const COMPANY_ROLE = 'company'

/** Account labels the database permissions are written against. */
export const STAFF_LABEL = 'staff'
export const COMPANY_LABEL = 'company'

export const isCompanyRoleName = (roleName?: string | null) => (roleName || '').toLowerCase() === COMPANY_ROLE

/** True for a signed-in user who is a company login rather than a member of staff. */
export const isCompanyUser = (user: any) => !!user && (!!user.companyId || isCompanyRoleName(user.role?.name))

export const PORTAL_HOME = '/portal/trips'
