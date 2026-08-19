export interface TenantDashboard {
  dealership: {
    id: number
    name: string
    slug: string
    currencyCode: string
    timezone: string
    primaryLocation: {
      id: number
      name: string
      city: string
    } | null
  }
  access: {
    inventory: boolean
    crm: boolean
    sales: boolean
  }
  metrics: {
    inventoryTotal: number | null
    inventoryAvailable: number | null
    inventoryReserved: number | null
    activeLeads: number | null
    upcomingTestDrives: number | null
    openOffers: number | null
    activeReservations: number | null
    completedSalesThisMonth: number | null
  }
  recentVehicles: Array<{
    id: number
    stockNumber: string
    make: string
    model: string
    modelYear: number
    status: string
    askingPrice: string | null
    primaryImageUrl: string | null
    updatedAt: string
  }>
  upcomingTestDrives: Array<{
    id: number
    customerName: string
    vehicleName: string
    salespersonName: string
    locationName: string
    scheduledStart: string
    scheduledEnd: string
    status: string
  }>
  recentSales: Array<{
    id: number
    saleNumber: string
    customerName: string
    vehicleName: string
    salespersonName: string
    totalAmount: string
    saleDate: string
    status: string
  }>
}
