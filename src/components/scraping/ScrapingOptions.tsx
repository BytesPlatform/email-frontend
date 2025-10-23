'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useData } from '@/contexts/DataContext'

// Use the ScrapedRecord type from DataContext
interface ScrapedRecord {
  business_name?: string
  zipcode?: string
  state?: string
  phone_number?: string
  website?: string
  email?: string
  source: string
  scraped_at: string
  original_record_index?: number
  target_url?: string
  extraction_method?: string
  confidence?: string
  scraped_website?: string
  scraped_contacts?: Array<{ type: string; value: string }>
  scraped_social_media?: Array<{ platform: string; url: string }>
  [key: string]: string | number | Array<{ type: string; value: string }> | Array<{ platform: string; url: string }> | undefined
}

const scrapingIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
  </svg>
)

const urlIcon = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
)

const playIcon = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6-8h8a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2v-8a2 2 0 012-2z" />
  </svg>
)

export function ScrapingOptions() {
  const { addScrapedData } = useData()
  const [url, setUrl] = useState('')
  const [scrapingType, setScrapingType] = useState('emails')
  const [isRunning, setIsRunning] = useState(false)
  const [maxPages, setMaxPages] = useState(10)
  const [delay, setDelay] = useState(2)
  const [respectRobots, setRespectRobots] = useState(true)

  const isGeneralEmailDomain = (domain: string) => {
    const generalDomains = [
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
      'icloud.com', 'protonmail.com', 'yandex.com', 'mail.com', 'zoho.com',
      'live.com', 'msn.com', 'comcast.net', 'verizon.net', 'att.net'
    ]
    return generalDomains.includes(domain.toLowerCase())
  }

  const extractUrlFromInput = (inputUrl: string) => {
    // If it's already a full URL, use it directly
    if (inputUrl.startsWith('http://') || inputUrl.startsWith('https://')) {
      return {
        url: inputUrl,
        method: 'direct_website',
        confidence: 'high'
      }
    }
    
    // If it's an email, extract domain
    if (inputUrl.includes('@')) {
      const domain = inputUrl.split('@')[1]
      
      if (isGeneralEmailDomain(domain)) {
        return {
          url: `https://www.google.com/search?q=${encodeURIComponent(inputUrl.split('@')[0])}`,
          method: 'google_search',
          confidence: 'low'
        }
      } else {
        return {
          url: `https://www.${domain}`,
          method: 'email_domain',
          confidence: 'medium'
        }
      }
    }
    
    // If it's a domain without protocol, add https
    if (inputUrl.includes('.')) {
      return {
        url: `https://${inputUrl}`,
        method: 'direct_website',
        confidence: 'high'
      }
    }
    
    // Otherwise, treat as business name for Google search
    return {
      url: `https://www.google.com/search?q=${encodeURIComponent(inputUrl)}`,
      method: 'google_search',
      confidence: 'low'
    }
  }

  const handleStartScraping = async () => {
    if (!url.trim()) {
      alert('Please enter a URL, email, or business name to scrape')
      return
    }

    const urlInfo = extractUrlFromInput(url.trim())
    await scrapeUrl(urlInfo)
  }

  const scrapeUrl = async (urlInfo: { url: string; method: string; confidence: string }) => {
    setIsRunning(true)
    
    // Simulate scraping process
    setTimeout(() => {
      const mockScrapedData: ScrapedRecord[] = [
        {
          business_name: `Scraped Business ${Math.floor(Math.random() * 100)}`,
          state: 'California',
          zipcode: '90210',
          phone_number: `(555) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
          website: urlInfo.url,
          source: 'scraped',
          scraped_at: new Date().toISOString(),
          extraction_method: urlInfo.method,
          confidence: urlInfo.confidence,
          // Simulated scraped data
          scraped_contacts: [
            { type: 'email', value: 'contact@example.com' },
            { type: 'phone', value: `(555) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}` }
          ],
          scraped_social_media: [
            { platform: 'LinkedIn', url: 'https://linkedin.com/company/example' },
            { platform: 'Facebook', url: 'https://facebook.com/example' }
          ]
        }
      ]
      
      addScrapedData(mockScrapedData)
      setIsRunning(false)
      alert(`Scraping completed! Found ${mockScrapedData.length} new records using ${urlInfo.method} method (${urlInfo.confidence} confidence).`)
    }, 3000)
  }

  const scrapingTypes = [
    { value: 'emails', label: 'Email Addresses', icon: '📧' },
    { value: 'phones', label: 'Phone Numbers', icon: '📞' },
    { value: 'contacts', label: 'Full Contact Info', icon: '👤' },
    { value: 'social', label: 'Social Media Links', icon: '🔗' },
  ]

  return (
    <Card variant="elevated">
      <CardHeader
        title="Configure Scraping"
        subtitle="Set up web scraping parameters to collect contact information."
        icon={scrapingIcon}
      >
        <div></div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Target Input */}
          <Input
            label="Target URL, Email, or Business Name"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com, contact@business.com, or Business Name"
            helperText="Enter a website URL, email address, or business name to scrape"
            leftIcon={urlIcon}
            size="lg"
          />

          {/* URL Preview */}
          {url.trim() && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">URL Extraction Preview</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <div><strong>Input:</strong> {url}</div>
                <div><strong>Extracted URL:</strong> {extractUrlFromInput(url).url}</div>
                <div><strong>Method:</strong> {extractUrlFromInput(url).method}</div>
                <div><strong>Confidence:</strong> {extractUrlFromInput(url).confidence}</div>
              </div>
            </div>
          )}

          {/* Scraping Type */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Scraping Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              {scrapingTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setScrapingType(type.value)}
                  className={`p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                    scrapingType === type.value
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{type.icon}</span>
                    <span className="text-sm font-medium">{type.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Max Pages"
              type="number"
              value={maxPages}
              onChange={(e) => setMaxPages(Number(e.target.value))}
              min="1"
              max="100"
              size="md"
            />
            <Input
              label="Delay (seconds)"
              type="number"
              value={delay}
              onChange={(e) => setDelay(Number(e.target.value))}
              min="1"
              max="10"
              size="md"
            />
          </div>

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="respect-robots"
                checked={respectRobots}
                onChange={(e) => setRespectRobots(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
              />
              <label htmlFor="respect-robots" className="text-sm font-medium text-slate-700">
                Respect robots.txt
              </label>
            </div>
          </div>

          {/* Start Button */}
          <div className="space-y-3">
            <Button
              onClick={handleStartScraping}
              disabled={!url.trim()}
              isLoading={isRunning}
              leftIcon={!isRunning ? playIcon : undefined}
              className="w-full"
              size="lg"
              variant="primary"
            >
              {isRunning ? 'Scraping...' : 'Start Scraping'}
            </Button>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-semibold text-blue-900">Permission Required</span>
              </div>
              <p className="text-xs text-blue-700">
                Ensure you have permission to scrape the target website.
              </p>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-semibold text-green-900">Rate Limited</span>
              </div>
              <p className="text-xs text-green-700">
                Built-in delays to be respectful to servers.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
