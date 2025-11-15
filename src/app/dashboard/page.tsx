'use client'

import { DashboardOverview } from '@/components/dashboard/DashboardOverview'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { EmailAccountsCard } from '@/components/dashboard/EmailAccountsCard'
import { PhoneAccountsCard } from '@/components/dashboard/PhoneAccountsCard'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { useAuthContext } from '@/contexts/AuthContext'

export default function DashboardPage() {
  const { client } = useAuthContext()
  
  return (
    <AuthGuard>
      <div className="bg-gray-50 min-h-screen">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-lg">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl font-bold border-2 border-white/30">
                  {client?.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-1">Welcome, {client?.name || 'User'}!</h1>
                  <p className="text-indigo-100 text-lg">Manage your data ingestion and scraping operations.</p>
                </div>
              </div>
            </div>
            
            {/* Stats Overview */}
            <DashboardOverview />
            
            {/* Email and Phone Accounts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <EmailAccountsCard />
              <PhoneAccountsCard />
            </div>
            
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
