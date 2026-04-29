import { useEffect } from 'react'

const APP_NAME = 'Wilson Works Purchase Management'

export function usePageTitle(page: string) {
  useEffect(() => {
    document.title = `${page} | ${APP_NAME}`
    return () => {
      document.title = APP_NAME
    }
  }, [page])
}
