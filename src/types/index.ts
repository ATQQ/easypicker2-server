export interface GlobalSiteConfig {
  maxInputLength: number
  openPraise: boolean
  formLength: number
  downloadOneExpired: number
  downloadCompressExpired: number
  compressSizeLimit: number
  needBindPhone: boolean
  limitSpace: boolean
  qiniuOSSPrice: number
  qiniuCDNPrice: number
  qiniuBackhaulTrafficPrice: number
  qiniuBackhaulTrafficPercentage: number
  qiniuCompressPrice: number
  moneyStartDay: number
}

export interface DownloadLogAnalyzeItem {
  size: number
  count: number
}
