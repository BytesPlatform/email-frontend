'use client'

import { createContext, useContext, ReactNode, useState } from 'react'

interface CSVRecord {
  business_name?: string
  zipcode?: string
  state?: string
  phone_number?: string
  website?: string
  email?: string
  [key: string]: string | undefined
}

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

interface DataContextType {
  csvData: CSVRecord[]
  setCsvData: (data: CSVRecord[]) => void
  scrapedData: ScrapedRecord[]
  setScrapedData: (data: ScrapedRecord[]) => void
  combinedData: (CSVRecord | ScrapedRecord)[]
  addScrapedData: (data: ScrapedRecord[]) => void
  clearAllData: () => void
}

const DataContext = createContext<DataContextType | undefined>(undefined)

interface DataProviderProps {
  children: ReactNode
}

export function DataProvider({ children }: DataProviderProps) {
  const [csvData, setCsvData] = useState<CSVRecord[]>([])
  const [scrapedData, setScrapedData] = useState<ScrapedRecord[]>([])

  const combinedData = [...csvData, ...scrapedData]

  const addScrapedData = (data: ScrapedRecord[]) => {
    setScrapedData(prev => [...prev, ...data])
  }

  const clearAllData = () => {
    setCsvData([])
    setScrapedData([])
  }

  return (
    <DataContext.Provider value={{
      csvData,
      setCsvData,
      scrapedData,
      setScrapedData,
      combinedData,
      addScrapedData,
      clearAllData
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}
