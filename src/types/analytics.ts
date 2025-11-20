export interface AnalyticsQueryParams {
  from?: string
  to?: string
  fromEmail?: string
}

export interface EmailAnalyticsOverview {
  range: {
    from: string
    to: string
  }
  totals: {
    requests: number
    delivered: number
    opened: number
    clicked: number
    bounced: number
    hardBounces: number
    softBounces: number
    spamReports: number
    unsubscribes: number
  }
  rates: {
    deliveryRate: number
    openRate: number
    clickRate: number
    bounceRate: number
    hardBounceRate: number
    softBounceRate: number
    spamReportRate: number
  }
}

export interface EmailAnalyticsTimelinePoint {
  date: string
  requests: number
  delivered: number
  opened: number
  clicked: number
  bounced: number
  spamReports: number
  unsubscribes: number
}

export type EmailAnalyticsEventType =
  | 'processed'
  | 'deferred'
  | 'delivered'
  | 'bounced'
  | 'blocked'
  | 'dropped'
  | 'spamreport'
  | 'unsubscribe'
  | 'open'
  | 'click'

export interface EmailAnalyticsEvent {
  id: string
  type: EmailAnalyticsEventType
  occurredAt: string
  email?: string | null
  contactName?: string | null
  subject?: string | null
  url?: string | null
  status?: string | null
}


