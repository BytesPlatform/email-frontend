import { DashboardOverview } from '@/components/dashboard/DashboardOverview'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { AuthGuard } from '@/components/auth/AuthGuard'

export default function DashboardPage() {
  return (
    <AuthGuard>
      <div className="bg-gray-50 min-h-screen">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            {/* Header Section */}
            <div className="text-center lg:text-left">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
              <p className="text-lg text-gray-600">Welcome back! Manage your data ingestion and scraping operations.</p>
            </div>
            
            {/* Stats Overview */}
            <DashboardOverview />
            
            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <QuickActions />
              <RecentActivity />
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
