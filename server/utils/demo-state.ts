import { demoArtworks, demoExhibitions, demoProfiles } from '~/shared/demo-data'
import type { Artwork, Exhibition, Profile } from '~/shared/types'

interface DemoState {
  profiles: Profile[]
  artworks: Artwork[]
  exhibitions: Exhibition[]
}

function cloneState(): DemoState {
  return {
    profiles: structuredClone(demoProfiles),
    artworks: structuredClone(demoArtworks),
    exhibitions: structuredClone(demoExhibitions)
  }
}

export const useDemoState = (): DemoState => {
  const globalKey = '__AI_ARTSTYLE_LAB_DEMO_STATE__'
  const state = globalThis as typeof globalThis & { [globalKey]?: DemoState }

  if (!state[globalKey]) {
    state[globalKey] = cloneState()
  }

  return state[globalKey]!
}
