import { Route, Routes } from 'react-router-dom'

import { PageShell } from '@/components/shared/PageShell'
import { Dashboard } from '@/pages/Dashboard'
import { HearingWorkspace } from '@/pages/HearingWorkspace'
import { Landing } from '@/pages/Landing'
import { VisionWorkspace } from '@/pages/VisionWorkspace'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route element={<PageShell />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/hearing" element={<HearingWorkspace />} />
        <Route path="/vision" element={<VisionWorkspace />} />
      </Route>
      <Route path="*" element={<Landing />} />
    </Routes>
  )
}
