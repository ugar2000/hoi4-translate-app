'use client'

import { useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { Button } from '@/components/ui/button'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    defaultSourceLang: 'en',
    defaultTargetLang: 'es',
    autoSave: true,
    notifications: true,
    theme: 'light'
  })

  const handleSave = () => {
    // Save settings logic here
    console.log('Settings saved:', settings)
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* General Settings */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">General Settings</h2>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Source Language
                </label>
                <select
                  value={settings.defaultSourceLang}
                  onChange={(e) => setSettings({...settings, defaultSourceLang: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="en">English</option>
                  <option value="de">German</option>
                  <option value="fr">French</option>
                  <option value="es">Spanish</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Target Language
                </label>
                <select
                  value={settings.defaultTargetLang}
                  onChange={(e) => setSettings({...settings, defaultTargetLang: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="it">Italian</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Auto-save translations</h3>
                  <p className="text-sm text-gray-500">Automatically save your work as you translate</p>
                </div>
                <button
                  onClick={() => setSettings({...settings, autoSave: !settings.autoSave})}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.autoSave ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.autoSave ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Email notifications</h3>
                  <p className="text-sm text-gray-500">Receive updates about your translations</p>
                </div>
                <button
                  onClick={() => setSettings({...settings, notifications: !settings.notifications})}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.notifications ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.notifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Account Settings */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Account Settings</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                defaultValue="user@example.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled
              />
              <p className="text-xs text-gray-500 mt-1">Contact support to change your email address</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Change Password
              </label>
              <Button variant="outline" className="w-full sm:w-auto">
                Update Password
              </Button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
            Save Settings
          </Button>
        </div>
      </div>
    </AppLayout>
  )
}
