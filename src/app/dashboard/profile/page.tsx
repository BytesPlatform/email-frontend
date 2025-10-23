import { ProfileForm } from '@/components/auth/ProfileForm'
import { AuthGuard } from '@/components/auth/AuthGuard'
import Link from 'next/link'

export default function ProfilePage() {
  return (
    <AuthGuard>
      <div className="bg-gray-50 min-h-screen">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-6">
            <div>
              <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 text-sm mb-1 block">
                ← Back to Dashboard
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
                <p className="text-gray-600">Manage your account information and preferences.</p>
              </div>
            </div>
            
            <ProfileForm />
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
